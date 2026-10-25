"use client";

import { memo, useMemo } from "react";
import type { Task } from "@/lib/api";
import { buildLanes, cellId, inLane, type Lane } from "@/lib/board";
import { useProjects } from "@/lib/projects";
import { useI18n } from "@/lib/i18n";
import DayColumn, { DayHead } from "./DayColumn";
import WeeklyObjective, { WeeklyObjectiveHead } from "./WeeklyObjective";
import { projectDotColor } from "./ProjectLabel";

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isoToday() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return toISO(d);
}

type Week = { num: number; year: number; monday: Date; sunday: Date; days: Date[]; isCurrent: boolean };
type DayState = "past" | "today" | "future";

type Props = {
  week: Week;
  tasks: Task[];
  /** Project view: one horizontal lane per project inside the week. */
  lanes: boolean;
  onAddTask: (date: string, text: string, projectId?: string | null) => void;
  onAddWeeklyTask: (mondayISO: string, text: string, projectId?: string | null) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string | null) => void;
  onEdit: (id: string, text: string) => void;
  currentRef?: React.RefObject<HTMLDivElement | null>;
  todayRef?: React.RefObject<HTMLDivElement | null>;
};

function dayStateOf(d: Date, today: string): DayState {
  const iso = toISO(d);
  if (iso < today) return "past";
  if (iso === today) return "today";
  return "future";
}

function LaneLabel({ lane }: { lane: Lane }) {
  const { t } = useI18n();
  const name = lane.projectId === null
    ? t.noProject
    : lane.project?.name ?? t.unknownProject;
  return (
    <div
      className={"tm-lane-label" + (lane.projectId === null ? " is-none" : "") + (lane.deleted ? " is-deleted" : "")}
      title={lane.deleted ? `${name} (${t.deletedProject})` : name}
    >
      <i
        className={"tm-project-dot" + (lane.projectId === null ? " is-none" : "")}
        style={lane.projectId === null ? undefined : { background: projectDotColor(lane.project?.color) }}
      />
      <span className="tm-lane-text">
        <span className="tm-lane-name">{name}</span>
        {lane.deleted && <em className="tm-project-deleted">{t.deletedProject}</em>}
      </span>
    </div>
  );
}

const WeekRow = memo(function WeekRow(props: Props) {
  return props.lanes ? <LanedWeek {...props} /> : <PlainWeek {...props} />;
});

/** Normal view: one row per week, tasks carry a project label. */
function PlainWeek({
  week, tasks, onAddTask, onAddWeeklyTask, onToggle, onDelete, onColorChange, onEdit, currentRef, todayRef,
}: Props) {
  const today = isoToday();
  const mondayISO = toISO(week.monday);
  const weeklyTasks = tasks.filter((t) => t.is_weekly_objective);

  return (
    <div
      ref={week.isCurrent ? currentRef : undefined}
      data-week-year={week.year}
      className={"tm-row" + (week.isCurrent ? " is-current-week" : "")}
    >
      {week.days.map((day, i) => {
        const iso = toISO(day);
        const state = dayStateOf(day, today);
        return (
          <DayColumn
            key={iso}
            date={day}
            dayIndex={i}
            state={state}
            droppableId={cellId("day", iso)}
            tasks={tasks.filter((t) => t.date === iso && !t.is_weekly_objective)}
            onAdd={onAddTask}
            onToggle={onToggle}
            onDelete={onDelete}
            onColorChange={onColorChange}
            onEdit={onEdit}
            todayRef={state === "today" ? todayRef : undefined}
          />
        );
      })}
      <WeeklyObjective
        weekNum={week.num}
        monday={week.monday}
        sunday={week.sunday}
        droppableId={cellId("week", mondayISO)}
        tasks={weeklyTasks}
        isCurrent={week.isCurrent}
        onAdd={onAddWeeklyTask}
        onToggle={onToggle}
        onDelete={onDelete}
        onColorChange={onColorChange}
        onEdit={onEdit}
      />
    </div>
  );
}

/**
 * Project view: a head row with the dates, then one horizontal lane per
 * project. Every cell is its own drop target, so dragging a task into another
 * lane re-assigns its project.
 */
function LanedWeek({
  week, tasks, onAddTask, onAddWeeklyTask, onToggle, onDelete, onColorChange, onEdit, currentRef, todayRef,
}: Props) {
  const { t } = useI18n();
  const { projects } = useProjects();
  const today = isoToday();
  const mondayISO = toISO(week.monday);
  const lanes = useMemo(() => buildLanes(projects, tasks), [projects, tasks]);

  return (
    <div
      ref={week.isCurrent ? currentRef : undefined}
      data-week-year={week.year}
      className={"tm-week" + (week.isCurrent ? " is-current-week" : "")}
    >
      <div className="tm-row tm-lane-headrow">
        <div className="tm-lane-label tm-lane-corner">
          <span className="tm-weeknum">{t.weekAbbr}{week.num}</span>
        </div>
        {week.days.map((day, i) => {
          const state = dayStateOf(day, today);
          return (
            <div
              key={toISO(day)}
              ref={state === "today" ? todayRef : undefined}
              className={"tm-cell tm-lane-headcell state-" + state + (i >= 5 ? " is-weekend" : "")}
            >
              <DayHead date={day} dayIndex={i} state={state} />
            </div>
          );
        })}
        <div className="tm-cell tm-obj tm-lane-headcell">
          <WeeklyObjectiveHead weekNum={week.num} monday={week.monday} sunday={week.sunday} />
        </div>
      </div>

      {lanes.map((lane) => {
        const laneTasks = inLane(tasks, lane.key);
        return (
          <div key={lane.key} className="tm-row tm-lane" data-lane={lane.key}>
            <LaneLabel lane={lane} />
            {week.days.map((day, i) => {
              const iso = toISO(day);
              return (
                <DayColumn
                  key={iso}
                  date={day}
                  dayIndex={i}
                  state={dayStateOf(day, today)}
                  droppableId={cellId("day", iso, lane.key)}
                  showHead={false}
                  tasks={laneTasks.filter((t) => t.date === iso && !t.is_weekly_objective)}
                  onAdd={(date, text) => onAddTask(date, text, lane.projectId)}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onColorChange={onColorChange}
                  onEdit={onEdit}
                />
              );
            })}
            <WeeklyObjective
              weekNum={week.num}
              monday={week.monday}
              sunday={week.sunday}
              droppableId={cellId("week", mondayISO, lane.key)}
              showHead={false}
              tasks={laneTasks.filter((t) => t.is_weekly_objective)}
              isCurrent={week.isCurrent}
              onAdd={(monday, text) => onAddWeeklyTask(monday, text, lane.projectId)}
              onToggle={onToggle}
              onDelete={onDelete}
              onColorChange={onColorChange}
              onEdit={onEdit}
            />
          </div>
        );
      })}
    </div>
  );
}

export default WeekRow;
