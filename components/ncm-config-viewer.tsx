"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FileDiff, Pencil, Rocket } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CmdbDevice } from "@/lib/cmdb";
import { RULES, diffStats, formatTime, type ConfigVersion } from "@/lib/ncm-data";

export type Mode = "config" | "history" | "edit";

type Props = {
  device: CmdbDevice | null;
  initialMode?: Mode;
  versions: ConfigVersion[];
  onClose: () => void;
  onCompare: (device: string, to?: number) => void;
  onDeploy: (device: string, lines: string[], ref: string) => boolean;
};

export function NcmConfigViewer({ device, initialMode = "config", versions, onClose, onCompare, onDeploy }: Props) {
  return (
    <Dialog open={!!device} onOpenChange={open => !open && onClose()}>
      <DialogContent className="ncm-config-dialog sm:max-w-3xl">
        {device && <Workspace key={`${device.name}-${initialMode}`} device={device} initialMode={initialMode} versions={versions} onCompare={onCompare} onDeploy={onDeploy} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

const modes: { id: Mode; label: string }[] = [
  { id: "config", label: "Config" },
  { id: "history", label: "History" },
  { id: "edit", label: "Edit & deploy" },
];

function Workspace({ device, initialMode = "config", versions, onCompare, onDeploy, onClose }: Omit<Props, "device"> & { device: CmdbDevice }) {
  const latest = versions[versions.length - 1];
  const [mode, setMode] = useState<Mode>(initialMode);
  const [selected, setSelected] = useState(latest.number);
  const [copied, setCopied] = useState(false);
  const version = versions.find(item => item.number === selected) ?? latest;
  const text = version.lines.join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${device.name}-running-config-v${version.number}.cfg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const open = (number: number) => {
    setSelected(number);
    setMode("config");
  };

  const deployed = (number: number) => {
    setSelected(number);
    setMode("config");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{device.name} · running-config</DialogTitle>
        <DialogDescription>
          {device.ip} · {device.vendor} · {latest.lines.length} lines · {versions.length} versions
        </DialogDescription>
      </DialogHeader>
      <div className="ncm-mode-tabs" role="tablist" aria-label="Configuration workspace">
        {modes.map(item => (
          <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} onClick={() => setMode(item.id)}>{item.label}</button>
        ))}
      </div>

      {mode === "config" && (
        <>
          <div className="ncm-config-bar">
            <label>
              <span>Version</span>
              <select value={selected} onChange={event => setSelected(Number(event.target.value))} aria-label="Config version">
                {[...versions].reverse().map(item => (
                  <option key={item.number} value={item.number}>
                    v{item.number}{item.number === latest.number ? " (latest)" : ""} · {formatTime(item.at)}
                  </option>
                ))}
              </select>
            </label>
            <div className="ncm-config-actions">
              <button type="button" disabled={version.number === 1} onClick={() => onCompare(device.name, version.number)}><FileDiff size={13} />Compare with previous</button>
              <button type="button" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button>
              <button type="button" onClick={download}><Download size={13} />Download .cfg</button>
            </div>
          </div>
          <p className="ncm-config-meta">{version.author} · {version.source} · {version.ref}</p>
          <pre className="ncm-config-code" tabIndex={0} aria-label={`Configuration of ${device.name}, version ${version.number}`}>
            {version.lines.map((line, index) => (
              <span key={index}><i>{index + 1}</i>{line || " "}{"\n"}</span>
            ))}
          </pre>
        </>
      )}

      {mode === "history" && <History versions={versions} onView={open} onCompare={number => onCompare(device.name, number)} />}

      {mode === "edit" && (
        <Editor
          key={versions.length}
          device={device} base={latest}
          onDeploy={(lines, ref) => {
            const ok = onDeploy(device.name, lines, ref);
            if (ok) deployed(versions.length + 1);
            return ok;
          }}
          onCancel={onClose}
        />
      )}
    </>
  );
}

function History({ versions, onView, onCompare }: { versions: ConfigVersion[]; onView: (number: number) => void; onCompare: (number: number) => void }) {
  return (
    <div className="ncm-history" role="table" aria-label="Version history">
      <div className="ncm-history-row head" role="row">
        <span>Version</span><span>Time</span><span>Author</span><span>Source / reason</span><span>Lines</span><span />
      </div>
      {[...versions].reverse().map(item => {
        const stat = item.number > 1 ? diffStats(versions[item.number - 2].lines, item.lines) : null;
        return (
          <div className="ncm-history-row" role="row" key={item.number}>
            <span>v{item.number}</span>
            <span>{formatTime(item.at)}</span>
            <span>{item.author}</span>
            <span className={item.source === "Out-of-band" ? "ncm-source bad" : ""}>{item.source}<small>{item.ref}</small></span>
            <span>{stat ? <><b className="ncm-add">+{stat.added}</b> <b className="ncm-del">−{stat.removed}</b></> : "Baseline"}</span>
            <span className="ncm-actions nowrap">
              <button type="button" className="ncm-link" onClick={() => onView(item.number)}>View</button>
              <button type="button" className="ncm-link" disabled={item.number === 1} onClick={() => onCompare(item.number)}>Diff</button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Editor({ device, base, onDeploy, onCancel }: { device: CmdbDevice; base: ConfigVersion; onDeploy: (lines: string[], ref: string) => boolean; onCancel: () => void }) {
  const [draft, setDraft] = useState(base.lines.join("\n"));
  const [ticket, setTicket] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const lines = draft.replace(/\s+$/, "").split("\n");
  const stat = diffStats(base.lines, lines);
  const changed = stat.added + stat.removed > 0;
  const failing = RULES.filter(rule => !rule.check(lines));
  const ref = ticket.trim() || "Manual edit, no ticket";

  const deploy = () => {
    setDeploying(true);
    timer.current = window.setTimeout(() => {
      if (!onDeploy(lines, ref)) {
        setDeploying(false);
        setConfirming(false);
      }
    }, 1200);
  };

  return (
    <div className="ncm-editor">
      <p className="ncm-config-meta">Editing starts from the latest version v{base.number}. Deploying saves a new version and pushes it to the device over SSH.</p>
      <textarea
        className="ncm-editor-text" spellCheck={false} value={draft} disabled={deploying}
        aria-label={`Edit configuration of ${device.name}`} onChange={event => { setDraft(event.target.value); setConfirming(false); }}
      />
      <div className="ncm-editor-bar">
        <label>
          <span>Change ticket</span>
          <input value={ticket} placeholder="e.g. CHG-2051 (optional)" disabled={deploying} onChange={event => setTicket(event.target.value)} aria-label="Change ticket" />
        </label>
        <span className="ncm-diff-stats">
          {changed ? <><b className="ncm-add">+{stat.added}</b><b className="ncm-del">−{stat.removed}</b><span>vs v{base.number}</span></> : <span>No changes yet</span>}
        </span>
      </div>
      <div className={`ncm-editor-check${failing.length ? " bad" : ""}`}>
        {failing.length
          ? <><strong>{failing.length} compliance rule{failing.length === 1 ? "" : "s"} not met after this change</strong><span>{failing.map(rule => rule.title).join(" · ")}</span></>
          : <strong>Passes all {RULES.length} compliance rules</strong>}
      </div>
      {confirming ? (
        <div className="ncm-confirm">
          <span>
            Push {stat.added + stat.removed} changed line{stat.added + stat.removed === 1 ? "" : "s"} to {device.name} ({device.ip})?
            {failing.length > 0 && " The new version will not be compliant."}
          </span>
          <button type="button" className="ncm-primary" disabled={deploying} onClick={deploy}><Rocket size={13} />{deploying ? "Deploying…" : "Confirm deploy"}</button>
          <button type="button" className="sla-secondary" disabled={deploying} onClick={() => setConfirming(false)}>Back</button>
        </div>
      ) : (
        <div className="ncm-editor-actions">
          <button type="button" className="sla-secondary" disabled={!changed} onClick={() => setDraft(base.lines.join("\n"))}>Reset</button>
          <button type="button" className="sla-secondary" onClick={onCancel}>Close</button>
          <button type="button" className="ncm-primary" disabled={!changed} onClick={() => setConfirming(true)}><Pencil size={13} />Review & deploy</button>
        </div>
      )}
    </div>
  );
}
