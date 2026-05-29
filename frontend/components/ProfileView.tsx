"use client";

import { useUser } from "@clerk/nextjs";

function IconBack() {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true">
      <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProfileView({
  stats,
  onBack,
}: {
  stats: { done: number; open: number; objectives: number };
  onBack: () => void;
}) {
  const { user } = useUser();
  const name = user?.fullName ?? user?.firstName ?? "You";
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="tab-screen">
      <div className="tab-head">
        <button className="tab-back" onClick={onBack}><IconBack /> Board</button>
        <h1 className="tab-title">Profile</h1>
        <span className="tab-spacer" />
      </div>
      <div className="tab-body">
        <section className="tab-card profile-hero">
          <div className="avatar">{initials}</div>
          <div>
            <div className="profile-name">{name}</div>
            <div className="profile-email">{email}</div>
          </div>
        </section>

        <div className="stat-row">
          <div className="stat"><div className="stat-num">{stats.done}</div><div className="stat-lbl">Tasks done</div></div>
          <div className="stat"><div className="stat-num">{stats.open}</div><div className="stat-lbl">Open tasks</div></div>
          <div className="stat"><div className="stat-num">{stats.objectives}</div><div className="stat-lbl">Objectives set</div></div>
        </div>
      </div>
    </div>
  );
}
