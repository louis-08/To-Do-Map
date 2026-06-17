"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { api, type Task } from "@/lib/api";
import { ensurePushSubscription, getPushPlatform } from "@/lib/push";
import { useI18n } from "@/lib/i18n";

type View = "picker" | "ios" | "denied" | "unsupported" | "busy";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseISODateParts(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function buildReminderDate(isoDate: string, hour: number, minute: number): Date {
  const { year, month, day } = parseISODateParts(isoDate);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

function formatReminderTime(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function isValidHour(value: string): boolean {
  return /^\d{1,2}$/.test(value) && Number(value) >= 0 && Number(value) <= 23;
}

function isValidMinute(value: string): boolean {
  return /^\d{1,2}$/.test(value) && Number(value) >= 0 && Number(value) <= 59;
}

function TimeWheel({
  values,
  value,
  onChange,
}: {
  values: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const itemHeight = 36;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = values.indexOf(value);
    if (idx === -1) return;
    el.scrollTo({ top: idx * itemHeight, behavior: "smooth" });
  }, [value, values]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timeout = 0;

    const sync = () => {
      const idx = Math.round(el.scrollTop / itemHeight);
      const next = values[Math.max(0, Math.min(values.length - 1, idx))];
      if (next !== value) onChange(next);
    };

    const onScroll = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(sync, 80);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.clearTimeout(timeout);
    };
  }, [onChange, value, values]);

  return (
    <div className="tm-reminder-wheel-wrap">
      <div ref={ref} className="tm-reminder-wheel" aria-label="Time selector">
        {values.map((option) => (
          <button
            key={option}
            type="button"
            className={"tm-reminder-wheel-item" + (option === value ? " is-active" : "")}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReminderPicker({
  task,
  onClose,
  embedded = false,
}: {
  task: Task;
  onClose: () => void;
  embedded?: boolean;
}) {
  const { t } = useI18n();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const platform = useMemo(() => getPushPlatform(), []);
  const [view, setView] = useState<View>(platform.needsInstall ? "ios" : "picker");
  const [isMobile, setIsMobile] = useState(false);
  const reminderDate = task.remind_at ? new Date(task.remind_at) : null;
  const [hour, setHour] = useState(reminderDate ? pad(reminderDate.getHours()) : "09");
  const [minute, setMinute] = useState(reminderDate ? pad(reminderDate.getMinutes()) : "00");
  // When embedded in the task options modal, the parent owns close-on-outside
  // and Escape handling, so the picker skips its own popover listeners.
  const menuClass = "tm-reminder-menu" + (embedded ? " tm-reminder-embedded" : "");
  const selectedDate = useMemo(() => {
    if (!isValidHour(hour) || !isValidMinute(minute)) return null;
    return buildReminderDate(task.date, Number(hour), Number(minute));
  }, [hour, minute, task.date]);
  const isPastSelection = !!selectedDate && selectedDate.getTime() <= Date.now();
  const canSubmit = !!selectedDate && !isPastSelection && view !== "busy";
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => pad(i)), []);
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => pad(i)), []);

  useEffect(() => {
    if (embedded) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.(".tm-reminder-menu")) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose, embedded]);

  useEffect(() => {
    const syncMobile = () => {
      setIsMobile(window.matchMedia?.("(pointer: coarse)").matches ?? false);
    };
    syncMobile();
    window.addEventListener("resize", syncMobile);
    return () => window.removeEventListener("resize", syncMobile);
  }, []);

  async function apply(when: Date | null) {
    const getTok = getToken as () => Promise<string | null>;
    // Clearing never needs notification permission.
    if (when === null) {
      await api(getTok).tasks.setReminder(task.id, null);
      qc.invalidateQueries({ queryKey: ["tasks"] });
      onClose();
      return;
    }
    setView("busy");
    const result = await ensurePushSubscription(getTok);
    if (result === "needs-install") return setView("ios");
    if (result === "denied") return setView("denied");
    if (result === "unsupported") return setView("unsupported");
    await api(getTok).tasks.setReminder(task.id, when.toISOString());
    qc.invalidateQueries({ queryKey: ["tasks"] });
    onClose();
  }

  if (view === "ios") {
    return (
      <div className={menuClass + " tm-reminder-note"} onMouseDown={(e) => e.stopPropagation()}>
        <div className="tm-reminder-note-title">{t.iosReminderTitle}</div>
        <div className="tm-reminder-note-text">{t.iosReminderIntro}</div>
        <ol className="tm-reminder-steps">
          <li>{t.iosReminderStep1}</li>
          <li>{t.iosReminderStep2}</li>
          <li>{t.iosReminderStep3}</li>
        </ol>
        <button className="tm-reminder-btn" onClick={onClose}>{t.reminderGotIt}</button>
      </div>
    );
  }

  if (view === "denied" || view === "unsupported") {
    return (
      <div className={menuClass + " tm-reminder-note"} onMouseDown={(e) => e.stopPropagation()}>
        <div className="tm-reminder-note-text">
          {view === "denied" ? t.reminderDenied : t.reminderUnsupported}
        </div>
        <button className="tm-reminder-btn" onClick={onClose}>{t.reminderGotIt}</button>
      </div>
    );
  }

  return (
    <div className={menuClass} onMouseDown={(e) => e.stopPropagation()}>
      {task.remind_at && (
        <div className="tm-reminder-current">
          {t.reminderSetFor} {formatReminderTime(task.remind_at)}
        </div>
      )}

      {isMobile ? (
        <div className="tm-reminder-wheel-picker">
          <TimeWheel values={hourOptions} value={hour} onChange={setHour} />
          <div className="tm-reminder-colon">:</div>
          <TimeWheel values={minuteOptions} value={minute} onChange={setMinute} />
        </div>
      ) : (
        <div className="tm-reminder-custom">
          <input
            type="text"
            inputMode="numeric"
            className="tm-reminder-time-input"
            value={hour}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 2);
              setHour(next);
            }}
            placeholder="HH"
            aria-label="Hour"
          />
          <span className="tm-reminder-colon">:</span>
          <input
            type="text"
            inputMode="numeric"
            className="tm-reminder-time-input"
            value={minute}
            onChange={(e) => {
              const next = e.target.value.replace(/\D/g, "").slice(0, 2);
              setMinute(next);
            }}
            placeholder="MM"
            aria-label="Minute"
          />
        </div>
      )}

      <button
        type="button"
        className="tm-reminder-btn"
        disabled={!canSubmit}
        onClick={() => selectedDate && apply(selectedDate)}
      >
        {view === "busy" ? t.reminderBusy : t.reminderSet}
      </button>

      {task.remind_at && (
        <button type="button" className="tm-reminder-remove" disabled={view === "busy"} onClick={() => apply(null)}>
          {t.reminderRemove}
        </button>
      )}
    </div>
  );
}
