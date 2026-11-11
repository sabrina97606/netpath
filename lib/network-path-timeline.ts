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
const TICK_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880].map(
  (minutes) => minutes * 60000,
);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  if (local.getUTCDate() === 1) return MONTHS[local.getUTCMonth()];
  return `${WEEKDAYS[local.getUTCDay()]} ${local.getUTCDate()}`;
}

/**
 * 刻度对齐到「整点 / 整日 / 月初」等日历边界（UTC+08:00），
 * 因此刻度之间的间距由真实时间决定，而不是把区间平均切成 N 份。
 */
export function buildTicks(start: number, end: number, maxTicks = 9) {
  const span = end - start;
  const step =
    TICK_STEPS.find((candidate) => span / candidate <= maxTicks) ??
    TICK_STEPS[TICK_STEPS.length - 1];
  const first = Math.ceil((start + HK_OFFSET) / step) * step - HK_OFFSET;
  const ticks: TimelineTick[] = [];
  for (let time = first; time <= end; time += step) {
    ticks.push({
      time,
      fraction: (time - start) / span,
      label: formatTickLabel(time),
    });
  }
  const monthStart = new Date(start + HK_OFFSET);
  monthStart.setUTCHours(0, 0, 0, 0);
  if (step >= 1440 * 60000) {
    const cursor = new Date(monthStart);
    cursor.setUTCDate(1);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    while (cursor.getTime() - HK_OFFSET <= end) {
      const time = cursor.getTime() - HK_OFFSET;
      if (!ticks.some((tick) => tick.time === time)) {
        ticks.push({
          time,
          fraction: (time - start) / span,
          label: formatTickLabel(time),
        });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    ticks.sort((a, b) => a.time - b.time);
  }
  return ticks;
}
