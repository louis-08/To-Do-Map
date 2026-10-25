"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { ReorderUpdate, Task } from "@/lib/api";
import { dropTargetOf, finishDrop, moveTo } from "@/lib/board";
import WeekRow from "./WeekRow";
import TopBar from "./TopBar";
import SettingsView from "./SettingsView";
import YearView from "./YearView";
import { useI18n } from "@/lib/i18n";

const LOAD_SIZE = 4;

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildWeeks(startYear = 2026, numYears = 6) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayMonday = mondayOf(today);
  const weeks: Array<{
    num: number; year: number; monday: Date; sunday: Date;
    days: Date[]; isCurrent: boolean;
  }> = [];

  for (let y = startYear; y < startYear + numYears; y++) {
    const firstMonday = mondayOf(new Date(y, 0, 1));
    const nextFirstMonday = mondayOf(new Date(y + 1, 0, 1));
    let num = 1;
    for (let m = new Date(firstMonday); m < nextFirstMonday; m.setDate(m.getDate() + 7)) {
      const monday = new Date(m);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        days.push(d);
      }
      weeks.push({ num: num++, year: y, monday, sunday, days, isCurrent: monday.getTime() === todayMonday.getTime() });
    }
  }
  return weeks;
}

const ALL_WEEKS = buildWeeks(2026, 6);
const CURRENT_WEEK_IDX = Math.max(0, ALL_WEEKS.findIndex((w) => w.isCurrent));

type ViewType = "board" | "year" | "settings";

const LANES_STORAGE_KEY = "todomap-project-lanes";

