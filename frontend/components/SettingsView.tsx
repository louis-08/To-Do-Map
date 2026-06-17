"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import McpServerInfo from "./McpServerInfo";

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
  const { getToken } = useAuth();
  const { t, lang, setLang } = useI18n();
  const a = api(getToken as () => Promise<string | null>);
  const [autoRollover, setAutoRollover] = useState(false);

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
          <div className="tab-card-title">{t.aiIntegration}</div>
          <McpServerInfo />
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
