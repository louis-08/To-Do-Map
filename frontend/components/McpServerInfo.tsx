"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

type Status = "checking" | "online" | "offline";

export default function McpServerInfo() {
  const { t } = useI18n();
  const [status, setStatus] = useState<Status>("checking");
  const [mcpUrl, setMcpUrl] = useState(`${BASE}/mcp/`);
  const [copied, setCopied] = useState(false);
  const [openClient, setOpenClient] = useState<"claude" | "chatgpt" | "gemini" | null>("claude");

  useEffect(() => {
    let active = true;
    // The OAuth resource-metadata endpoint is public and only exists when the
    // MCP server is mounted, so a 200 means the server is up and ready.
    fetch(`${BASE}/.well-known/oauth-protected-resource`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        if (typeof data?.resource === "string") setMcpUrl(data.resource);
        setStatus("online");
      })
      .catch(() => {
        if (active) setStatus("offline");
      });
    return () => {
      active = false;
    };
  }, []);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — user can select the text manually */
    }
  }

  const dot =
    status === "online"
      ? "var(--check)"
      : status === "offline"
        ? "#c0392b"
        : "var(--muted)";
  const label =
    status === "online"
      ? t.serverOnline
      : status === "offline"
        ? t.serverOffline
        : t.serverChecking;
  const clients: Array<{
    key: "claude" | "chatgpt" | "gemini";
    title: string;
    steps: string[];
  }> = [
    {
      key: "claude",
      title: t.mcpClaudeTitle,
      steps: [t.mcpClaudeStep1, t.mcpClaudeStep2, t.mcpClaudeStep3, t.mcpClaudeStep4],
    },
    {
      key: "chatgpt",
      title: t.mcpChatgptTitle,
      steps: [t.mcpChatgptStep1, t.mcpChatgptStep2, t.mcpChatgptStep3],
    },
    {
      key: "gemini",
      title: t.mcpGeminiTitle,
      steps: [t.mcpGeminiStep1, t.mcpGeminiStep2, t.mcpGeminiStep3],
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          style={{
            width: 9,
            height: 9,
            borderRadius: 999,
            background: dot,
            flex: "0 0 auto",
          }}
        />
        <span className="text-sm font-semibold">{label}</span>
      </div>

      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {status === "offline" ? t.mcpOfflineMsg : t.mcpOnlineMsg}
      </p>

      <div className="flex items-stretch gap-2">
        <code
          className="flex-1 text-xs px-3 py-2 rounded overflow-x-auto whitespace-nowrap"
          style={{ background: "var(--past-bg)", border: "1px solid var(--line-strong)" }}
        >
          {mcpUrl}
        </code>
        <button
          onClick={copyUrl}
          className="text-xs font-semibold px-3 rounded shrink-0"
          style={{ border: "1px solid var(--line-strong)", background: "#fff" }}
        >
          {copied ? t.copied : t.copy}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {clients.map((client) => {
          const isOpen = openClient === client.key;

          return (
            <div
              key={client.key}
              className="rounded overflow-hidden"
              style={{ border: "1px solid var(--line-strong)", background: "#fff" }}
            >
              <button
                type="button"
                onClick={() => setOpenClient(isOpen ? null : client.key)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                <span>{client.title}</span>
                <span aria-hidden style={{ color: "var(--muted)", fontSize: 18, lineHeight: 1 }}>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <ol
                  className="flex flex-col gap-1.5 px-3 pb-3 text-xs"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {client.steps.map((step, index) => (
                    <li key={step}>
                      {index + 1}. {step}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
