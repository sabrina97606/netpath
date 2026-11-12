"use client";

import { Fragment, useState } from "react";
import { Play } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SCRIPTS, formatTime, type Job } from "@/lib/ncm-data";

const statusColor = { Running: "#409eff", Completed: "#25a77a", "Completed with errors": "#d99519" } as const;

type ScriptsProps = {
  open: boolean;
  targets: string[];
  busy: boolean;
  onClose: () => void;
  onRun: (scriptId: string) => void;
};

export function NcmBulkScripts({ open, targets, busy, onClose, onRun }: ScriptsProps) {
  const [scriptId, setScriptId] = useState(SCRIPTS[0].id);
  const script = SCRIPTS.find(item => item.id === scriptId)!;
  const preview = targets.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent className="ncm-config-dialog sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Run script on {targets.length} device{targets.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>Deploy configuration, run a CLI script or upgrade firmware on the selected devices.</DialogDescription>
        </DialogHeader>
        <div className="ncm-script-list" role="radiogroup" aria-label="Script">
          {SCRIPTS.map(item => (
            <button key={item.id} type="button" role="radio" aria-checked={item.id === scriptId} onClick={() => setScriptId(item.id)}>
              <span><b>{item.name}</b><em>{item.kind}</em></span>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
        <p className="ncm-config-meta">
          Targets: {preview.join(", ")}{targets.length > preview.length ? ` and ${targets.length - preview.length} more` : ""}
        </p>
        <div className="ncm-run-bar">
          <span>
            {script.kind === "Config" ? "Creates a new configuration version per device and records it in change history." : script.kind === "Firmware" ? "Stages the image and schedules a reboot in the next maintenance window." : "Read-only. No configuration is changed."}
          </span>
          <button type="button" className="ncm-primary" disabled={!targets.length || busy} onClick={() => onRun(script.id)}>
            <Play size={13} />{busy ? "A job is running" : `Run on ${targets.length} device${targets.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type HistoryProps = { open: boolean; jobs: Job[]; onClose: () => void };

export function NcmJobHistory({ open, jobs, onClose }: HistoryProps) {
  const [openJob, setOpenJob] = useState<number | null>(null);

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent className="ncm-config-dialog sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Job history</DialogTitle>
          <DialogDescription>{jobs.length} bulk jobs, newest first.</DialogDescription>
        </DialogHeader>
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
          {!jobs.length && <div className="sla-empty">No jobs have run yet</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
