"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CmdbDevice } from "@/lib/cmdb";
import { formatTime, type ConfigVersion } from "@/lib/ncm-data";

type Props = {
  device: CmdbDevice | null;
  versions: ConfigVersion[];
  onClose: () => void;
};

export function NcmConfigViewer({ device, versions, onClose }: Props) {
  return (
    <Dialog open={!!device} onOpenChange={open => !open && onClose()}>
      <DialogContent className="ncm-config-dialog sm:max-w-3xl">
        {device && <Viewer key={device.name} device={device} versions={versions} />}
      </DialogContent>
    </Dialog>
  );
}

function Viewer({ device, versions }: { device: CmdbDevice; versions: ConfigVersion[] }) {
  const [selected, setSelected] = useState(versions[versions.length - 1].number);
  const [copied, setCopied] = useState(false);
  const version = versions.find(item => item.number === selected) ?? versions[versions.length - 1];
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>{device.name} · running-config</DialogTitle>
        <DialogDescription>
          {device.ip} · {device.vendor} · {version.lines.length} lines
        </DialogDescription>
      </DialogHeader>
      <div className="ncm-config-bar">
        <label>
          <span>Version</span>
          <select value={selected} onChange={event => setSelected(Number(event.target.value))} aria-label="Config version">
            {[...versions].reverse().map(item => (
              <option key={item.number} value={item.number}>
                v{item.number}{item.number === versions[versions.length - 1].number ? " (latest)" : ""} · {formatTime(item.at)}
              </option>
            ))}
          </select>
        </label>
        <div className="ncm-config-actions">
          <button type="button" onClick={copy}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "Copied" : "Copy"}</button>
          <button type="button" onClick={download}><Download size={13} />Download .cfg</button>
        </div>
      </div>
      <p className="ncm-config-meta">
        {version.author} · {version.source} · {version.ref}
      </p>
      <pre className="ncm-config-code" tabIndex={0} aria-label={`Configuration of ${device.name}, version ${version.number}`}>
        {version.lines.map((line, index) => (
          <span key={index}><i>{index + 1}</i>{line || " "}{"\n"}</span>
        ))}
      </pre>
    </>
  );
}
