"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ConfigSource } from "@/lib/ncm-data";

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
  open: boolean;
  alerts: AlertConfig;
  onAlerts: (next: AlertConfig) => void;
  onSimulate: () => void;
  onClose: () => void;
};

export function NcmAlertSettings({ open, alerts, onAlerts, onSimulate, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogContent className="ncm-config-dialog sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Change detection alerts</DialogTitle>
          <DialogDescription>Detects syslog config-change messages and verifies the running-config hash every 5 minutes.</DialogDescription>
        </DialogHeader>
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
        <div className="ncm-run-bar">
          <span>Demo: simulate a console change that has no change ticket.</span>
          <button type="button" className="sla-secondary" onClick={onSimulate}>Simulate out-of-band change</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