export default function MonthView({
  tasks: initialTasks,
  onAddTask,
  onAddWeeklyTask,
  onAddMonthTask,
  onAddQuarterTask,
  onAddYearTask,
  onToggle,
  onDelete,
  onColorChange,
  onEdit,
  onReorder,
  onExport,
}: {
  tasks: Task[];
  onAddTask: (date: string, text: string, projectId?: string | null) => void;
  onAddWeeklyTask: (mondayISO: string, text: string, projectId?: string | null) => void;
  onAddMonthTask: (monthISO: string, text: string) => void;
  onAddQuarterTask: (quarterISO: string, text: string) => void;
  onAddYearTask: (yearISO: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
  onReorder: (updates: ReorderUpdate[]) => void;
  onExport: () => void;
}) {
  const { t } = useI18n();
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("board");
  const [visibleYear, setVisibleYear] = useState(() => new Date().getFullYear());
  const [yearViewYear, setYearViewYear] = useState(() => new Date().getFullYear());
  const [nowMondayTime, setNowMondayTime] = useState(() => mondayOf(new Date()).getTime());

  // Week view mode: normal (project labels on tasks) or project lanes.
  // Starts false on both server and client, then restores the stored choice.
  const [lanes, setLanes] = useState(false);
  useEffect(() => {
    try { setLanes(localStorage.getItem(LANES_STORAGE_KEY) === "1"); } catch { /* storage blocked */ }
  }, []);
  const toggleLanes = useCallback(() => {
    setLanes((prev) => {
      const next = !prev;
      try { localStorage.setItem(LANES_STORAGE_KEY, next ? "1" : "0"); } catch { /* storage blocked */ }
      return next;
    });
  }, []);

  // ALL_WEEKS is built once at module load, so its baked `isCurrent` goes stale
  // when the PWA stays open across a week boundary. Re-derive the current week
  // whenever the app regains focus/visibility.
  useEffect(() => {
    const sync = () => {
      const t = mondayOf(new Date()).getTime();
      setNowMondayTime((prev) => (prev === t ? prev : t));
    };
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const [startIdx, setStartIdx] = useState(() => Math.max(0, CURRENT_WEEK_IDX - LOAD_SIZE));
  const [endIdx, setEndIdx] = useState(() => Math.min(ALL_WEEKS.length - 1, CURRENT_WEEK_IDX + LOAD_SIZE * 2));

  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const todayCellRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const anchorScrollRef = useRef(false);
  const [showBackToToday, setShowBackToToday] = useState(false);

  const loadEarlier = useCallback(() => {
    if (startIdx === 0) return;
    const sc = scrollerRef.current;
    if (sc) { prevScrollHeightRef.current = sc.scrollHeight; anchorScrollRef.current = true; }
    setStartIdx((i) => Math.max(0, i - LOAD_SIZE));
  }, [startIdx]);

  const loadLater = useCallback(() => {
    setEndIdx((i) => Math.min(ALL_WEEKS.length - 1, i + LOAD_SIZE));
  }, []);

  useLayoutEffect(() => {
    if (!anchorScrollRef.current) return;
    anchorScrollRef.current = false;
    const sc = scrollerRef.current;
    if (sc) sc.scrollTop += sc.scrollHeight - prevScrollHeightRef.current;
  }, [startIdx]);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  // In the year view, the topbar year pill reflects the year being viewed.
  useEffect(() => { if (view === "year") setVisibleYear(yearViewYear); }, [view, yearViewYear]);

  const visibleWeeks = useMemo(() => ALL_WEEKS.slice(startIdx, endIdx + 1), [startIdx, endIdx]);
  const activeTask = tasks.find((t) => t.id === activeId);

  const weekTasksCacheRef = useRef(new Map<string, Task[]>());
  const weekTasksMap = useMemo(() => {
    const byDate = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.scope === "month" || t.scope === "quarter" || t.scope === "year") continue;
      if (!byDate.has(t.date)) byDate.set(t.date, []);
      byDate.get(t.date)!.push(t);
    }
    const next = new Map<string, Task[]>();
    const prev = weekTasksCacheRef.current;
    for (const week of visibleWeeks) {
      const key = toISO(week.monday);
      // Include all 7 days + weekly objective tasks (which also have date = monday)
      const newArr: Task[] = week.days.flatMap((d) => byDate.get(toISO(d)) ?? []);
      newArr.sort((a, b) => a.date === b.date ? a.position - b.position : a.date < b.date ? -1 : 1);
      const prevArr = prev.get(key);
      const same = prevArr !== undefined &&
                   prevArr.length === newArr.length &&
                   newArr.every((t, i) => t === prevArr[i]);
      next.set(key, same ? prevArr : newArr);
    }
    weekTasksCacheRef.current = next;
    return next;
  }, [tasks, visibleWeeks]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const scrollToToday = useCallback((smooth: boolean) => {
    const sc = scrollerRef.current;
    const el = currentRef.current;
    if (!sc || !el) return;
    const head = sc.querySelector(".tm-colhead") as HTMLElement | null;
    const off = (head ? head.offsetHeight : 0) + 8;
    const top = Math.max(0, sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - off);
    const opts: ScrollToOptions = { top };
    const todayCell = todayCellRef.current;
    if (todayCell) {
      const cellRect = todayCell.getBoundingClientRect();
      const scRect = sc.getBoundingClientRect();
      opts.left = Math.max(0, sc.scrollLeft + cellRect.left - scRect.left - (sc.clientWidth - todayCell.offsetWidth) / 2);
    }
    if (smooth) sc.scrollTo({ ...opts, behavior: "smooth" });
    else sc.scrollTo(opts);
  }, []);

  const updateVisibleYear = useCallback(() => {
    const sc = scrollerRef.current;
    if (!sc) return;
    const head = sc.querySelector(".tm-colhead") as HTMLElement | null;
    const marker = sc.getBoundingClientRect().top + (head ? head.offsetHeight : 0) + 12;
    const rows = sc.querySelectorAll("[data-week-year]");
    let year: number | null = null;
    for (const r of rows) {
      if (r.getBoundingClientRect().top <= marker) year = +(r as HTMLElement).dataset.weekYear!;
      else break;
    }
    if (year == null && rows.length) year = +(rows[0] as HTMLElement).dataset.weekYear!;
    if (year != null) setVisibleYear((y) => y === year ? y : year!);
  }, []);

  const onScroll = useCallback(() => {
    if (scrollRaf.current) return;
    scrollRaf.current = requestAnimationFrame(() => { scrollRaf.current = 0; updateVisibleYear(); });
  }, [updateVisibleYear]);

  useEffect(() => {
    scrollToToday(false); updateVisibleYear();
    const r = requestAnimationFrame(() => { scrollToToday(false); updateVisibleYear(); });
    const t1 = setTimeout(() => { scrollToToday(false); updateVisibleYear(); }, 120);
    const t2 = setTimeout(() => { scrollToToday(false); updateVisibleYear(); }, 400);
    return () => { cancelAnimationFrame(r); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (view !== "board") {
      setShowBackToToday(false);
      return;
    }

    const sc = scrollerRef.current;
    const todayCell = todayCellRef.current;
    if (!sc || !todayCell) {
      setShowBackToToday(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setShowBackToToday(!entry.isIntersecting),
      { root: sc, threshold: 0.2 },
    );
    observer.observe(todayCell);
    return () => observer.disconnect();
  }, [view, startIdx, endIdx, nowMondayTime, lanes]);

  const stats = {
    done: tasks.filter((t) => t.done).length,
    open: tasks.filter((t) => !t.done && !t.is_weekly_objective).length,
    objectives: tasks.filter((t) => t.is_weekly_objective).length,
  };

  // DnD: the target cell decides date, weekly flag and (in lanes) project.
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const overTask = tasks.find((t) => t.id === over.id);
    const target = dropTargetOf(String(over.id), overTask, lanes);
    if (!target) return;
    setTasks((prev) => moveTo(prev, String(active.id), target));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const overTask = tasks.find((t) => t.id === over.id);
    const target = dropTargetOf(String(over.id), overTask, lanes);
    if (!target) return;
    const result = finishDrop(tasks, String(active.id), overTask?.id ?? null, target);
    if (!result.updates.length) return;
    setTasks(result.tasks);
    onReorder(result.updates);
  }

  const rows = useMemo(() => {
    const result: Array<{ week: typeof visibleWeeks[0]; divider: string | null }> = [];
    let prevMonthKey = "";
    for (const w of visibleWeeks) {
      const week = { ...w, isCurrent: w.monday.getTime() === nowMondayTime };
      const key = week.monday.getMonth() + "-" + week.year;
      const divider = key !== prevMonthKey ? t.months[week.monday.getMonth()] + " " + week.year : null;
      result.push({ week, divider });
      prevMonthKey = key;
    }
    return result;
  }, [visibleWeeks, nowMondayTime, t]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <TopBar
        visibleYear={visibleYear}
        view={view}
        lanes={lanes}
        onToggleLanes={() => {
          if (view !== "board") setView("board");
          toggleLanes();
          requestAnimationFrame(() => scrollToToday(false));
        }}
        onTodayClick={() => {
          if (view !== "board") { setView("board"); requestAnimationFrame(() => scrollToToday(true)); }
          else scrollToToday(true);
        }}
        onViewChange={setView}
      />

      {view === "board" && (
        <div className={"tm-scroll" + (lanes ? " tm-lanes" : "")} ref={scrollerRef} onScroll={onScroll} style={{ flex: "1 1 auto" }}>
          <DndContext id="board-dnd" sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="tm-colhead">
              {lanes && <div className="tm-col tm-lane-label tm-lane-corner"><span>{t.project}</span></div>}
              {t.daysFull.map((n, i) => (
                <div key={n} className={"tm-col" + (i >= 5 ? " is-weekend" : "")}><span>{n}</span></div>
              ))}
              <div className="tm-col tm-col-obj"><span>{t.weeklyObjective}</span></div>
            </div>

            {startIdx > 0 && (
              <div className="tm-load-band">
                <button className="tm-load-btn" onClick={loadEarlier}>{t.loadEarlier}</button>
              </div>
            )}

            {rows.map(({ week, divider }) => (
              <div key={week.year + "-" + week.num}>
                {divider && <div className="tm-month-band"><span>{divider}</span></div>}
                <WeekRow
                  week={week}
                  tasks={weekTasksMap.get(toISO(week.monday)) ?? []}
                  lanes={lanes}
                  onAddTask={onAddTask}
                  onAddWeeklyTask={onAddWeeklyTask}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onColorChange={onColorChange}
                  onEdit={onEdit}
                  currentRef={week.isCurrent ? currentRef : undefined}
                  todayRef={week.isCurrent ? todayCellRef : undefined}
                />
              </div>
            ))}

            {endIdx < ALL_WEEKS.length - 1 && (
              <div className="tm-load-band">
                <button className="tm-load-btn" onClick={loadLater}>{t.loadLater}</button>
              </div>
            )}

            <DragOverlay>
              {activeTask && (
                <div className="tm-task" style={{ opacity: 0.9, boxShadow: "0 4px 12px rgba(16,16,26,.15)" }}>
                  <span className="tm-task-text">{activeTask.text}</span>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {view === "year" && (
        <div className="tm-scroll" style={{ flex: "1 1 auto" }}>
          <YearView
            year={yearViewYear}
            onYearChange={setYearViewYear}
            tasks={tasks}
            setTasks={setTasks}
            onAddMonthTask={onAddMonthTask}
            onAddQuarterTask={onAddQuarterTask}
            onAddYearTask={onAddYearTask}
            onToggle={onToggle}
            onDelete={onDelete}
            onColorChange={onColorChange}
            onEdit={onEdit}
            onReorder={onReorder}
          />
        </div>
      )}

      {view === "settings" && (
        <div style={{ flex: "1 1 auto", overflow: "auto" }}>
          <SettingsView stats={stats} onBack={() => setView("board")} onExport={onExport} />
        </div>
      )}

      {view === "board" && showBackToToday && (
        <button className="tm-back-today-btn" type="button" onClick={() => scrollToToday(true)}>
          Back to today
        </button>
      )}
    </div>
  );
}
