"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { api, type Task } from "@/lib/api";
import { ensurePushSubscription, getPushPlatform } from "@/lib/push";
import { useI18n } from "@/lib/i18n";

type View = "picker" | "ios" | "denied" | "unsupported" | "busy";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [custom, setCustom] = useState("");
  // When embedded in the task options modal, the parent owns close-on-outside
  // and Escape handling, so the picker skips its own popover listeners.
  const menuClass = "tm-reminder-menu" + (embedded ? " tm-reminder-embedded" : "");

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

  function preset(kind: "hour" | "evening" | "tomorrow"): Date {
    const d = new Date();
    if (kind === "hour") { d.setHours(d.getHours() + 1); return d; }
    if (kind === "evening") {
      d.setHours(18, 0, 0, 0);
      if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
      return d;
    }
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
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
          {t.reminderSetFor} {new Date(task.remind_at).toLocaleString()}
        </div>
      )}

      <button className="tm-reminder-opt" disabled={view === "busy"} onClick={() => apply(preset("hour"))}>
        {t.reminderIn1Hour}
      </button>
      <button className="tm-reminder-opt" disabled={view === "busy"} onClick={() => apply(preset("evening"))}>
        {t.reminderThisEvening}
      </button>
      <button className="tm-reminder-opt" disabled={view === "busy"} onClick={() => apply(preset("tomorrow"))}>
        {t.reminderTomorrow9}
      </button>

      <div className="tm-reminder-custom">
        <input
          type="datetime-local"
          className="tm-reminder-input"
          min={toLocalInputValue(new Date())}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <button
          className="tm-reminder-btn"
          disabled={!custom || view === "busy"}
          onClick={() => apply(new Date(custom))}
        >
          {view === "busy" ? t.reminderBusy : t.reminderSet}
        </button>
      </div>

      {task.remind_at && (
        <button className="tm-reminder-remove" disabled={view === "busy"} onClick={() => apply(null)}>
          {t.reminderRemove}
        </button>
      )}
    </div>
  );
}
