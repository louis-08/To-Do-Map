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
  // task input / item
  newTaskPlaceholder: "New task…",
  addTask: "Add task",
  saveTask: "Save task",
  markComplete: "Mark complete",
  markIncomplete: "Mark incomplete",
  changeColor: "Change color",
  deleteTask: "Delete task",
  editTask: "Edit task",
  taskOptions: "Options",
  edit: "Edit",
  color: "Color",
  deadline: "Deadline",
  setDeadline: "Set deadline",
  removeDeadline: "Remove deadline",
  save: "Save",
  close: "Close",
  back: "Back",
  // year view
  prevYear: "Previous year",
  nextYear: "Next year",
  // misc
  loading: "Loading…",
  // projects
  project: "Project",
  projects: "Projects",
  projectsSub: "Group tasks by project. A deleted project stays on the tasks that already have it.",
  noProject: "No project",
  noProjectsYet: "No projects yet.",
  newProjectPlaceholder: "New project…",
  addProject: "Add",
  createProject: "Create project",
  changeProject: "Change project",
  deletedProject: "deleted",
  deleteProjectConfirm: "Delete project? Existing tasks keep it.",
  projectName: "Project name",
  projectColor: "Project color",
  moveUp: "Move up",
  moveDown: "Move down",
  projectLanes: "Project lanes",
  projectLanesOn: "Show project lanes",
  projectLanesOff: "Hide project lanes",
  unknownProject: "Project",
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
  newTaskPlaceholder: "Neue Aufgabe…",
  addTask: "Aufgabe hinzufügen",
  saveTask: "Aufgabe speichern",
  markComplete: "Als erledigt markieren",
  markIncomplete: "Als offen markieren",
  changeColor: "Farbe ändern",
  deleteTask: "Aufgabe löschen",
  editTask: "Aufgabe bearbeiten",
  taskOptions: "Optionen",
  edit: "Bearbeiten",
  color: "Farbe",
  deadline: "Deadline",
  setDeadline: "Deadline setzen",
  removeDeadline: "Deadline entfernen",
  save: "Speichern",
  close: "Schließen",
  back: "Zurück",
  prevYear: "Vorheriges Jahr",
  nextYear: "Nächstes Jahr",
  loading: "Wird geladen…",
  project: "Projekt",
  projects: "Projekte",
  projectsSub: "Gruppiere Aufgaben nach Projekt. Ein gelöschtes Projekt bleibt an den Aufgaben, die es schon haben.",
  noProject: "Kein Projekt",
  noProjectsYet: "Noch keine Projekte.",
  newProjectPlaceholder: "Neues Projekt…",
  addProject: "Hinzufügen",
  createProject: "Projekt erstellen",
  changeProject: "Projekt ändern",
  deletedProject: "gelöscht",
  deleteProjectConfirm: "Projekt löschen? Bestehende Aufgaben behalten es.",
  projectName: "Projektname",
  projectColor: "Projektfarbe",
  moveUp: "Nach oben",
  moveDown: "Nach unten",
  projectLanes: "Projekt-Ansicht",
  projectLanesOn: "Projekt-Ansicht einschalten",
  projectLanesOff: "Projekt-Ansicht ausschalten",
  unknownProject: "Projekt",
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
