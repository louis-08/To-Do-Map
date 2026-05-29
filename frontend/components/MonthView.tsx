"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Task } from "@/lib/api";
import WeekRow from "./WeekRow";
import TopBar from "./TopBar";
import ProfileView from "./ProfileView";
import SettingsView from "./SettingsView";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
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

type ViewType = "board" | "profile" | "settings";

export default function MonthView({
  tasks: initialTasks,
  onAddTask,
  onAddWeeklyTask,
  onToggle,
  onDelete,
  onColorChange,
  onReorder,
  onExport,
}: {
  tasks: Task[];
  onAddTask: (date: string, text: string) => void;
  onAddWeeklyTask: (mondayISO: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onReorder: (updates: { id: string; date: string; position: number; is_weekly_objective?: boolean }[]) => void;
  onExport: () => void;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>("board");
  const [visibleYear, setVisibleYear] = useState(() => new Date().getFullYear());

  const [startIdx, setStartIdx] = useState(() => Math.max(0, CURRENT_WEEK_IDX - LOAD_SIZE));
  const [endIdx, setEndIdx] = useState(() => Math.min(ALL_WEEKS.length - 1, CURRENT_WEEK_IDX + LOAD_SIZE * 2));

  const scrollerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef(0);
  const prevScrollHeightRef = useRef(0);
  const anchorScrollRef = useRef(false);

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

  const visibleWeeks = useMemo(() => ALL_WEEKS.slice(startIdx, endIdx + 1), [startIdx, endIdx]);
  const activeTask = tasks.find((t) => t.id === activeId);

  const weekTasksCacheRef = useRef(new Map<string, Task[]>());
  const weekTasksMap = useMemo(() => {
    const byDate = new Map<string, Task[]>();
    for (const t of tasks) {
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const scrollToToday = useCallback((smooth: boolean) => {
    const sc = scrollerRef.current;
    const el = currentRef.current;
    if (!sc || !el) return;
    const head = sc.querySelector(".tm-colhead") as HTMLElement | null;
    const off = (head ? head.offsetHeight : 0) + 8;
    const top = Math.max(0, sc.scrollTop + el.getBoundingClientRect().top - sc.getBoundingClientRect().top - off);
    if (smooth) sc.scrollTo({ top, behavior: "smooth" });
    else sc.scrollTop = top;
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

  const stats = {
    done: tasks.filter((t) => t.done).length,
    open: tasks.filter((t) => !t.done && !t.is_weekly_objective).length,
    objectives: tasks.filter((t) => t.is_weekly_objective).length,
  };

  // DnD helpers
  function resolveTarget(over: { id: string | number }, overTask: Task | undefined) {
    const overId = over.id as string;
    const isWeeklyTarget = !overTask && overId.startsWith("week:");
    const targetDate = overTask ? overTask.date : isWeeklyTarget ? overId.slice(5) : overId;
    const targetIsWeekly = overTask ? overTask.is_weekly_objective : isWeeklyTarget;
    return { targetDate, targetIsWeekly };
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;
    const overTask = tasks.find((t) => t.id === over.id);
    const { targetDate, targetIsWeekly } = resolveTarget(over, overTask);
    if (activeTask.date !== targetDate || activeTask.is_weekly_objective !== targetIsWeekly) {
      setTasks((prev) => prev.map((t) =>
        t.id === active.id ? { ...t, date: targetDate, is_weekly_objective: targetIsWeekly } : t
      ));
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const overTask = tasks.find((t) => t.id === over.id);
    const { targetDate, targetIsWeekly } = resolveTarget(over, overTask);

    setTasks((prev) => {
      const colTasks = prev
        .filter((t) => t.date === targetDate && t.is_weekly_objective === targetIsWeekly)
        .sort((a, b) => a.position - b.position);
      const activeIdx = colTasks.findIndex((t) => t.id === active.id);
      const overIdx = overTask ? colTasks.findIndex((t) => t.id === over.id) : colTasks.length - 1;
      if (activeIdx === -1) return prev;
      const reordered = arrayMove(colTasks, activeIdx, Math.max(0, overIdx))
        .map((t, i) => ({ ...t, position: i, date: targetDate, is_weekly_objective: targetIsWeekly }));
      onReorder(reordered.map((t) => ({ id: t.id, date: t.date, position: t.position, is_weekly_objective: t.is_weekly_objective })));
      return prev
        .filter((t) => !(t.date === targetDate && t.is_weekly_objective === targetIsWeekly))
        .concat(reordered);
    });
  }

  const rows = useMemo(() => {
    const result: Array<{ week: typeof visibleWeeks[0]; divider: string | null }> = [];
    let prevMonthKey = "";
    for (const week of visibleWeeks) {
      const key = week.monday.getMonth() + "-" + week.year;
      const divider = key !== prevMonthKey ? MONTHS[week.monday.getMonth()] + " " + week.year : null;
      result.push({ week, divider });
      prevMonthKey = key;
    }
    return result;
  }, [visibleWeeks]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <TopBar
        visibleYear={visibleYear}
        view={view}
        onTodayClick={() => {
          if (view !== "board") { setView("board"); requestAnimationFrame(() => scrollToToday(true)); }
          else scrollToToday(true);
        }}
        onViewChange={setView}
      />

      {view === "board" && (
        <div className="tm-scroll" ref={scrollerRef} onScroll={onScroll} style={{ flex: "1 1 auto" }}>
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="tm-colhead">
              {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((n, i) => (
                <div key={n} className={"tm-col" + (i >= 5 ? " is-weekend" : "")}><span>{n}</span></div>
              ))}
              <div className="tm-col tm-col-obj"><span>Weekly Objective</span></div>
            </div>

            {startIdx > 0 && (
              <div className="tm-load-band">
                <button className="tm-load-btn" onClick={loadEarlier}>↑ Load earlier weeks</button>
              </div>
            )}

            {rows.map(({ week, divider }) => (
              <div key={week.year + "-" + week.num}>
                {divider && <div className="tm-month-band"><span>{divider}</span></div>}
                <WeekRow
                  week={week}
                  tasks={weekTasksMap.get(toISO(week.monday)) ?? []}
                  onAddTask={onAddTask}
                  onAddWeeklyTask={onAddWeeklyTask}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onColorChange={onColorChange}
                  currentRef={week.isCurrent ? currentRef : undefined}
                />
              </div>
            ))}

            {endIdx < ALL_WEEKS.length - 1 && (
              <div className="tm-load-band">
                <button className="tm-load-btn" onClick={loadLater}>↓ Load later weeks</button>
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

      {view === "profile" && (
        <div style={{ flex: "1 1 auto", overflow: "auto" }}>
          <ProfileView stats={stats} onBack={() => setView("board")} />
        </div>
      )}

      {view === "settings" && (
        <div style={{ flex: "1 1 auto", overflow: "auto" }}>
          <SettingsView onBack={() => setView("board")} onExport={onExport} />
        </div>
      )}
    </div>
  );
}
