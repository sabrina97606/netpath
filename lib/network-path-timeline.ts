export type TimelineSlot = {
  index: number;
  start: number;
  end: number;
  missing: boolean;
};
export type TimelineBrush = { from: number; to: number };
export type TimelineTick = { time: number; fraction: number; label: string };

const HK_OFFSET = 8 * 3600000;
const MISSING_SAMPLES = new Set([58, 59, 60, 61, 62, 63]);
const DAY = 24 * 3600000;

type TickStep =
  | { kind: "fixed"; size: number }
  | { kind: "day"; every: number; size: number }
  | { kind: "week"; size: number }
  | { kind: "month"; every: number; size: number }
  | { kind: "year"; size: number };

const TICK_STEPS: TickStep[] = [
  ...[1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720].map(
    (minutes): TickStep => ({ kind: "fixed", size: minutes * 60000 }),
  ),
  { kind: "day", every: 1, size: DAY },
  { kind: "day", every: 2, size: 2 * DAY },
  { kind: "week", size: 7 * DAY },
  { kind: "month", every: 1, size: 30 * DAY },
  { kind: "month", every: 3, size: 91 * DAY },
  { kind: "year", size: 365 * DAY },
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * 探测间隔并不严格相等，且存在无数据的时段，
 * 所以每个采样占据的时间宽度各不相同（与真实时间戳成正比）。
 */
export function buildTimelineSlots(count = 144): TimelineSlot[] {
  const weights = Array.from({ length: count }, (_, index) => {
    const noise = Math.abs(Math.sin((index + 1) * 12.9898) * 43758.5453) % 1;
    return 0.55 + noise * 0.9;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  return weights.map((weight, index) => {
    const start = cursor / total;
    cursor += weight;
    return {
      index,
      start,
      end: cursor / total,
      missing: MISSING_SAMPLES.has(index),
    };
  });
}

export function slotAtFraction(slots: TimelineSlot[], fraction: number) {
  return (
    slots.find((slot) => fraction >= slot.start && fraction < slot.end) ??
    slots[slots.length - 1]
  );
}

export function slotCenter(slot: TimelineSlot) {
  return (slot.start + slot.end) / 2;
}

function formatTickLabel(time: number) {
  const local = new Date(time + HK_OFFSET);
  const isMidnight = local.getUTCHours() === 0 && local.getUTCMinutes() === 0;
  if (!isMidnight) {
    const hours = String(local.getUTCHours()).padStart(2, "0");
    const minutes = String(local.getUTCMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }
  if (local.getUTCMonth() === 0 && local.getUTCDate() === 1) {
    return String(local.getUTCFullYear());
  }
  if (local.getUTCDate() === 1) return MONTHS[local.getUTCMonth()];
  if (local.getUTCDay() === 0) {
    return `${SHORT_MONTHS[local.getUTCMonth()]} ${local.getUTCDate()}`;
  }
  return `${WEEKDAYS[local.getUTCDay()]} ${local.getUTCDate()}`;
}

/**
 * 刻度按日历边界（UTC+08:00）生成：「每 N 天」取的是每月的 1、3、5… 号，
 * 每个月重新开始，所以月末到月初之间的间距可能比常规步长短（例如 31 日 → 1 日只隔 1 天）。
 * 其余位置的间距都由真实时间决定，并不是把区间平均切成 N 份。
 */
export function buildTicks(start: number, end: number, maxTicks = 16) {
  const span = end - start;
  const step =
    TICK_STEPS.find((candidate) => span / candidate.size <= maxTicks) ??
    TICK_STEPS[TICK_STEPS.length - 1];
  const startLocal = start + HK_OFFSET;
  const endLocal = end + HK_OFFSET;
  const locals: number[] = [];

  if (step.kind === "fixed") {
    for (
      let time = Math.ceil(startLocal / step.size) * step.size;
      time <= endLocal;
      time += step.size
    ) {
      locals.push(time);
    }
  } else if (step.kind === "day" || step.kind === "week") {
    for (
      let time = Math.ceil(startLocal / DAY) * DAY;
      time <= endLocal;
      time += DAY
    ) {
      const date = new Date(time);
      const matches =
        step.kind === "week"
          ? date.getUTCDay() === 0
          : (date.getUTCDate() - 1) % step.every === 0;
      if (matches) locals.push(time);
    }
  } else {
    const cursor = new Date(startLocal);
    let year = cursor.getUTCFullYear();
    let month = step.kind === "year" ? 0 : cursor.getUTCMonth();
    while (Date.UTC(year, month, 1) <= endLocal) {
      const time = Date.UTC(year, month, 1);
      const matches =
        step.kind === "year" ? month === 0 : month % step.every === 0;
      if (matches && time >= startLocal) locals.push(time);
      if (step.kind === "year") {
        year += 1;
      } else {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
    }
  }

  return locals.map((local): TimelineTick => {
    const time = local - HK_OFFSET;
    return { time, fraction: (time - start) / span, label: formatTickLabel(time) };
  });
}
