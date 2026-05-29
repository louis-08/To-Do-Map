"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const OPTIONS = ["light", "dark", "system"] as const;

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          onClick={() => setTheme(opt)}
          className={`px-3 py-1.5 rounded text-sm capitalize border transition-colors ${
            theme === opt
              ? "bg-[var(--accent)] text-white border-[var(--accent)]"
              : "border-[var(--border)] hover:bg-[var(--bg-subtle)]"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
