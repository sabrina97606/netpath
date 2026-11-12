"use client";

import { useMemo, useState } from "react";
import { BellRing, DatabaseBackup, FileDiff, FileText, History, RefreshCw, Search, TerminalSquare, X } from "lucide-react";
import { NcmConfigViewer, type Mode } from "@/components/ncm-config-viewer";
import { NcmBulkScripts, NcmJobHistory } from "@/components/ncm-automation";
import { NcmAlertSettings, type AlertConfig, type ChangeEvent } from "@/components/ncm-changes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CmdbDevice } from "@/lib/cmdb";
import { formatTime, relativeTime, siteOf, type BackupInfo, type ConfigVersion, type Job } from "@/lib/ncm-data";

const statusColor = { Success: "#25a77a", Failed: "#e05a60", Running: "#409eff" } as const;

type Props = {
  devices: CmdbDevice[];
  backups: Record<string, BackupInfo>;
  versions: Record<string, ConfigVersion[]>;
  events: ChangeEvent[];
  acked: Record<string, boolean>;
  jobs: Job[];
  alerts: AlertConfig;
  status: string;
  now: number;
  onStatus: (status: string) => void;
  onBackup: (names: string[]) => void;
  onCompare: (name: string, to?: number) => void;
  onDeploy: (device: string, lines: string[], ref: string) => boolean;
  onRunScript: (scriptId: string, targets: string[]) => void;
  onAck: (keys: string[]) => void;
  onAlerts: (next: AlertConfig) => void;
  onSimulate: () => void;
};

