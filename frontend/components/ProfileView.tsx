"use client";

import { useState } from "react";
import { useClerk, useUser, useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { signOut } = useClerk();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { t } = useI18n();
  const a = api(getToken as () => Promise<string | null>);

  const name = user?.fullName ?? user?.firstName ?? t.youFallback;
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await a.account.delete();
      await user?.delete();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="tab-screen">
      <div className="tab-head">
        <button className="tab-back" onClick={onBack}><IconBack /> {t.board}</button>
        <h1 className="tab-title">{t.profileTitle}</h1>
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
          <div className="stat"><div className="stat-num">{stats.done}</div><div className="stat-lbl">{t.tasksDone}</div></div>
          <div className="stat"><div className="stat-num">{stats.open}</div><div className="stat-lbl">{t.openTasks}</div></div>
          <div className="stat"><div className="stat-num">{stats.objectives}</div><div className="stat-lbl">{t.objectivesSet}</div></div>
        </div>

        <section className="tab-card">
          <div className="tab-card-title">{t.account}</div>
          <div className="set-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="set-row-text">
              <div className="set-row-label">{t.signOut}</div>
              <div className="set-row-sub">{t.signOutSub}</div>
            </div>
            <button className="btn-ghost" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
              {t.signOut}
            </button>
          </div>
          <div className="set-row">
            <div className="set-row-text">
              <div className="set-row-label">{t.deleteAccount}</div>
              <div className="set-row-sub">{t.deleteAccountSub}</div>
            </div>
            {!confirmDelete ? (
              <button className="btn-ghost danger" onClick={() => setConfirmDelete(true)}>{t.delete}</button>
            ) : (
              <div className="confirm">
                <button className="btn-ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>{t.cancel}</button>
                <button className="btn-danger" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? t.deleting : t.confirmDelete}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
