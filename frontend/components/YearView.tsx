"use client";

import { useState } from "react";
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
import { arrayMove } from "@dnd-kit/sortable";
import type { Task } from "@/lib/api";
import MonthCell from "./MonthCell";
import QuarterCell from "./QuarterCell";
import YearObjective from "./YearObjective";
import { useI18n } from "@/lib/i18n";

function monthISOf(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
}
function quarterISOf(year: number, q: number) {
  return `${year}-${String(q * 3 + 1).padStart(2, "0")}-01`;
}
function yearISOf(year: number) {
  return `${year}-01-01`;
}

type Scope = "month" | "quarter" | "year";

export default function YearView({
  year,
  onYearChange,
  tasks,
  setTasks,
  onAddMonthTask,
  onAddQuarterTask,
  onAddYearTask,
  onToggle,
  onDelete,
  onColorChange,
  onEdit,
  onDeadlineChange,
  onReorder,
}: {
  year: number;
  onYearChange: (y: number) => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onAddMonthTask: (monthISO: string, text: string) => void;
  onAddQuarterTask: (quarterISO: string, text: string) => void;
  onAddYearTask: (yearISO: string, text: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
  onDeadlineChange: (id: string, deadline: string | null) => void;
  onReorder: (updates: { id: string; date: string; position: number; is_weekly_objective?: boolean; scope?: Task["scope"] }[]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { t } = useI18n();

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const curQuarter = Math.floor(curMonth / 3);
  const yearISO = yearISOf(year);

  const monthState = (m: number): "past" | "today" | "future" => {
    if (year < curYear || (year === curYear && m < curMonth)) return "past";
    if (year === curYear && m === curMonth) return "today";
    return "future";
  };

  const tasksFor = (date: string, scope: Scope) =>
    tasks
      .filter((t) => t.scope === scope && t.date === date)
      .sort((a, b) => a.position - b.position);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const activeTask = tasks.find((t) => t.id === activeId);

  function resolveTarget(over: { id: string | number }, overTask: Task | undefined) {
    if (overTask) return { targetDate: overTask.date, targetScope: overTask.scope as Scope };
    const overId = String(over.id);
    if (overId.startsWith("year:")) return { targetDate: overId.slice(5), targetScope: "year" as Scope };
    if (overId.startsWith("quarter:")) return { targetDate: overId.slice(8), targetScope: "quarter" as Scope };
    return { targetDate: overId, targetScope: "month" as Scope };
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    const activeT = tasks.find((t) => t.id === active.id);
    if (!activeT) return;
    const overTask = tasks.find((t) => t.id === over.id);
    const { targetDate, targetScope } = resolveTarget(over, overTask);
    if (activeT.date !== targetDate || activeT.scope !== targetScope) {
      setTasks((prev) => prev.map((t) =>
        t.id === active.id ? { ...t, date: targetDate, scope: targetScope } : t
      ));
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;
    const overTask = tasks.find((t) => t.id === over.id);
    const { targetDate, targetScope } = resolveTarget(over, overTask);

    setTasks((prev) => {
      const colTasks = prev
        .filter((t) => t.date === targetDate && t.scope === targetScope)
        .sort((a, b) => a.position - b.position);
      const activeIdx = colTasks.findIndex((t) => t.id === active.id);
      const overIdx = overTask ? colTasks.findIndex((t) => t.id === over.id) : colTasks.length - 1;
      if (activeIdx === -1) return prev;
      const reordered = arrayMove(colTasks, activeIdx, Math.max(0, overIdx))
        .map((t, i) => ({ ...t, position: i, date: targetDate, scope: targetScope }));
      onReorder(reordered.map((t) => ({ id: t.id, date: t.date, position: t.position, scope: t.scope, is_weekly_objective: false })));
      return prev
        .filter((t) => !(t.date === targetDate && t.scope === targetScope))
        .concat(reordered);
    });
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="tm-year">
        <div className="tm-year-head">
          <button className="tm-year-nav" onClick={() => onYearChange(year - 1)} aria-label={t.prevYear}>‹</button>
          <span className="tm-year-title">{year}</span>
          <button className="tm-year-nav" onClick={() => onYearChange(year + 1)} aria-label={t.nextYear}>›</button>
        </div>

        <div className="tm-year-body">
          <div className="tm-year-main">
            {[0, 1, 2, 3].map((q) => (
              <div className="tm-quarter" key={q}>
                {[0, 1, 2].map((i) => {
                  const m = q * 3 + i;
                  const iso = monthISOf(year, m);
                  return (
                    <MonthCell
                      key={m}
                      monthISO={iso}
                      label={t.months[m]}
                      state={monthState(m)}
                      tasks={tasksFor(iso, "month")}
                      onAdd={onAddMonthTask}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onColorChange={onColorChange}
                      onEdit={onEdit}
                      onDeadlineChange={onDeadlineChange}
                    />
                  );
                })}
                <QuarterCell
                  quarter={q}
                  quarterISO={quarterISOf(year, q)}
                  tasks={tasksFor(quarterISOf(year, q), "quarter")}
                  isCurrent={year === curYear && q === curQuarter}
                  isPast={year < curYear || (year === curYear && q < curQuarter)}
                  onAdd={onAddQuarterTask}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onColorChange={onColorChange}
                  onEdit={onEdit}
                  onDeadlineChange={onDeadlineChange}
                />
              </div>
            ))}
          </div>

          <div className="tm-year-side">
            <YearObjective
              year={year}
              yearISO={yearISO}
              tasks={tasksFor(yearISO, "year")}
              isCurrent={year === curYear}
              isPast={year < curYear}
              onAdd={onAddYearTask}
              onToggle={onToggle}
              onDelete={onDelete}
              onColorChange={onColorChange}
              onEdit={onEdit}
              onDeadlineChange={onDeadlineChange}
            />
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="tm-task" style={{ opacity: 0.9, boxShadow: "0 4px 12px rgba(16,16,26,.15)" }}>
              <span className="tm-task-text">{activeTask.text}</span>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