export function NcmBackups({
  devices, backups, versions, events, acked, jobs, alerts, status, now,
  onStatus, onBackup, onCompare, onDeploy, onRunScript, onAck, onAlerts, onSimulate,
}: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [viewing, setViewing] = useState<{ device: CmdbDevice; mode: Mode } | null>(null);
  const [scriptOpen, setScriptOpen] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const lastChange = useMemo(() => {
    const latest: Record<string, ChangeEvent> = {};
    for (const event of events) if (!latest[event.device]) latest[event.device] = event;
    return latest;
  }, [events]);
  const pendingKeys = (name: string) => events.filter(event => event.device === name && !event.authorized && !acked[event.key]).map(event => event.key);

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return devices.filter(item => {
      if (status === "changed") { if (!events.some(event => event.device === item.name && !event.authorized && !acked[event.key])) return false; }
      else if (status !== "all" && backups[item.name].status !== status) return false;
      return !text || `${item.name} ${item.ip} ${item.vendor} ${siteOf(item.name)}`.toLowerCase().includes(text);
    });
  }, [devices, backups, events, acked, query, status]);

  const failed = devices.filter(item => backups[item.name].status === "Failed").map(item => item.name);
  const allShown = rows.length > 0 && rows.every(item => selected.includes(item.name));
  const busy = jobs.some(job => job.status === "Running");
  const toggle = (name: string) => setSelected(previous => previous.includes(name) ? previous.filter(item => item !== name) : [...previous, name]);
  const toggleAll = () => setSelected(previous => allShown
    ? previous.filter(name => !rows.some(item => item.name === name))
    : [...new Set([...previous, ...rows.map(item => item.name)])]);

  return (
    <section className="sla-panel ncm-panel">
      <div className="sla-panel-title">
        <h3><DatabaseBackup size={15} />Device configurations</h3>
        <span>One row per configuration file · SSH first, Telnet fallback · 90 versions retained</span>
      </div>
      <div className="ncm-policy-strip">
        <div><span>Switches</span><strong>Daily 02:00</strong></div>
        <div><span>Firewalls</span><strong>Every 6 hours</strong></div>
        <div><span>On change</span><strong>Syslog trigger, backup within 1 min</strong></div>
        <div><span>Storage</span><strong>Encrypted, versioned, hash-verified</strong></div>
      </div>
      <div className="sla-filters">
        <label className="sla-search">
          <Search size={13} />
          <input aria-label="Search devices" placeholder="Search device, IP, vendor or site" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <select aria-label="Backup status" value={status} onChange={event => onStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
          <option value="Running">Running</option>
          <option value="changed">Unauthorized change</option>
        </select>
        <span className="sla-count">{rows.length} of {devices.length} devices</span>
        <div className="sla-push-right ncm-actions">
          <button type="button" className="sla-secondary" onClick={() => setAlertsOpen(true)}><BellRing size={13} />Alert settings</button>
          <button type="button" className="sla-secondary" onClick={() => setJobsOpen(true)}><History size={13} />Job history ({jobs.length})</button>
          <button type="button" className="sla-secondary" disabled={!failed.length} onClick={() => onBackup(failed)}>Retry failed ({failed.length})</button>
          <button type="button" className="ncm-primary" onClick={() => onBackup(devices.map(item => item.name))}><RefreshCw size={13} />Back up all now</button>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="ncm-bulk-bar" role="region" aria-label="Bulk actions">
          <b>{selected.length} selected</b>
          <button type="button" className="sla-secondary" onClick={() => { onBackup(selected); setSelected([]); }}><RefreshCw size={13} />Back up now</button>
          <button type="button" className="ncm-primary" onClick={() => setScriptOpen(true)}><TerminalSquare size={13} />Run script or deploy</button>
          <button type="button" className="ncm-link" onClick={() => setSelected([])}><X size={12} />Clear</button>
        </div>
      )}
      <div className="ncm-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="ncm-select-col"><input type="checkbox" aria-label="Select all shown devices" checked={allShown} onChange={toggleAll} /></TableHead>
              <TableHead>Device</TableHead><TableHead>Vendor / model</TableHead><TableHead>Site</TableHead>
              <TableHead>Protocol</TableHead><TableHead>Schedule</TableHead><TableHead>Last backup</TableHead>
              <TableHead>Status</TableHead><TableHead>Versions</TableHead><TableHead>Last change</TableHead><TableHead className="ncm-sticky-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(item => {
              const backup = backups[item.name];
              const pending = pendingKeys(item.name);
              return (
                <TableRow key={item.name} data-state={selected.includes(item.name) ? "selected" : undefined}>
                  <TableCell className="ncm-select-col"><input type="checkbox" aria-label={`Select ${item.name}`} checked={selected.includes(item.name)} onChange={() => toggle(item.name)} /></TableCell>
                  <TableCell>{item.name}<small>{item.ip}</small></TableCell>
                  <TableCell>{item.vendor}<small>{item.type === "firewall" ? "Firewall" : "Switch"}</small></TableCell>
                  <TableCell>{siteOf(item.name)}</TableCell>
                  <TableCell>{backup.protocol}</TableCell>
                  <TableCell>{backup.schedule}</TableCell>
                  <TableCell>{formatTime(backup.at)}<small>{relativeTime(backup.at, now)}</small></TableCell>
                  <TableCell>
                    <span className="sla-badge"><span style={{ background: statusColor[backup.status] }} />{backup.status}</span>
                    {backup.error && <small className="ncm-error">{backup.error}</small>}
                  </TableCell>
                  <TableCell>v{versions[item.name].length}</TableCell>
                  <TableCell>
                    {lastChange[item.name] ? (
                      <>
                        {pending.length
                          ? (
                            <div className="ncm-actions nowrap">
                              <button type="button" className="ncm-link ncm-flag" onClick={() => setViewing({ device: item, mode: "history" })}><span className="ncm-dot" />Unauthorized</button>
                              <button type="button" className="ncm-link" onClick={() => onAck(pending)}>Acknowledge</button>
                            </div>
                          )
                          : <span className="sla-badge"><span style={{ background: "#25a77a" }} />{lastChange[item.name].authorized ? "Authorized" : "Acknowledged"}</span>}
                        <small>{formatTime(lastChange[item.name].at)}</small>
                      </>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="ncm-sticky-end">
                    <div className="ncm-actions nowrap">
                      <button type="button" className="ncm-link" disabled={backup.status === "Running"} onClick={() => onBackup([item.name])}>Back up now</button>
                      <button type="button" className="ncm-link" onClick={() => setViewing({ device: item, mode: "config" })}><FileText size={12} />View config</button>
                      <button type="button" className="ncm-link" onClick={() => onCompare(item.name)}><FileDiff size={12} />Compare</button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!rows.length && <div className="sla-empty">No devices match the current filters</div>}
      </div>
      <NcmConfigViewer
        device={viewing?.device ?? null} initialMode={viewing?.mode} versions={viewing ? versions[viewing.device.name] : []} onClose={() => setViewing(null)}
        onCompare={(name, to) => { setViewing(null); onCompare(name, to); }} onDeploy={onDeploy}
      />
      <NcmBulkScripts
        open={scriptOpen} targets={selected} busy={busy} onClose={() => setScriptOpen(false)}
        onRun={scriptId => { onRunScript(scriptId, selected); setScriptOpen(false); setSelected([]); }}
      />
      <NcmJobHistory open={jobsOpen} jobs={jobs} onClose={() => setJobsOpen(false)} />
      <NcmAlertSettings
        open={alertsOpen} alerts={alerts} onAlerts={onAlerts} onClose={() => setAlertsOpen(false)}
        onSimulate={() => { setAlertsOpen(false); onSimulate(); }}
      />
    </section>
  );
}
