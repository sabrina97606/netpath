"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { PathSnapshot } from "@/lib/network-path-model";
import type { TimelineSlot } from "@/lib/network-path-timeline";

type Props = {
  history: PathSnapshot[];
  slots: TimelineSlot[];
  slotLabel: (index: number) => string;
  initialA: number;
  initialB: number;
  onClose: () => void;
};

type HopChange = {
  id: string;
  label: string;
  kind: "added" | "removed" | "slower" | "faster";
  detail: string;
};

const LATENCY_DELTA_THRESHOLD = 5;

function formatMs(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${Math.round(value)} ms`;
}

function formatDelta(a: number, b: number, unit: string) {
  const delta = b - a;
  if (Math.abs(delta) < 0.05) return "no change";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${Math.round(delta * 10) / 10}${unit}`;
}

function diffSnapshots(a: PathSnapshot, b: PathSnapshot): HopChange[] {
  const hopsA = new Map(a.hops.map((hop) => [hop.id, hop]));
  const hopsB = new Map(b.hops.map((hop) => [hop.id, hop]));
  const changes: HopChange[] = [];

  for (const [id, hop] of hopsB) {
    if (!hopsA.has(id)) {
      changes.push({
        id,
        label: hop.label,
        kind: "added",
        detail: `New hop in path${hop.asn ? ` (${hop.asn})` : ""}`,
      });
    }
  }
  for (const [id, hop] of hopsA) {
    if (!hopsB.has(id)) {
      changes.push({
        id,
        label: hop.label,
        kind: "removed",
        detail: "No longer in path",
      });
    }
  }
  for (const [id, hopB] of hopsB) {
    const hopA = hopsA.get(id);
    if (!hopA || hopA.latency === null || hopB.latency === null) continue;
    const delta = hopB.latency - hopA.latency;
    if (Math.abs(delta) < LATENCY_DELTA_THRESHOLD) continue;
    changes.push({
      id,
      label: hopB.label,
      kind: delta > 0 ? "slower" : "faster",
      detail: `${formatMs(hopA.latency)} -> ${formatMs(hopB.latency)} (${delta > 0 ? "+" : ""}${Math.round(delta)} ms)`,
    });
  }
  return changes;
}

const KIND_LABEL: Record<HopChange["kind"], string> = {
  added: "Added",
  removed: "Removed",
  slower: "Slower",
  faster: "Faster",
};

export function PathCompare({
  history,
  slots,
  slotLabel,
  initialA,
  initialB,
  onClose,
}: Props) {
  const [indexA, setIndexA] = useState(initialA);
  const [indexB, setIndexB] = useState(initialB);
  const options = useMemo(
    () => slots.filter((slot) => !slot.missing).map((slot) => slot.index),
    [slots],
  );
  const snapshotA = history[indexA];
  const snapshotB = history[indexB];
  const changes = useMemo(
    () => (snapshotA && snapshotB ? diffSnapshots(snapshotA, snapshotB) : []),
    [snapshotA, snapshotB],
  );

  const select = (label: string, value: number, onChange: (n: number) => void) => (
    <label className="npd-compare-field">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((index) => (
          <option key={index} value={index}>
            {slotLabel(index)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="npd-compare-panel" aria-label="Compare path snapshots">
      <header className="npd-compare-head">
        <h2>Compare path</h2>
        {select("Baseline", indexA, setIndexA)}
        {select("Compare to", indexB, setIndexB)}
        <button
          className="npd-compare-close"
          aria-label="Close compare"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </header>
      {snapshotA && snapshotB && (
        <div className="npd-compare-body">
          <dl className="npd-compare-metrics">
            <div>
              <dt>End-to-end latency</dt>
              <dd>
                {formatMs(snapshotA.rtt)} {"->"} {formatMs(snapshotB.rtt)}
                <em>{formatDelta(snapshotA.rtt ?? 0, snapshotB.rtt ?? 0, " ms")}</em>
              </dd>
            </div>
            <div>
              <dt>Packet loss</dt>
              <dd>
                {snapshotA.loss}% {"->"} {snapshotB.loss}%
                <em>{formatDelta(snapshotA.loss, snapshotB.loss, "%")}</em>
              </dd>
            </div>
            <div>
              <dt>Hops</dt>
              <dd>
                {snapshotA.hops.length} {"->"} {snapshotB.hops.length}
                <em>
                  {formatDelta(snapshotA.hops.length, snapshotB.hops.length, "")}
                </em>
              </dd>
            </div>
          </dl>
          {changes.length === 0 ? (
            <p className="npd-compare-empty">
              The two snapshots follow the same path with no significant
              latency change.
            </p>
          ) : (
            <ul className="npd-compare-list">
              {changes.map((change) => (
                <li key={`${change.kind}-${change.id}`}>
                  <span className={`npd-compare-tag ${change.kind}`}>
                    {KIND_LABEL[change.kind]}
                  </span>
                  <strong>{change.label}</strong>
                  <span>{change.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
