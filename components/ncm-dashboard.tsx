"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowDownUp, Bell, Box, ChevronDown, Cloud, DatabaseBackup, Database, GitCompare,
  Home, Layers, Map, Network, Search, Settings, ShieldCheck, Workflow, X,
} from "lucide-react";
import { devices, NOW, SCRIPTS, RULES, POLICIES, buildRule, computeCompliance, diffStats, formatTime, initialBackup, initialJobs, initialVersions, latestOf } from "@/lib/ncm-data";
import type { BackupInfo, ConfigVersion, Job, Policy, Rule, RuleSpec } from "@/lib/ncm-data";
import { NcmBackups } from "@/components/ncm-backups";
import { NcmCompare, type CompareFocus } from "@/components/ncm-compare";
import { NcmCompliance } from "@/components/ncm-compliance";
import type { AlertConfig, ChangeEvent } from "@/components/ncm-changes";

type TabId = "backup" | "compare" | "compliance";

const navigation = [
  { label: "Event", icon: Activity }, { label: "Inspection", icon: Layers },
  { label: "Biz Systems", icon: Box }, { label: "APM", icon: Workflow },
  { label: "Infrastructure", icon: Network }, { label: "RUM", icon: Activity },
  { label: "Transactions", icon: ArrowDownUp }, { label: "LLM Observability", icon: Box },
  { label: "Query & Analysis", icon: Search }, { label: "Visualization", icon: Map },
  { label: "Monitoring", icon: Activity }, { label: "Data Governance", icon: Database },
  { label: "Discovery & Collection", icon: Layers }, { label: "System Definition", icon: Settings },
];
const subnav = ["Hosts", "Processes", "Kubernetes", "Network Devices", "Network Path", "IP SLA", "NCM", "Resources", "Reports"];
const subnavHref: Record<string, string> = { "Network Path": "/network-path", "IP SLA": "/ip-sla", NCM: "/ncm" };

// Compliance is hidden for now; flip to true to bring back the tab and its dashboard stats.
const SHOW_COMPLIANCE = false;

const allTabs: { id: TabId; label: string; icon: typeof Search }[] = [
  { id: "backup", label: "Overview", icon: DatabaseBackup },
  { id: "compare", label: "Compare & Rollback", icon: GitCompare },
  { id: "compliance", label: "Compliance", icon: ShieldCheck },
];
const tabs = allTabs.filter(item => SHOW_COMPLIANCE || item.id !== "compliance");

