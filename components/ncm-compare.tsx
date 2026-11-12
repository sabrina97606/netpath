"use client";

import { useMemo, useState } from "react";
import { GitCompare, Undo2 } from "lucide-react";
import type { CmdbDevice } from "@/lib/cmdb";
import { diffLines, diffStats, formatTime, passesAll, type ConfigVersion } from "@/lib/ncm-data";

export type CompareFocus = { device: string; from?: number; to?: number; stamp: number };

type Props = {
  devices: CmdbDevice[];
  versions: Record<string, ConfigVersion[]>;
  focus: CompareFocus;
  onRollback: (device: string, versionNumber: number) => void;
};

export function NcmCompare({ devices, versions, focus, onRollback }: Props) {
  const [device, setDevice] = useState(focus.device);
  const history = versions[device];
  const latest = history[history.length - 1];
  const [from, setFrom] = useState(focus.from ?? Math.max(1, latest.number - 1));
  const [to, setTo] = useState(focus.to ?? latest.number);
  const [confirming, setConfirming] = useState(false);

  const fromVersion = history.find(item => item.number === from) ?? history[0];
  const toVersion = history.find(item => item.number === to) ?? latest;
  const rows = useMemo(() => diffLines(fromVersion.lines, toVersion.lines), [fromVersion, toVersion]);
  const stats = diffStats(fromVersion.lines, toVersion.lines);
  const lastKnownGood = [...history].reverse().find(item => passesAll(item.lines));
  const canRollback = fromVersion.number !== latest.number;

  const changeDevice = (name: string) => {
    const list = versions[name];
    setDevice(name);
    setFrom(Math.max(1, list.length - 1));
    setTo(list.length);
    setConfirming(false);
  };
  const label = (item: ConfigVersion) =>
    `v${item.number} · ${formatTime(item.at)} · ${item.source}${item === lastKnownGood ? " · last known good" : ""}`;

  return (
    <section className="sla-panel ncm-panel">
      <div className="sla-panel-title">
        <h3><GitCompare size={15} />Configuration comparison and rollback</h3>
        <span>{history.length} versions stored · latest v{latest.number}</span>
      </div>
      <div className="sla-filters">
        <select aria-label="Device" value={device} onChange={event => changeDevice(event.target.value)}>
          {devices.map(item => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
        <select aria-label="Left version" value={fromVersion.number} onChange={event => { setFrom(Number(event.target.value)); setConfirming(false); }}>
          {history.map(item => <option key={item.number} value={item.number}>{label(item)}</option>)}
        </select>
        <span className="sla-count">compared with</span>
        <select aria-label="Right version" value={toVersion.number} onChange={event => { setTo(Number(event.target.value)); setConfirming(false); }}>
          {history.map(item => <option key={item.number} value={item.number}>{label(item)}</option>)}
        </select>
        <span className="ncm-diff-stats"><b className="ncm-add">+{stats.added}</b><b className="ncm-del">−{stats.removed}</b></span>
        <div className="sla-push-right ncm-actions">
          {lastKnownGood && lastKnownGood.number !== latest.number && (
            <button type="button" className="sla-secondary" onClick={() => { setFrom(lastKnownGood.number); setTo(latest.number); setConfirming(false); }}>
              Show last known good (v{lastKnownGood.number})
            </button>
          )}
          <button type="button" className="ncm-primary" disabled={!canRollback} onClick={() => setConfirming(true)}>
            <Undo2 size={13} />Roll back to v{fromVersion.number}
          </button>
        </div>
      </div>

      {confirming && (
        <div className="ncm-confirm" role="alertdialog" aria-label="Confirm rollback">
          <span>
            Push <b>v{fromVersion.number}</b> ({fromVersion.ref}) to <b>{device}</b>? A new version v{latest.number + 1} is created, so this rollback can itself be reversed.
          </span>
          <button type="button" className="ncm-primary" onClick={() => { onRollback(device, fromVersion.number); setConfirming(false); setFrom(latest.number); setTo(latest.number + 1); }}>Confirm rollback</button>
          <button type="button" className="sla-secondary" onClick={() => setConfirming(false)}>Cancel</button>
        </div>
      )}

      <div className="ncm-diff" role="table" aria-label={`Differences between v${fromVersion.number} and v${toVersion.number}`}>
        <div className="ncm-diff-head" role="row">
          <div role="columnheader">v{fromVersion.number} · {fromVersion.author} · {fromVersion.ref}</div>
          <div role="columnheader">v{toVersion.number} · {toVersion.author} · {toVersion.ref}</div>
        </div>
        {rows.map((row, index) => (
          <div key={index} className={`ncm-diff-row ${row.type}`} role="row">
            <div className={`ncm-diff-cell${row.left === undefined ? " blank" : ""}${row.type === "del" || row.type === "mod" ? " removed" : ""}`} role="cell">
              <i>{row.leftNo}</i><code>{row.left}</code>
            </div>
            <div className={`ncm-diff-cell${row.right === undefined ? " blank" : ""}${row.type === "add" || row.type === "mod" ? " added" : ""}`} role="cell">
              <i>{row.rightNo}</i><code>{row.right}</code>
            </div>
          </div>
        ))}
        {!stats.added && !stats.removed && <div className="sla-empty">The two versions are identical</div>}
      </div>

      <div className="sla-panel-title"><h3>Version history</h3><span>Select a row to compare it with the latest version</span></div>
      <div className="ncm-history">
        {[...history].reverse().map(item => (
          <button
            key={item.number} type="button"
            className={item.number === fromVersion.number ? "active" : ""}
            onClick={() => { setFrom(item.number); setTo(latest.number); setConfirming(false); }}
          >
            <b>v{item.number}</b><span>{formatTime(item.at)}</span><span>{item.author}</span>
            <span className={`ncm-source${item.source === "Out-of-band" ? " bad" : ""}`}>{item.source}</span>
            <span>{item.ref}</span>
            {item === lastKnownGood && <em>Last known good</em>}
          </button>
        ))}
      </div>
    </section>
  );
}
