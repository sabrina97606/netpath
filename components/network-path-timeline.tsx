"use client";

import { useMemo, useRef, useState } from "react";
import type { PathSnapshot } from "@/lib/network-path-model";
import { useNpI18n } from "@/lib/network-path-i18n";
import {
  buildTicks,
  slotAtFraction,
  slotCenter,
  type TimelineBrush,
  type TimelineSlot,
} from "@/lib/network-path-timeline";

type Props = {
  history: PathSnapshot[];
  slots: TimelineSlot[];
  start: number;
  end: number;
  selectedIndex: number | null;
  brush: TimelineBrush | null;
  formatTime: (timestamp: number) => string;
  onSelect: (index: number) => void;
  onBrush: (brush: TimelineBrush, commit: boolean) => void;
};

type DragState = {
  mode: "new" | "from" | "to" | "move";
  anchor: number;
  origin: TimelineBrush;
  moved: boolean;
  latest: TimelineBrush | null;
};

const MIN_BRUSH = 0.012;
const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

function latencyColor(snapshot: PathSnapshot) {
  if (snapshot.reach === 0) return "#f5576c";
  if (snapshot.phase === "degraded") return "#f5a623";
  return "#7ed9a0";
}

function reachColor(snapshot: PathSnapshot) {
  if (snapshot.reach === 0) return "#f5576c";
  if (snapshot.loss > 0) return "#f5a623";
  return "#7ed9a0";
}

export function PathTimeline({
  history,
  slots,
  start,
  end,
  selectedIndex,
  brush,
  formatTime,
  onSelect,
  onBrush,
}: Props) {
  const { t, isZh } = useNpI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const duration = end - start;
  const ticks = useMemo(() => buildTicks(start, end), [start, end]);

  const fractionAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return clamp((clientX - rect.left) / rect.width);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    const fraction = fractionAt(event.clientX);
    const part = target.dataset.part;
    const mode =
      part === "from" || part === "to" || part === "move" ? part : "new";
    drag.current = {
      mode,
      anchor: fraction,
      origin: brush ?? { from: fraction, to: fraction },
      moved: mode !== "new",
      latest: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHover(null);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const fraction = fractionAt(event.clientX);
    const state = drag.current;
    if (!state) {
      setHover(fraction);
      return;
    }
    const width = trackRef.current?.getBoundingClientRect().width ?? 1;
    if (Math.abs(fraction - state.anchor) * width > 3) state.moved = true;
    if (!state.moved) return;

    let next: TimelineBrush;
    if (state.mode === "from") {
      next = {
        from: Math.min(fraction, state.origin.to - MIN_BRUSH),
        to: state.origin.to,
      };
    } else if (state.mode === "to") {
      next = {
        from: state.origin.from,
        to: Math.max(fraction, state.origin.from + MIN_BRUSH),
      };
    } else if (state.mode === "move") {
      const size = state.origin.to - state.origin.from;
      const from = clamp(
        state.origin.from + fraction - state.anchor,
        0,
        1 - size,
      );
      next = { from, to: from + size };
    } else {
      const from = Math.min(state.anchor, fraction);
      const to = Math.max(state.anchor, fraction);
      next =
        to - from < MIN_BRUSH
          ? { from, to: Math.min(1, from + MIN_BRUSH) }
          : { from, to };
    }
    next = { from: clamp(next.from), to: clamp(next.to) };
    state.latest = next;
    onBrush(next, false);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!state) return;
    if (state.moved && state.latest) {
      onBrush(state.latest, true);
      return;
    }
    if (state.mode === "new") {
      const slot = slotAtFraction(slots, fractionAt(event.clientX));
      if (!slot.missing) onSelect(slot.index);
    }
  };

  const nudge = (part: "from" | "to", direction: -1 | 1) => {
    if (!brush) return;
    const step = 0.01 * direction;
    const next =
      part === "from"
        ? {
            from: clamp(brush.from + step, 0, brush.to - MIN_BRUSH),
            to: brush.to,
          }
        : {
            from: brush.from,
            to: clamp(brush.to + step, brush.from + MIN_BRUSH, 1),
          };
    onBrush(next, true);
  };

  const hoverSlot = hover === null ? null : slotAtFraction(slots, hover);
  const hoverSnapshot = hoverSlot ? history[hoverSlot.index] : null;
  const selectedSlot = selectedIndex === null ? null : slots[selectedIndex];

  return (
    <div className="npd-tl">
      <div className="npd-tl-rows">
        <div className="npd-tl-labels" aria-hidden="true">
          <span>{t("Latency")}</span>
          <span>{t("Reachability")}</span>
        </div>
        <div
          ref={trackRef}
          className="npd-tl-track"
          role="group"
          aria-label={t("Latency and reachability history. Click to pick a snapshot, drag to select a time range.")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => {
            if (!drag.current) setHover(null);
          }}
        >
          {(["latency", "reach"] as const).map((row) => (
            <div className="npd-tl-row" key={row} aria-hidden="true">
              {slots.map((slot) => (
                <i
                  key={slot.index}
                  className={slot.missing ? "missing" : undefined}
                  style={{
                    left: `${slot.start * 100}%`,
                    width: `${(slot.end - slot.start) * 100}%`,
                    background: slot.missing
                      ? undefined
                      : row === "latency"
                        ? latencyColor(history[slot.index])
                        : reachColor(history[slot.index]),
                  }}
                />
              ))}
            </div>
          ))}
          {selectedSlot && !brush && (
            <span
              className="npd-tl-marker"
              style={{ left: `${slotCenter(selectedSlot) * 100}%` }}
              aria-hidden="true"
            />
          )}
          {brush && (
            <div
              className="npd-tl-brush"
              style={{
                left: `${brush.from * 100}%`,
                width: `${(brush.to - brush.from) * 100}%`,
              }}
            >
              <span data-part="move" className="npd-tl-brush-body" />
              {(["from", "to"] as const).map((part) => (
                <button
                  key={part}
                  type="button"
                  data-part={part}
                  role="slider"
                  className={`npd-tl-handle ${part}`}
                  aria-label={t(part === "from" ? "Range start" : "Range end")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(brush[part] * 100)}
                  aria-valuetext={formatTime(start + brush[part] * duration)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowLeft") {
                      event.preventDefault();
                      nudge(part, -1);
                    } else if (event.key === "ArrowRight") {
                      event.preventDefault();
                      nudge(part, 1);
                    }
                  }}
                >
                  <b aria-hidden="true" />
                </button>
              ))}
            </div>
          )}
          {hoverSlot && hoverSnapshot && hover !== null && (
            <div
              className="npd-tl-tooltip"
              style={{ left: `${hover * 100}%` }}
              role="presentation"
            >
              <strong>{formatTime(start + hover * duration)}</strong>
              {hoverSlot.missing ? (
                <span>{t("No data collected")}</span>
              ) : (
                <span>
                  {hoverSnapshot.rtt === null
                    ? t("RTT N/A")
                    : `${hoverSnapshot.rtt} ms`}{" "}
                  · {isZh ? "丢包" : "loss"} {hoverSnapshot.loss}%
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="npd-tl-axis" aria-hidden="true">
        {ticks.map((tick) => (
          <span
            key={tick.time}
            style={{ left: `${tick.fraction * 100}%` }}
            className={/^[A-Z][a-z]{3,}$/.test(tick.label) ? "month" : ""}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}
