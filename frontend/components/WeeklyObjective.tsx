"use client";

import { useState, useRef, useEffect } from "react";

function monthSpanLabel(monday: Date, sunday: Date): string {
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const a = MONTHS[monday.getMonth()];
  const b = MONTHS[sunday.getMonth()];
  if (a === b) return a.slice(0, 3) + " " + monday.getFullYear();
  return a.slice(0, 3) + "–" + b.slice(0, 3) + " " + sunday.getFullYear();
}

export default function WeeklyObjective({
  weekNum,
  monday,
  sunday,
  value,
  isCurrent,
  onSave,
}: {
  weekNum: number;
  monday: Date;
  sunday: Date;
  value: string;
  isCurrent: boolean;
  onSave: (text: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setVal(value); }, [value]);
  useEffect(() => {
    if (editing && ref.current) { ref.current.focus(); ref.current.select(); }
  }, [editing]);

  function save() {
    onSave(val.trim());
    setEditing(false);
  }

  const cls = ["tm-cell", "tm-obj", isCurrent ? "is-current" : ""].filter(Boolean).join(" ");

  return (
    <div className={cls}>
      <div className="tm-obj-head">
        <span className="tm-weeknum">W{weekNum}</span>
        <span className="tm-monthspan">{monthSpanLabel(monday, sunday)}</span>
      </div>
      {editing ? (
        <textarea
          ref={ref}
          className="tm-obj-input"
          value={val}
          placeholder="Set a weekly objective…"
          onChange={(e) => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); }
            else if (e.key === "Escape") { setVal(value); setEditing(false); }
          }}
        />
      ) : value ? (
        <button className="tm-obj-text" onClick={() => setEditing(true)}>
          {value}
        </button>
      ) : (
        <button className="tm-add" onClick={() => setEditing(true)} aria-label="Set weekly objective">
          <span className="tm-add-plus">+</span>
        </button>
      )}
    </div>
  );
}
