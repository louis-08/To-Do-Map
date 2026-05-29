"use client";

import { useState } from "react";
import { useClerk, useUser, useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";

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
}: {
  onBack: () => void;
  onExport: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { signOut } = useClerk();
  const { user } = useUser();
  const { getToken } = useAuth();
  const a = api(getToken as () => Promise<string | null>);

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
        <button className="tab-back" onClick={onBack}><IconBack /> Board</button>
        <h1 className="tab-title">Settings</h1>
        <span className="tab-spacer" />
      </div>
      <div className="tab-body">

        <section className="tab-card">
          <div className="tab-card-title">Export</div>
          <div className="set-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="set-row-text">
              <div className="set-row-label">Download Markdown backup</div>
              <div className="set-row-sub">All your tasks exported as a .md file</div>
            </div>
            <button className="btn-ghost" onClick={onExport}>Export</button>
          </div>
        </section>

        <section className="tab-card">
          <div className="tab-card-title">Account</div>
          <div className="set-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="set-row-text">
              <div className="set-row-label">Sign out</div>
              <div className="set-row-sub">Sign out of your account on this device</div>
            </div>
            <button className="btn-ghost" onClick={() => signOut({ redirectUrl: "/sign-in" })}>
              Sign out
            </button>
          </div>
          <div className="set-row">
            <div className="set-row-text">
              <div className="set-row-label">Delete account</div>
              <div className="set-row-sub">Permanently delete your account and all data. This cannot be undone.</div>
            </div>
            {!confirmDelete ? (
              <button className="btn-ghost danger" onClick={() => setConfirmDelete(true)}>Delete</button>
            ) : (
              <div className="confirm">
                <button className="btn-ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button>
                <button className="btn-danger" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="tab-card about">
          <div className="set-row-label">To Do Map</div>
          <div className="set-row-sub" style={{ marginTop: 4 }}>Plan your year, one week at a time.</div>
        </section>

      </div>
    </div>
  );
}
