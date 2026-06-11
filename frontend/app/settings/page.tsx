"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { api } from "@/lib/api";
import ThemeToggle from "@/components/ThemeToggle";
import McpServerInfo from "@/components/McpServerInfo";
import NavBar from "@/components/NavBar";
import { currentYearMonth } from "@/lib/dates";

export default function SettingsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const a = api(getToken as () => Promise<string | null>);

  async function handleExport() {
    const blob = await a.export.markdown();
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement("a");
    a2.href = url;
    a2.download = `todomap-backup-${new Date().toISOString().slice(0, 10)}.md`;
    a2.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <NavBar current={currentYearMonth()} />
      <main className="max-w-lg mx-auto p-6 flex flex-col gap-8">
        <section>
          <h2 className="text-base font-semibold mb-3">Account</h2>
          <div className="flex items-center gap-3">
            {user?.imageUrl && (
              <img
                src={user.imageUrl}
                alt="Avatar"
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-[var(--text-muted)]">
                {user?.emailAddresses[0]?.emailAddress}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">Theme</h2>
          <ThemeToggle />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">AI Integration (MCP)</h2>
          <McpServerInfo />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-3">Export</h2>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded bg-[var(--accent)] text-white text-sm hover:opacity-90 transition-opacity"
          >
            Download Markdown Backup
          </button>
        </section>
      </main>
    </>
  );
}
