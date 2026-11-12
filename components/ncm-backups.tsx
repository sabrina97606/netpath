"use client";

import { useMemo, useState } from "react";
import { DatabaseBackup, FileDiff, FileText, RefreshCw, Search } from "lucide-react";
import { NcmConfigViewer } from "@/components/ncm-config-viewer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CmdbDevice } from "@/lib/cmdb";
import { formatTime, relativeTime, siteOf, type BackupInfo, type ConfigVersion } from "@/lib/ncm-data";
import type { ChangeEvent } from "@/components/ncm-changes";

const statusColor = { Success: "#25a77a", Failed: "#e05a60", Running: "#409eff" } as const;

type Props = {
  devices: CmdbDevice[];
  backups: Record<string, BackupInfo>;
  versions: Record<string, ConfigVersion[]>;
  events: ChangeEvent[];
  acked: Record<string, boolean>;
  now: number;
  onBackup: (names: string[]) => void;
  onCompare: (name: string, to?: number) => void;
  onDeploy: (device: string, lines: string[], ref: string) => boolean;
  onShowChanges: () => void;
};

export function NcmBackups({ devices, backups, versions, events, acked, now, onBackup, onCompare, onDeploy, onShowChanges }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [viewing, setViewing] = useState<CmdbDevice | null>(null);

  const lastChange = useMemo(() => {
    const latest: Record<string, ChangeEvent> = {};
    for (const event of events) if (!latest[event.device]) latest[event.device] = event;
    return latest;
  }, [events]);
  const flagged = (name: string) => events.some(event => event.device === name && !event.authorized && !acked[event.key]);

  const rows = useMemo(() => {
    const text = query.trim().toLowerCase();
    return devices.filter(item => {
      if (status === "changed") { if (!flagged(item.name)) return false; }
      else if (status !== "all" && backups[item.name].status !== status) return false;
      return !text || `${item.name} ${item.ip} ${item.vendor} ${siteOf(item.name)}`.toLowerCase().includes(text);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, backups, events, acked, query, status]);

  const failed = devices.filter(item => backups[item.name].status === "Failed").map(item => item.name);

  return (
    <section className="sla-panel ncm-panel">
      <div className="sla-panel-title">
        <h3><DatabaseBackup size={15} />Scheduled configuration backups</h3>
        <span>SSH first, Telnet fallback · running-config and startup-config · 90 versions retained</span>
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
        <select aria-label="Backup status" value={status} onChange={event => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
          <option value="Running">Running</option>
          <option value="changed">Unauthorized change</option>
        </select>
        <span className="sla-count">{rows.length} of {devices.length} devices</span>
        <div className="sla-push-right ncm-actions">
          <button type="button" className="sla-secondary" disabled={!failed.length} onClick={() => onBackup(failed)}>Retry failed ({failed.length})</button>
          <button type="button" className="ncm-primary" onClick={() => onBackup(devices.map(item => item.name))}><RefreshCw size={13} />Back up all now</button>
        </div>
      </div>
      <div className="ncm-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Device</TableHead><TableHead>Vendor / model</TableHead><TableHead>Site</TableHead>
              <TableHead>Protocol</TableHead><TableHead>Schedule</TableHead><TableHead>Last backup</TableHead>
              <TableHead>Status</TableHead><TableHead>Versions</TableHead><TableHead>Last change</TableHead><TableHead className="ncm-sticky-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(item => {
              const backup = backups[item.name];
              return (
                <TableRow key={item.name}>
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
                        {flagged(item.name)
                          ? <button type="button" className="ncm-link ncm-flag" onClick={onShowChanges}><span className="ncm-dot" />Unauthorized</button>
                          : <span className="sla-badge"><span style={{ background: "#25a77a" }} />{lastChange[item.name].authorized ? "Authorized" : "Acknowledged"}</span>}
                        <small>{formatTime(lastChange[item.name].at)}</small>
                      </>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="ncm-sticky-end">
                    <div className="ncm-actions nowrap">
                      <button type="button" className="ncm-link" disabled={backup.status === "Running"} onClick={() => onBackup([item.name])}>Back up now</button>
                      <button type="button" className="ncm-link" onClick={() => setViewing(item)}><FileText size={12} />View config</button>
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
        device={viewing} versions={viewing ? versions[viewing.name] : []} onClose={() => setViewing(null)}
        onCompare={(name, to) => { setViewing(null); onCompare(name, to); }} onDeploy={onDeploy}
      />
    </section>
  );
}
