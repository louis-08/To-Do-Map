"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "de";

const STORAGE_KEY = "todomap-lang";

const en = {
  // top bar
  week: "Week",
  year: "Year",
  today: "Today",
  profileTitle: "Profile",
  settingsTitle: "Settings",
  // shared
  board: "Board",
  // board view
  weeklyObjective: "Weekly Objective",
  loadEarlier: "↑ Load earlier weeks",
  loadLater: "↓ Load later weeks",
  todayPill: "Today",
  nowPill: "Now",
  yearlyObjective: "Yearly objective",
  weekAbbr: "W",
  quarterAbbr: "Q",
  // calendar names
  months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  daysFull: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  daysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  // profile
  tasksDone: "Tasks done",
  openTasks: "Open tasks",
  objectivesSet: "Objectives set",
  youFallback: "You",
  // settings
  language: "Language",
  languageSub: "Choose your preferred language",
  exportTitle: "Export",
  exportLabel: "Download Markdown backup",
  exportSub: "All your tasks exported as a .md file",
  exportBtn: "Export",
  aiIntegration: "AI Integration (MCP)",
  autoRollover: "Automatic rollover",
  autoRolloverLabel: "Roll over unfinished tasks",
  autoRolloverSub: "When a new day starts, it moves unfinished task automaticly to the next day.",
  account: "Account",
  signOut: "Sign out",
  signOutSub: "Sign out of your account on this device",
  deleteAccount: "Delete account",
  deleteAccountSub: "Permanently delete your account and all data. This cannot be undone.",
  delete: "Delete",
  cancel: "Cancel",
  confirmDelete: "Yes, delete",
  deleting: "Deleting…",
  controls: "Controls",
  checkCircle: "Check circle",
  checkCircleSub: "Mark a task as done or undone",
  doubleClick: "Double click / Double tap",
  doubleClickSub: "Open the color picker for a task",
  dragDesktop: "Drag (desktop)",
  dragDesktopSub: "Click and drag a task to move it to another day or the weekly column",
  longPress: "Long press (mobile)",
  longPressSub: "Hold a task to start dragging it",
  trashIcon: "Trash icon",
  trashIconSub: "Delete a task — recoverable from trash for 30 days",
  plusButton: "+ button",
  plusButtonSub: "Add a new task to that day or weekly column",
  aboutTagline: "Plan your year, one week at a time.",
  // MCP info
  serverOnline: "Server online",
  serverOffline: "Server not reachable",
  serverChecking: "Checking…",
  mcpOfflineMsg: "The TodoMap MCP server isn't responding. Make sure the backend is running, then reload this page.",
  mcpOnlineMsg: "Connect Claude (or any MCP client) to view and manage your tasks with AI.",
  copied: "Copied",
  copy: "Copy",
  mcpStep1Pre: "In Claude, open ",
  mcpStep1Strong: "Settings → Connectors → Add custom connector",
  mcpStep1Post: ".",
  mcpStep2: "Paste the URL above as the remote MCP server.",
  mcpStep3Pre: "Click ",
  mcpStep3Strong: "Connect",
  mcpStep3Post: " and sign in with this same account to authorize access.",
  mcpStep4: "Ask Claude to list, add, or complete tasks — it works on your TodoMap directly.",
  // task input / item
  newTaskPlaceholder: "New task…",
  addTask: "Add task",
  saveTask: "Save task",
  markComplete: "Mark complete",
  markIncomplete: "Mark incomplete",
  changeColor: "Change color",
  deleteTask: "Delete task",
  // year view
  prevYear: "Previous year",
  nextYear: "Next year",
  // misc
  loading: "Loading…",
};

export type Translations = typeof en;

