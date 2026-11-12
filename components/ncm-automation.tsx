"use client";

import { Fragment, useMemo, useState } from "react";
import { Play, TerminalSquare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CmdbDevice } from "@/lib/cmdb";
import { SCRIPTS, formatTime, type Job } from "@/lib/ncm-data";

const statusColor = { Running: "#409eff", Completed: "#25a77a", "Completed with errors": "#d99519" } as const;

type Props = {
  devices: CmdbDevice[];
  jobs: Job[];
  onRun: (scriptId: string, targets: string[]) => void;
};

export function NcmAutomation({ devices, jobs, onRun }: Props) {
  const [scriptId, setScriptId] = useState(SCRIPTS[0].id);
  const [vendor, setVendor] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [openJob, setOpenJob] = useState<number | null>(null);

  const vendors = useMemo(() => [...new Set(devices.map(item => item.vendor))].sort(), [devices]);
  const visible = devices.filter(item => vendor === "all" || item.vendor === vendor);
  const allVisibleSelected = visible.length > 0 && visible.every(item => selected.includes(item.name));
  const script = SCRIPTS.find(item => item.id === scriptId)!;
  const busy = jobs.some(job => job.status === "Running");

  const toggleAll = () =>
    setSelected(previous => allVisibleSelected
      ? previous.filter(name => !visible.some(item => item.name === name))
      : [...new Set([...previous, ...visible.map(item => item.name)])]);
  const toggle = (name: string) =>
    setSelected(previous => previous.includes(name) ? previous.filter(item => item !== name) : [...previous, name]);

  return (
    <section className="sla-panel ncm-panel">
      <div className="sla-panel-title">
        <h3><TerminalSquare size={15} />Bulk automation and scripts</h3>
        <span>Deploy configuration, run CLI scripts and upgrade firmware across many devices at once</span>
      </div>
      <div className="ncm-split">
        <div>
          <h4 className="ncm-subtitle">1. Choose a script</h4>
          <div className="ncm-script-list" role="radiogroup" aria-label="Script">
            {SCRIPTS.map(item => (
              <button key={item.id} type="button" role="radio" aria-checked={item.id === scriptId} onClick={() => setScriptId(item.id)}>
                <span><b>{item.name}</b><em>{item.kind}</em></span>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h4 className="ncm-subtitle">2. Select target devices</h4>
          <div className="sla-filters">
            <select aria-label="Vendor" value={vendor} onChange={event => setVendor(event.target.value)}>
              <option value="all">All vendors</option>
              {vendors.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="ncm-check"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />Select all ({visible.length})</label>
            <span className="sla-count">{selected.length} selected</span>
          </div>
          <div className="ncm-target-list">
            {visible.map(item => (
              <label key={item.name} className="ncm-check">
                <input type="checkbox" checked={selected.includes(item.name)} onChange={() => toggle(item.name)} />
                <span>{item.name}</span><small>{item.vendor}</small>
              </label>
            ))}
          </div>
          <div className="ncm-run-bar">
            <span>
              {script.kind === "Config" ? "Creates a new configuration version per device and records it in change history." : script.kind === "Firmware" ? "Stages the image and schedules a reboot in the next maintenance window." : "Read-only. No configuration is changed."}
            </span>
            <button type="button" className="ncm-primary" disabled={!selected.length || busy} onClick={() => { onRun(script.id, selected); setSelected([]); }}>
              <Play size={13} />{busy ? "A job is running" : `Run on ${selected.length} device${selected.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>

      <div className="sla-panel-title"><h3>Job history</h3><span>{jobs.length} jobs</span></div>
      <div className="ncm-table-wrap short">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Job</TableHead><TableHead>Script</TableHead><TableHead>Type</TableHead><TableHead>Targets</TableHead><TableHead>Started</TableHead><TableHead>Status</TableHead><TableHead>Result</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map(job => (
              <Fragment key={job.id}>
                <TableRow>
                  <TableCell>#{job.id}</TableCell><TableCell>{job.name}</TableCell><TableCell>{job.kind}</TableCell>
                  <TableCell>{job.targets.length}</TableCell><TableCell>{formatTime(job.at)}</TableCell>
                  <TableCell><span className="sla-badge"><span style={{ background: statusColor[job.status] }} />{job.status}</span></TableCell>
                  <TableCell>
                    {job.status === "Running"
                      ? <span className="ncm-progress" aria-label="Running"><i /></span>
                      : <button type="button" className="ncm-link" aria-expanded={openJob === job.id} onClick={() => setOpenJob(openJob === job.id ? null : job.id)}>
                          {job.results.filter(result => result.ok).length} ok · {job.results.filter(result => !result.ok).length} failed
                        </button>}
                  </TableCell>
                </TableRow>
                {openJob === job.id && (
                  <TableRow>
                    <TableCell colSpan={7} className="ncm-job-detail">
                      {job.results.map(result => (
                        <span key={result.device} className={result.ok ? "" : "bad"}>{result.device}<small>{result.message}</small></span>
                      ))}
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
