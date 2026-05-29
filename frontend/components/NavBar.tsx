"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { addMonths, monthLabel, currentYearMonth } from "@/lib/dates";

const MONTHS_BEFORE = 3;
const MONTHS_AFTER = 24;

export default function NavBar({ current }: { current: string }) {
  const router = useRouter();
  const now = currentYearMonth();

  const months: string[] = [];
  for (let i = -MONTHS_BEFORE; i <= MONTHS_AFTER; i++) {
    months.push(addMonths(now, i));
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[var(--border)] bg-[var(--bg)] px-4 py-2">
      <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => router.push(`/calendar/${addMonths(current, -1)}`)}
          className="flex-shrink-0 p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)]"
        >
          ←
        </button>

        {months.map((m) => (
          <Link
            key={m}
            href={`/calendar/${m}`}
            className={`flex-shrink-0 px-3 py-1 rounded text-sm whitespace-nowrap transition-colors ${
              m === current
                ? "bg-[var(--accent)] text-white"
                : "hover:bg-[var(--bg-subtle)] text-[var(--text-muted)]"
            }`}
          >
            {monthLabel(m)}
          </Link>
        ))}

        <button
          onClick={() => router.push(`/calendar/${addMonths(current, 1)}`)}
          className="flex-shrink-0 p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)]"
        >
          →
        </button>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/trash"
          className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text)]"
          title="Trash"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Link>

        <Link
          href="/settings"
          className="p-1.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text)]"
          title="Settings"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>

        <UserButton />
      </div>
    </header>
  );
}