const de: Translations = {
  week: "Woche",
  year: "Jahr",
  today: "Heute",
  profileTitle: "Profil",
  settingsTitle: "Einstellungen",
  board: "Übersicht",
  weeklyObjective: "Wochenziel",
  loadEarlier: "↑ Frühere Wochen laden",
  loadLater: "↓ Spätere Wochen laden",
  todayPill: "Heute",
  nowPill: "Jetzt",
  yearlyObjective: "Jahresziel",
  weekAbbr: "KW",
  quarterAbbr: "Q",
  months: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  monthsShort: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  daysFull: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
  daysShort: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  tasksDone: "Erledigte Aufgaben",
  openTasks: "Offene Aufgaben",
  objectivesSet: "Gesetzte Ziele",
  youFallback: "Du",
  language: "Sprache",
  languageSub: "Wähle deine bevorzugte Sprache",
  exportTitle: "Export",
  exportLabel: "Markdown-Backup herunterladen",
  exportSub: "Alle deine Aufgaben als .md-Datei exportiert",
  exportBtn: "Exportieren",
  aiIntegration: "KI-Integration (MCP)",
  autoRollover: "Automatischer Übertrag",
  autoRolloverLabel: "Unerledigte Aufgaben übertragen",
  autoRolloverSub: "Wenn ein neuer Tag beginnt, werden unerledigte Aufgaben autoamtisch zum nächsten Tag verschoben.",
  account: "Konto",
  signOut: "Abmelden",
  signOutSub: "Melde dich auf diesem Gerät von deinem Konto ab",
  deleteAccount: "Konto löschen",
  deleteAccountSub: "Lösche dein Konto und alle Daten dauerhaft. Dies kann nicht rückgängig gemacht werden.",
  delete: "Löschen",
  cancel: "Abbrechen",
  confirmDelete: "Ja, löschen",
  deleting: "Wird gelöscht…",
  controls: "Bedienung",
  checkCircle: "Häkchen-Kreis",
  checkCircleSub: "Markiere eine Aufgabe als erledigt oder offen",
  doubleClick: "Doppelklick / Doppeltippen",
  doubleClickSub: "Öffnet die Farbauswahl für eine Aufgabe",
  dragDesktop: "Ziehen (Desktop)",
  dragDesktopSub: "Klicke und ziehe eine Aufgabe, um sie auf einen anderen Tag oder die Wochenspalte zu verschieben",
  longPress: "Langes Drücken (Mobil)",
  longPressSub: "Halte eine Aufgabe gedrückt, um sie zu ziehen",
  trashIcon: "Papierkorb-Symbol",
  trashIconSub: "Lösche eine Aufgabe — 30 Tage lang aus dem Papierkorb wiederherstellbar",
  plusButton: "+ Schaltfläche",
  plusButtonSub: "Füge dem Tag oder der Wochenspalte eine neue Aufgabe hinzu",
  aboutTagline: "Plane dein Jahr — Woche für Woche.",
  serverOnline: "Server online",
  serverOffline: "Server nicht erreichbar",
  serverChecking: "Wird geprüft…",
  mcpOfflineMsg: "Der TodoMap-MCP-Server antwortet nicht. Stelle sicher, dass das Backend läuft, und lade diese Seite neu.",
  mcpOnlineMsg: "Verbinde Claude (oder einen anderen MCP-Client), um deine Aufgaben mit KI anzusehen und zu verwalten.",
  copied: "Kopiert",
  copy: "Kopieren",
  mcpStep1Pre: "Öffne in Claude ",
  mcpStep1Strong: "Einstellungen → Connectors → Eigenen Connector hinzufügen",
  mcpStep1Post: ".",
  mcpStep2: "Füge die obige URL als Remote-MCP-Server ein.",
  mcpStep3Pre: "Klicke auf ",
  mcpStep3Strong: "Verbinden",
  mcpStep3Post: " und melde dich mit demselben Konto an, um den Zugriff zu autorisieren.",
  mcpStep4: "Bitte Claude, Aufgaben aufzulisten, hinzuzufügen oder abzuschließen — es arbeitet direkt mit deiner TodoMap.",
  newTaskPlaceholder: "Neue Aufgabe…",
  addTask: "Aufgabe hinzufügen",
  saveTask: "Aufgabe speichern",
  markComplete: "Als erledigt markieren",
  markIncomplete: "Als offen markieren",
  changeColor: "Farbe ändern",
  deleteTask: "Aufgabe löschen",
  prevYear: "Vorheriges Jahr",
  nextYear: "Nächstes Jahr",
  loading: "Wird geladen…",
};

const dictionaries: Record<Lang, Translations> = { en, de };

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start with "en" so the server render and first client render match
  // (localStorage isn't available during SSR); the stored choice is applied
  // right after mount, mirroring how the theme is restored.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "de") setLangState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: dictionaries[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within a LanguageProvider");
  return ctx;
}
