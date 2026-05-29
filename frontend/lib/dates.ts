export function getMonthRange(yearMonth: string): { start: string; end: string } {
  const [year, month] = yearMonth.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  // Expand to full ISO weeks (Mon–Sun)
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));

  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + ((7 - lastDay.getDay()) % 7 || 7) - 1);

  return { start: toISO(start), end: toISO(end) };
}

export function getWeeksInMonth(yearMonth: string): Date[][] {
  const { start, end } = getMonthRange(yearMonth);
  const weeks: Date[][] = [];
  const cur = new Date(start);
  const endDate = new Date(end);

  while (cur <= endDate) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getMondayOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return copy;
}

export function formatWeekHeader(week: Date[]): string {
  const monday = week[0];
  const sunday = week[6];
  const isoWeek = getISOWeek(monday);

  const fmt = (d: Date) =>
    `${d.getDate()}. ${d.toLocaleDateString("de-DE", { month: "short" })}`;

  return `KW ${isoWeek}  •  ${fmt(monday)} – ${fmt(sunday)} ${sunday.getFullYear()}`;
}

export function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatDayHeader(d: Date): string {
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function isToday(d: Date): boolean {
  const now = new Date();
  return toISO(d) === toISO(now);
}

export function isPast(d: Date): boolean {
  return toISO(d) < toISO(new Date());
}

export function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

export function addMonths(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
