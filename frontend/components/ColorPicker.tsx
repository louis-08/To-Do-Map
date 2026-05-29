"use client";

import { useEffect } from "react";

export const TASK_COLORS = [
  { key: "grey",   bg: "#ededf0",   dot: "#9a9aa2" },
  { key: "red",    bg: "#fde7e4",   dot: "#e5604d" },
  { key: "amber",  bg: "#fdefce",   dot: "#e0a008" },
  { key: "green",  bg: "#e2f4e9",   dot: "#1f9d5b" },
  { key: "blue",   bg: "#e3edfb",   dot: "#3a78d6" },
  { key: "purple", bg: "#ece6fa",   dot: "#7d5bd6" },
];

export default function ColorPicker({
  current,
  onSelect,
  onClose,
}: {
  current: string | null;
  onSelect: (color: string | null) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest?.(".tm-color-menu")) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  return (
    <div className="tm-color-menu" onMouseDown={(e) => e.stopPropagation()}>
      {TASK_COLORS.map((c) => {
        const sel = (current ?? "") === c.key;
        return (
          <button
            key={c.key}
            className={"tm-color-sw" + (sel ? " is-sel" : "")}
            style={{ background: c.bg, borderColor: c.dot }}
            title={c.key}
            onClick={() => { onSelect(c.key); onClose(); }}
          />
        );
      })}
    </div>
  );
}
