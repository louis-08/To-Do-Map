"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n";

type View = "board" | "year" | "settings" | "profile";

function IconUser() {
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true">
      <circle cx="10" cy="6.4" r="3.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.6 16.6c0-3.2 2.9-5 6.4-5s6.4 1.8 6.4 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function TopBar({
  visibleYear,
  view,
  onTodayClick,
  onViewChange,
}: {
  visibleYear: number;
  view: View;
  onTodayClick: () => void;
  onViewChange: (v: View) => void;
}) {
  const { t } = useI18n();
  return (
    <header className="tm-topbar">
      <div className="tm-brand">
        <Image src="/icon.png" alt="To Do Map" width={28} height={28} className="tm-logo-img" />
        <span className="tm-brand-name">To Do Map</span>
        <span className="tm-year-pill">{visibleYear}</span>
      </div>

      <div className="tm-tabs" role="tablist">
        <button
          className={"tm-tab" + (view === "board" ? " active" : "")}
          onClick={() => onViewChange("board")}
          role="tab"
          aria-selected={view === "board"}
        >
          {t.week}
        </button>
        <button
          className={"tm-tab" + (view === "year" ? " active" : "")}
          onClick={() => onViewChange("year")}
          role="tab"
          aria-selected={view === "year"}
        >
          {t.year}
        </button>
      </div>

      <div className="tm-navbtns">
        <button
          className={"tm-iconbtn tm-iconbtn-square" + (view === "settings" ? " active" : "")}
          onClick={() => onViewChange(view === "settings" ? "board" : "settings")}
          title={t.settingsTitle}
        >
          <IconGear />
        </button>
      </div>
    </header>
  );
}
