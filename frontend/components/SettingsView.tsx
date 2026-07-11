"use client";

import { useEffect, useState } from "react";
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

export default function SettingsView({
  onBack,
  onExport,
  stats,
}: {
  onBack: () => void;
  onExport: () => void;
  stats?: { done: number; open: number; objectives: number };
}) {
  const { getToken } = useAuth();
  const { t, lang, setLang } = useI18n();
  const a = api(getToken as () => Promise<string | null>);
  const [autoRollover, setAutoRollover] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const name = user?.fullName ?? user?.firstName ?? t.youFallback;
  const email = user?.emailAddresses[0]?.emailAddress ?? "";
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  useEffect(() => {
    a.settings.get().then((s) => setAutoRollover(s.data.auto_rollover)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleAutoRollover() {
    const next = !autoRollover;
    setAutoRollover(next);
    a.settings.update({ auto_rollover: next }).catch(() => setAutoRollover(!next));
  }

  return (
    <div className="tab-screen">
      <div className="tab-head">
        <button className="tab-back" onClick={onBack}><IconBack /> {t.board}</button>
        <h1 className="tab-title">{t.settingsTitle}</h1>
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

        {stats && (
          <div className="stat-row">
            <div className="stat"><div className="stat-num">{stats.done}</div><div className="stat-lbl">{t.tasksDone}</div></div>
            <div className="stat"><div className="stat-num">{stats.open}</div><div className="stat-lbl">{t.openTasks}</div></div>
            <div className="stat"><div className="stat-num">{stats.objectives}</div><div className="stat-lbl">{t.objectivesSet}</div></div>
          </div>
        )}

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

        <section className="tab-card">
          <div className="tab-card-title">{t.language}</div>
          <div className="set-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="set-row-text">
              <div className="set-row-label">{t.language}</div>
              <div className="set-row-sub">{t.languageSub}</div>
            </div>
            <div className="tm-tabs" role="tablist">
              <button
                className={"tm-tab" + (lang === "en" ? " active" : "")}
                onClick={() => setLang("en")}
                role="tab"
                aria-selected={lang === "en"}
              >
                English
              </button>
              <button
                className={"tm-tab" + (lang === "de" ? " active" : "")}
                onClick={() => setLang("de")}
                role="tab"
                aria-selected={lang === "de"}
              >
                Deutsch
              </button>
            </div>
          </div>
        </section>

        <section className="tab-card">
          <div className="tab-card-title">{t.exportTitle}</div>
          <div className="set-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="set-row-text">
              <div className="set-row-label">{t.exportLabel}</div>
              <div className="set-row-sub">{t.exportSub}</div>
            </div>
            <button className="btn-ghost" onClick={onExport}>{t.exportBtn}</button>
          </div>
        </section>

        <section className="tab-card">
          <div className="tab-card-title">{t.autoRollover}</div>
          <div className="set-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="set-row-text">
              <div className="set-row-label">{t.autoRolloverLabel}</div>
              <div className="set-row-sub">
                {t.autoRolloverSub}
              </div>
            </div>
            <button
              className={"switch" + (autoRollover ? " on" : "")}
              role="switch"
              aria-checked={autoRollover}
              aria-label={t.autoRollover}
              onClick={toggleAutoRollover}
            >
              <span className="knob" />
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