export function NcmDashboard() {
  const [showChrome, setShowChrome] = useState(true);
  const [tab, setTab] = useState<TabId>("backup");
  const [notice, setNotice] = useState("");
  const [versions, setVersions] = useState<Record<string, ConfigVersion[]>>(() => Object.fromEntries(devices.map(item => [item.name, initialVersions(item)])));
  const [backups, setBackups] = useState<Record<string, BackupInfo>>(() => Object.fromEntries(devices.map(item => [item.name, initialBackup(item)])));
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [alerts, setAlerts] = useState<AlertConfig>({ enabled: true, recipients: "netops@doop.example, secops@doop.example" });
  const [customRules, setCustomRules] = useState<Rule[]>([]);
  const [policyList, setPolicyList] = useState<Policy[]>(POLICIES);
  const [acked, setAcked] = useState<Record<string, boolean>>({});
  const [backupStatus, setBackupStatus] = useState("all");
  const [focus, setFocus] = useState<CompareFocus>({ device: devices[0].name, stamp: 0 });

  const clock = useRef(NOW);
  const versionsRef = useRef(versions);
  versionsRef.current = versions;
  const timers = useRef<number[]>([]);
  const nextJobId = useRef(1045);
  const simulated = useRef(0);
  useEffect(() => () => timers.current.forEach(id => window.clearTimeout(id)), []);
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(id);
  }, [notice]);

  const tick = () => (clock.current += 120_000);
  const later = (callback: () => void, delay: number) => { timers.current.push(window.setTimeout(callback, delay)); };
  const appendVersion = (list: ConfigVersion[], source: ConfigVersion["source"], ref: string, lines: string[], author = "admin"): ConfigVersion[] =>
    [...list, { number: list.length + 1, at: tick(), author, source, ref, lines }];

  const rules = useMemo(() => [...RULES, ...customRules], [customRules]);
  const rulesRef = useRef(rules);
  rulesRef.current = rules;
  const nextRuleId = useRef(1);
  const compliance = useMemo(() => computeCompliance(versions, rules, policyList), [versions, rules, policyList]);
  const events = useMemo<ChangeEvent[]>(() => devices.flatMap(item => versions[item.name].slice(1).map((version, index) => ({
    key: `${item.name}-v${version.number}`, device: item.name, number: version.number, at: version.at, author: version.author,
    source: version.source, ref: version.ref, authorized: version.source !== "Out-of-band",
    ...diffStats(versions[item.name][index].lines, version.lines),
  }))).sort((a, b) => b.at - a.at), [versions]);

  const backedUp = devices.filter(item => backups[item.name].status === "Success" && backups[item.name].at >= NOW - 24 * 3_600_000).length;
  const failedBackups = devices.filter(item => backups[item.name].status === "Failed").length;
  const openAlerts = events.filter(event => !event.authorized && !acked[event.key]).length;

  const runBackups = (names: string[]) => {
    setBackups(previous => ({ ...previous, ...Object.fromEntries(names.map(name => [name, { ...previous[name], status: "Running" as const, error: undefined }])) }));
    later(() => {
      const at = tick();
      setBackups(previous => ({ ...previous, ...Object.fromEntries(names.map(name => [name, { ...previous[name], status: "Success" as const, at }])) }));
      setNotice(names.length === 1 ? `Backup of ${names[0]} completed` : `Backup completed for ${names.length} devices`);
    }, 1100);
  };

  const rollback = (device: string, number: number) => {
    const list = versions[device];
    setVersions(previous => ({ ...previous, [device]: appendVersion(list, "Rollback", `Rolled back to v${number}`, list[number - 1].lines) }));
    setNotice(`${device} rolled back to v${number}. New version v${list.length + 1} created.`);
  };

  const deployConfig = (device: string, lines: string[], ref: string) => {
    if (backups[device].status === "Failed") {
      setNotice(`Deploy to ${device} failed: ${backups[device].error ?? "device unreachable"}`);
      return false;
    }
    const list = versionsRef.current[device];
    setVersions(previous => ({ ...previous, [device]: appendVersion(list, "Planned change", ref, lines) }));
    setNotice(`Configuration deployed to ${device}. New version v${list.length + 1} saved.`);
    return true;
  };

  const remediate = (targets: { device: string; ruleId: string }[]) => {
    const next = { ...versionsRef.current };
    let changed = 0;
    for (const device of new Set(targets.map(target => target.device))) {
      const ids = targets.filter(target => target.device === device).map(target => target.ruleId);
      const before = latestOf(next[device]).lines;
      const picked = ids.map(id => rulesRef.current.find(rule => rule.id === id)!);
      const after = picked.reduce((lines, rule) => rule.fix(lines), before);
      if (after.join("\n") !== before.join("\n")) {
        next[device] = appendVersion(next[device], "Remediation", `Fixed ${picked.map(rule => rule.title).join("; ")}`, after);
        changed++;
      }
    }
    setVersions(next);
    setNotice(`Remediation pushed to ${changed} device${changed === 1 ? "" : "s"}`);
  };

  const addRule = (spec: RuleSpec, policyIds: string[]) => {
    const rule = buildRule(`custom-${nextRuleId.current++}`, spec);
    const failing = devices.filter(item => !rule.check(latestOf(versions[item.name]).lines)).length;
    setCustomRules(previous => [...previous, rule]);
    setPolicyList(previous => previous.map(policy => (policyIds.includes(policy.id) ? { ...policy, ruleIds: [...policy.ruleIds, rule.id] } : policy)));
    setNotice(`Rule "${rule.title}" added. ${failing} of ${devices.length} devices currently fail it.`);
  };

  const removeRule = (ruleId: string) => {
    const rule = rulesRef.current.find(item => item.id === ruleId);
    setCustomRules(previous => previous.filter(item => item.id !== ruleId));
    setPolicyList(previous => previous.map(policy => ({ ...policy, ruleIds: policy.ruleIds.filter(id => id !== ruleId) })));
    setNotice(`Rule "${rule?.title}" deleted`);
  };

  const runJob = (scriptId: string, targets: string[]) => {
    const script = SCRIPTS.find(item => item.id === scriptId)!;
    const id = nextJobId.current++;
    setJobs(previous => [{ id, scriptId, name: script.name, kind: script.kind, at: tick(), targets, status: "Running", results: [] }, ...previous]);
    later(() => {
      const next = { ...versionsRef.current };
      const results = targets.map(device => {
        if (backups[device].status === "Failed") return { device, ok: false, message: backups[device].error ?? "Device unreachable" };
        if (script.kind === "Firmware") return { device, ok: true, message: "Image staged, reboot scheduled 02:00" };
        if (script.kind === "CLI") return { device, ok: true, message: "Output stored with job" };
        const before = latestOf(next[device]).lines;
        const after = script.apply!(before);
        if (after.join("\n") === before.join("\n")) return { device, ok: true, message: "Already compliant" };
        next[device] = appendVersion(next[device], "Script job", `Job #${id} ${script.name}`, after);
        return { device, ok: true, message: `Applied, new version v${next[device].length}` };
      });
      setVersions(next);
      const failed = results.filter(result => !result.ok).length;
      setJobs(previous => previous.map(job => job.id === id ? { ...job, status: failed ? "Completed with errors" : "Completed", results } : job));
      setNotice(`Job #${id} finished: ${results.length - failed} succeeded, ${failed} failed`);
    }, 1600);
  };

  const simulateChange = () => {
    const candidates = devices.filter(item => RULES[0].check(latestOf(versions[item.name]).lines));
    if (!candidates.length) { setNotice("All devices already contain an unauthorized change"); return; }
    const target = candidates[simulated.current++ % candidates.length];
    const lines = latestOf(versions[target.name]).lines.map(line => (line.startsWith(" transport input") ? " transport input ssh telnet" : line));
    setVersions(previous => ({ ...previous, [target.name]: appendVersion(previous[target.name], "Out-of-band", "No change ticket", lines, "unknown (console)") }));
    setNotice(alerts.enabled
      ? `Unauthorized change detected on ${target.name}. Alert emailed to ${alerts.recipients}.`
      : `Unauthorized change detected on ${target.name}. Email alerts are off, no mail sent.`);
    showChangeLog();
  };

  const showChangeLog = () => {
    setTab("backup");
    setBackupStatus("changed");
  };

  const openCompare = (device: string, to?: number) => {
    setFocus({ device, from: to ? Math.max(1, to - 1) : undefined, to, stamp: focus.stamp + 1 });
    setTab("compare");
  };

  const complianceStats: { label: string; value: string; open: () => void; tone?: string }[] = [
    { label: "Compliance score", value: `${compliance.score}%`, open: () => setTab("compliance") },
    { label: "Open violations", value: String(compliance.violations.length), open: () => setTab("compliance"), tone: compliance.violations.length ? "bad" : "" },
  ];
  const stats: { label: string; value: string; open: () => void; tone?: string }[] = [
    { label: "Managed devices", value: String(devices.length), open: () => { setTab("backup"); setBackupStatus("all"); } },
    { label: "Backed up in 24 h", value: `${backedUp}/${devices.length}`, open: () => { setTab("backup"); setBackupStatus("Success"); } },
    { label: "Backup failures", value: String(failedBackups), open: () => { setTab("backup"); setBackupStatus("Failed"); }, tone: failedBackups ? "bad" : "" },
    ...(SHOW_COMPLIANCE ? complianceStats : []),
    { label: "Unacknowledged changes", value: String(openAlerts), open: showChangeLog, tone: openAlerts ? "bad" : "" },
  ];

  return (
    <div className="np-app sla-app ncm-app">
      {showChrome && (
        <header className="np-top">
          <div className="np-brand"><Cloud size={23} /><span>Digital Operation Central Platform</span></div>
          <Home size={13} /><span>Products <ChevronDown size={10} /></span><i /><span>DOOP</span>
          <div className="np-top-right"><Search size={13} /><Bell size={13} /><b>云智慧集团</b><span>English <ChevronDown size={10} /></span><span>Admin <ChevronDown size={10} /></span></div>
        </header>
      )}
      <div className="np-shell">
        {showChrome && (
          <aside className="np-nav" aria-label="Main navigation">
            {navigation.map(item => (
              <div key={item.label}>
                <button className={item.label === "Infrastructure" ? "np-nav-current" : ""} onClick={() => item.label !== "Infrastructure" && setNotice(`${item.label} is not available in this prototype`)}>
                  <item.icon size={13} /><span>{item.label}</span><ChevronDown size={11} />
                </button>
                {item.label === "Infrastructure" && (
                  <div className="np-subnav">
                    {subnav.map(label => subnavHref[label]
                      ? <Link key={label} className={label === "NCM" ? "active" : ""} href={subnavHref[label]} aria-current={label === "NCM" ? "page" : undefined}>{label}</Link>
                      : <button key={label} onClick={() => setNotice(`${label} is not available in this prototype`)}>{label}</button>)}
                  </div>
                )}
              </div>
            ))}
            <footer>7.1.0 <Layers size={12} /></footer>
          </aside>
        )}
        <main className="np-main sla-main">
          <div className="sla-module-header">
            <button type="button" role="switch" aria-checked={showChrome} aria-label="Show top navigation and left menu" title={showChrome ? "Hide navigation" : "Show navigation"} className={`np-chrome-switch${showChrome ? " on" : ""}`} onClick={() => setShowChrome(value => !value)}><span /></button>
            <h1>NCM</h1>
            <span className="sla-range-label">{`Network Configuration Manager · multi-vendor configuration${SHOW_COMPLIANCE ? ", compliance" : ""} and change management`}</span>
            <div className="sla-header-actions"><span className="sla-range-label">Last discovery {formatTime(NOW)}</span></div>
          </div>
          <div className="sla-content">
            <div className="sla-summary ncm-summary" role="group" aria-label="Overview">
              {stats.map(stat => (
                <button key={stat.label} type="button" className={`sla-stat ncm-stat ${stat.tone ?? ""}`} onClick={stat.open}>
                  <span>{stat.label}</span><strong>{stat.value}</strong>
                </button>
              ))}
            </div>
            <div className="ncm-tabs" role="tablist" aria-label="NCM capabilities">
              {tabs.map(item => (
                <button key={item.id} type="button" role="tab" id={`ncm-tab-${item.id}`} aria-selected={tab === item.id} aria-controls="ncm-tabpanel" onClick={() => setTab(item.id)}>
                  <item.icon size={14} />{item.label}
                  {item.id === "compliance" && compliance.violations.length > 0 && <em>{compliance.violations.length}</em>}
                  {item.id === "backup" && openAlerts > 0 && <em>{openAlerts}</em>}
                </button>
              ))}
            </div>
            <div id="ncm-tabpanel" role="tabpanel" aria-labelledby={`ncm-tab-${tab}`}>
              {tab === "backup" && (
                <>
                  <NcmBackups
                    devices={devices} backups={backups} versions={versions} rules={rules} events={events} acked={acked} jobs={jobs} alerts={alerts}
                    status={backupStatus} now={clock.current}
                    onStatus={setBackupStatus} onBackup={runBackups} onCompare={openCompare} onDeploy={deployConfig} onRunScript={runJob}
                    onAck={keys => setAcked(previous => ({ ...previous, ...Object.fromEntries(keys.map(key => [key, true])) }))}
                    onAlerts={setAlerts} onSimulate={simulateChange}
                  />
                </>
              )}
              {tab === "compare" && <NcmCompare key={focus.stamp} devices={devices} versions={versions} focus={focus} onRollback={rollback} />}
              {SHOW_COMPLIANCE && tab === "compliance" && (
                <NcmCompliance
                  total={devices.length} rules={rules} policies={compliance.policies} violations={compliance.violations}
                  onAddRule={addRule} onRemoveRule={removeRule}
                  onRemediate={(device, ruleIds) => remediate(ruleIds.map(ruleId => ({ device, ruleId })))}
                  onRemediateRule={ruleId => remediate(compliance.violations.filter(violation => violation.ruleId === ruleId))}
                />
              )}
            </div>
          </div>
        </main>
      </div>
      {notice && (
        <div className="sla-toast" role="status">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice("")}><X size={13} /></button>
        </div>
      )}
    </div>
  );
}
