"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export default function TaskInput({ onAdd }: { onAdd: (text: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function commit() {
    const t = val.trim();
    if (t) onAdd(t);
    setVal("");
    setOpen(false);
  }

  function handleBlur() {
    setVal("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button className="tm-add" onClick={() => setOpen(true)} aria-label={t.addTask}>
        <span className="tm-add-plus">+</span>
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
      <input
        ref={inputRef}
        className="tm-add-input"
        style={{ marginTop: 0, flex: 1 }}
        value={val}
        placeholder={t.newTaskPlaceholder}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { commit(); }
          else if (e.key === "Escape") { setVal(""); setOpen(false); }
        }}
        onBlur={handleBlur}
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={commit}
        style={{
          flexShrink: 0,
          width: 28, height: 28,
          borderRadius: 7,
          border: "none",
          background: "var(--ink)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          alignSelf: "center",
        }}
        aria-label={t.saveTask}
      >
        <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8.5L6.5 12L13 5" />
        </svg>
      </button>
    </div>
  );
}
