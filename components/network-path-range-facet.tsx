"use client";

import { useState } from "react";
import { useNpI18n } from "@/lib/network-path-i18n";

export type Range = [number, number];

type Props = {
  label: string;
  bounds: Range;
  value: Range;
  onChange: (next: Range) => void;
};

const clamp = (n: number, low: number, high: number) =>
  Math.min(Math.max(n, low), high);

export function RangeFacet({ label, bounds, value, onChange }: Props) {
  const { t } = useNpI18n();
  const [min, max] = bounds;
  const [low, high] = value;
  const [draftLow, setDraftLow] = useState<string | null>(null);
  const [draftHigh, setDraftHigh] = useState<string | null>(null);
  const span = Math.max(max - min, 1);
  const lowPercent = ((low - min) / span) * 100;
  const highPercent = ((high - min) / span) * 100;
  const lowOnTop = low > min + span / 2;

  const commitLow = () => {
    const parsed = Number(draftLow);
    if (draftLow !== null && draftLow.trim() !== "" && !Number.isNaN(parsed))
      onChange([clamp(parsed, min, high), high]);
    setDraftLow(null);
  };
  const commitHigh = () => {
    const parsed = Number(draftHigh);
    if (draftHigh !== null && draftHigh.trim() !== "" && !Number.isNaN(parsed))
      onChange([low, clamp(parsed, low, max)]);
    setDraftHigh(null);
  };
  const submitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing)
      event.currentTarget.blur();
  };

  return (
    <div className="np-range">
      <div className="np-range-inputs">
        <label>
          <span>{t("Min")}</span>
          <input
            inputMode="numeric"
            aria-label={`${t(label)} ${t("Min")}`}
            value={draftLow ?? String(low)}
            onChange={(event) => setDraftLow(event.target.value)}
            onBlur={commitLow}
            onKeyDown={submitOnEnter}
          />
        </label>
        <label>
          <span>{t("Max")}</span>
          <input
            inputMode="numeric"
            aria-label={`${t(label)} ${t("Max")}`}
            value={draftHigh ?? String(high)}
            onChange={(event) => setDraftHigh(event.target.value)}
            onBlur={commitHigh}
            onKeyDown={submitOnEnter}
          />
        </label>
      </div>
      <div className="np-range-slider">
        <div className="np-range-track" />
        <div
          className="np-range-fill"
          style={{ left: `${lowPercent}%`, width: `${highPercent - lowPercent}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={low}
          aria-label={`${t(label)} ${t("Min")}`}
          style={{ zIndex: lowOnTop ? 4 : 3 }}
          onChange={(event) =>
            onChange([Math.min(Number(event.target.value), high), high])
          }
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={high}
          aria-label={`${t(label)} ${t("Max")}`}
          style={{ zIndex: lowOnTop ? 3 : 4 }}
          onChange={(event) =>
            onChange([low, Math.max(Number(event.target.value), low)])
          }
        />
      </div>
    </div>
  );
}
