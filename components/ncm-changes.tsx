"use client";

import { useState } from "react";
import { BellRing, FileDiff } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTime, type ConfigSource } from "@/lib/ncm-data";

export type ChangeEvent = {
  key: string;
  device: string;
  number: number;
  at: number;
  author: string;
  source: ConfigSource;
  ref: string;
  added: number;
  removed: number;
  authorized: boolean;
};

export type AlertConfig = { enabled: boolean; recipients: string };

type Props = {
  events: ChangeEvent[];
  alerts: AlertConfig;
  acked: Record<string, boolean>;
  unsent: Record<string, boolean>;
  onAlerts: (next: AlertConfig) => void;
  onAck: (key: string) => void;
  onViewDiff: (device: string, number: number) => void;
  onSimulate: () => void;
};

export function NcmChanges({ events, alerts, acked, unsent, onAlerts, onAck, onViewDiff, onSimulate }: Props) {
  const [filter, setFilter] = useState("all");
  const shown = events.filter(event => filter === "all" || (filter === "unauthorized" ? !event.authorized : event.authorized));

  return (
    <section id="ncm-changes" className="sla-panel ncm-panel ncm-stacked">
      <div className="sla-panel-title">
        <h3><BellRing size={15} />Real-time change detection</h3>
        <span>Detects syslog config-change messages and verifies the running-config hash every 5 minutes</span>
      </div>
      <div className="ncm-alert-config">
        <div className="ncm-switch-row">
          <button
            type="button" role="switch" aria-checked={alerts.enabled} aria-label="Email alerts for unauthorized changes"
            className={`np-chrome-switch${alerts.enabled ? " on" : ""}`} onClick={() => onAlerts({ ...alerts, enabled: !alerts.enabled })}
          ><span /></button>
          <div><b>Email alerts for unauthorized changes</b><small>A change is unauthorized when no approved change ticket matches it.</small></div>
        </div>
        <label className="ncm-field">
          <span>Recipients</span>
          <input value={alerts.recipients} disabled={!alerts.enabled} onChange={event => onAlerts({ ...alerts, recipients: event.target.value })} />
        </label>
        <button type="button" className="sla-secondary" onClick={onSimulate}>Simulate out-of-band change</button>
      </div>

      <div className="sla-filters">
        <select aria-label="Change type" value={filter} onChange={event => setFilter(event.target.value)}>
          <option value="all">All changes</option>
          <option value="unauthorized">Unauthorized only</option>
          <option value="authorized">Authorized only</option>
        </select>
        <span className="sla-count">{shown.length} changes</span>
      </div>
      <div className="ncm-table-wrap">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Detected</TableHead><TableHead>Device</TableHead><TableHead>Classification</TableHead><TableHead>Source</TableHead>
              <TableHead>Changed by</TableHead><TableHead>Lines</TableHead><TableHead>Email alert</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map(event => (
              <TableRow key={event.key}>
                <TableCell>{formatTime(event.at)}</TableCell>
                <TableCell>{event.device}<small>v{event.number}</small></TableCell>
                <TableCell>
                  <span className="sla-badge"><span style={{ background: event.authorized ? "#25a77a" : "#e05a60" }} />{event.authorized ? "Authorized" : "Unauthorized"}</span>
                </TableCell>
                <TableCell>{event.source}<small>{event.ref}</small></TableCell>
                <TableCell>{event.author}</TableCell>
                <TableCell><b className="ncm-add">+{event.added}</b> <b className="ncm-del">−{event.removed}</b></TableCell>
                <TableCell>{event.authorized ? "—" : unsent[event.key] ? "Not sent (alerts off)" : "Sent"}</TableCell>
                <TableCell>
                  <div className="ncm-actions">
                    <button type="button" className="ncm-link" onClick={() => onViewDiff(event.device, event.number)}><FileDiff size={12} />View diff</button>
                    {!event.authorized && (acked[event.key]
                      ? <span className="ncm-ok">Acknowledged</span>
                      : <button type="button" className="ncm-link" onClick={() => onAck(event.key)}>Acknowledge</button>)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!shown.length && <div className="sla-empty">No configuration changes detected</div>}
      </div>
    </section>
  );
}
