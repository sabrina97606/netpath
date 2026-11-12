import { cmdbDevices, seeded, type CmdbDevice } from "@/lib/cmdb";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Fixed prototype clock (2026-11-12 14:37 UTC+8) so server and client render the same data. */
export const NOW = Date.UTC(2026, 10, 12, 6, 37);

export function formatTime(ms: number) {
  const d = new Date(ms + 8 * HOUR);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

export function relativeTime(ms: number, now: number) {
  const minutes = Math.max(0, Math.round((now - ms) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  return `${Math.round(minutes / 1440)} d ago`;
}

export const siteOf = (name: string) => name.split("-").slice(0, 2).join("-");

/* ---------------------------------------------------------------- configs */

export type ConfigSource = "Baseline" | "Planned change" | "Out-of-band" | "Rollback" | "Remediation" | "Script job";
export type ConfigVersion = {
  number: number;
  at: number;
  author: string;
  source: ConfigSource;
  ref: string;
  lines: string[];
};

type Options = { http: boolean; snmpAcl: boolean; syslog: boolean; ntp: boolean; banner: string; telnet: boolean; timeout: string };

function renderConfig(device: CmdbDevice, o: Options): string[] {
  return [
    "!",
    `hostname ${device.name}`,
    "service password-encryption",
    "ip ssh version 2",
    o.http ? "ip http server" : "no ip http server",
    o.snmpAcl ? "snmp-server community ****** RO 10" : "snmp-server community ****** RO",
    ...(o.syslog ? ["logging host 10.9.0.20"] : []),
    ...(o.ntp ? ["ntp server 10.9.0.10"] : []),
    `banner motd ^${o.banner}^`,
    "!",
    "line vty 0 4",
    ` transport input ${o.telnet ? "ssh telnet" : "ssh"}`,
    ` exec-timeout ${o.timeout}`,
    "!",
    "interface Vlan10",
    ` ip address ${device.ip} 255.255.255.0`,
    " no shutdown",
    "end",
  ];
}

export function initialVersions(device: CmdbDevice): ConfigVersion[] {
  const random = seeded(`ncm-${device.name}`);
  const legacyHttp = random() < 0.25;
  const noSyslog = random() < 0.2;
  const snmpOpen = random() < 0.2;
  const outOfBand = random() < 0.22;
  const o: Options = {
    http: legacyHttp, snmpAcl: !snmpOpen, syslog: false, ntp: false,
    banner: "Authorized access only", telnet: false, timeout: "10 0",
  };
  const versions: ConfigVersion[] = [
    { number: 1, at: NOW - 30 * DAY, author: "admin", source: "Baseline", ref: "Initial discovery", lines: renderConfig(device, o) },
  ];
  o.ntp = true; o.syslog = !noSyslog;
  versions.push({ number: 2, at: NOW - 22 * DAY, author: "zhang.wei", source: "Planned change", ref: "CHG-2041 Add NTP and syslog", lines: renderConfig(device, o) });
  o.banner = "Authorized access only - activity is monitored";
  versions.push({ number: 3, at: NOW - 14 * DAY, author: "li.na", source: "Planned change", ref: "CHG-2107 Update login banner", lines: renderConfig(device, o) });
  o.timeout = "15 0";
  versions.push({ number: 4, at: NOW - 6 * DAY, author: "zhang.wei", source: "Planned change", ref: "CHG-2188 Tune VTY idle timeout", lines: renderConfig(device, o) });
  if (outOfBand) {
    o.telnet = true; o.timeout = "0 0";
    versions.push({ number: 5, at: NOW - (2 + Math.round(random() * 20)) * HOUR, author: "unknown (console)", source: "Out-of-band", ref: "No change ticket", lines: renderConfig(device, o) });
  }
  return versions;
}

/* ------------------------------------------------------------ line diffing */

export type DiffRow = { type: "same" | "add" | "del" | "mod"; left?: string; right?: string; leftNo?: number; rightNo?: number };

export function diffLines(a: string[], b: string[]): DiffRow[] {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const ops: { t: "same" | "add" | "del"; text: string }[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { ops.push({ t: "same", text: a[i] }); i++; j++; }
    else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) { ops.push({ t: "add", text: b[j] }); j++; }
    else { ops.push({ t: "del", text: a[i] }); i++; }
  }

  const rows: DiffRow[] = [];
  let leftNo = 1, rightNo = 1, index = 0;
  while (index < ops.length) {
    if (ops[index].t === "same") {
      rows.push({ type: "same", left: ops[index].text, right: ops[index].text, leftNo: leftNo++, rightNo: rightNo++ });
      index++;
      continue;
    }
    const removed: string[] = [], added: string[] = [];
    while (index < ops.length && ops[index].t !== "same") {
      (ops[index].t === "del" ? removed : added).push(ops[index].text);
      index++;
    }
    for (let k = 0; k < Math.max(removed.length, added.length); k++) {
      const left = removed[k], right = added[k];
      rows.push({
        type: left !== undefined && right !== undefined ? "mod" : left !== undefined ? "del" : "add",
        left, right,
        leftNo: left !== undefined ? leftNo++ : undefined,
        rightNo: right !== undefined ? rightNo++ : undefined,
      });
    }
  }
  return rows;
}

export function diffStats(a: string[], b: string[]) {
  const rows = diffLines(a, b);
  return {
    added: rows.filter(row => row.right !== undefined && row.type !== "same").length,
    removed: rows.filter(row => row.left !== undefined && row.type !== "same").length,
  };
}

/* ------------------------------------------------------------- compliance */

export type Severity = "High" | "Medium" | "Low";
export type Rule = { id: string; title: string; severity: Severity; check: (lines: string[]) => boolean; fix: (lines: string[]) => string[] };

const replaceLine = (lines: string[], match: (line: string) => boolean, next: string) => lines.map(line => (match(line) ? next : line));
const insertBeforeBanner = (lines: string[], next: string) => {
  const at = lines.findIndex(line => line.startsWith("banner motd"));
  return at < 0 ? [...lines, next] : [...lines.slice(0, at), next, ...lines.slice(at)];
};

export const RULES: Rule[] = [
  {
    id: "ssh-only", title: "VTY accepts SSH only (no Telnet)", severity: "High",
    check: lines => !lines.some(line => /transport input .*telnet/.test(line)),
    fix: lines => replaceLine(lines, line => /transport input/.test(line), " transport input ssh"),
  },
  {
    id: "http-off", title: "HTTP management server disabled", severity: "Medium",
    check: lines => lines.includes("no ip http server"),
    fix: lines => replaceLine(lines, line => line === "ip http server", "no ip http server"),
  },
  {
    id: "vty-timeout", title: "VTY idle timeout is 1-15 minutes", severity: "Medium",
    check: lines => {
      const minutes = Number(lines.find(line => line.startsWith(" exec-timeout"))?.split(" ")[2]);
      return minutes >= 1 && minutes <= 15;
    },
    fix: lines => replaceLine(lines, line => line.startsWith(" exec-timeout"), " exec-timeout 10 0"),
  },
  {
    id: "ntp", title: "NTP server configured", severity: "Low",
    check: lines => lines.some(line => line.startsWith("ntp server")),
    fix: lines => (lines.some(line => line.startsWith("ntp server")) ? lines : insertBeforeBanner(lines, "ntp server 10.9.0.10")),
  },
  {
    id: "syslog", title: "Remote syslog host configured", severity: "Medium",
    check: lines => lines.some(line => line.startsWith("logging host")),
    fix: lines => (lines.some(line => line.startsWith("logging host")) ? lines : insertBeforeBanner(lines, "logging host 10.9.0.20")),
  },
  {
    id: "snmp-acl", title: "SNMP community restricted by ACL", severity: "Medium",
    check: lines => lines.some(line => /^snmp-server community \S+ RO \d+/.test(line)),
    fix: lines => replaceLine(lines, line => /^snmp-server community \S+ RO$/.test(line), "snmp-server community ****** RO 10"),
  },
];

export const ruleById = new Map(RULES.map(rule => [rule.id, rule]));

export const POLICIES: { id: string; name: string; description: string; ruleIds: string[] }[] = [
  { id: "stig", name: "DISA STIG", description: "Network device security technical guide", ruleIds: ["ssh-only", "http-off", "vty-timeout", "snmp-acl"] },
  { id: "pci", name: "PCI DSS", description: "Payment card data environment", ruleIds: ["ssh-only", "http-off", "vty-timeout", "ntp", "syslog"] },
  { id: "sox", name: "SOX", description: "Audit trail and change accountability", ruleIds: ["ntp", "syslog"] },
  { id: "hipaa", name: "HIPAA", description: "Protected health information safeguards", ruleIds: ["ssh-only", "vty-timeout", "syslog"] },
  { id: "cisp", name: "CISP", description: "Information security product baseline", ruleIds: ["ssh-only", "http-off", "snmp-acl"] },
];

export function policiesOfRule(ruleId: string) {
  return POLICIES.filter(policy => policy.ruleIds.includes(ruleId));
}

export const latestOf = (versions: ConfigVersion[]) => versions[versions.length - 1];
export const passesAll = (lines: string[]) => RULES.every(rule => rule.check(lines));

/* ---------------------------------------------------------------- backups */

export type BackupInfo = { at: number; status: "Success" | "Failed" | "Running"; protocol: "SSH" | "Telnet"; schedule: string; error?: string };

const backupErrors = ["SSH authentication failed", "Connection timed out (TCP 22)", "Enable password rejected"];

export function initialBackup(device: CmdbDevice): BackupInfo {
  const random = seeded(`ncm-backup-${device.name}`);
  const failed = random() < 0.1;
  const firewall = device.type === "firewall";
  return {
    at: NOW - Math.round((failed ? 26 + random() * 20 : 1 + random() * 20) * HOUR),
    status: failed ? "Failed" : "Success",
    protocol: random() < 0.12 ? "Telnet" : "SSH",
    schedule: firewall ? "Every 6 hours" : "Daily 02:00",
    error: failed ? backupErrors[Math.floor(random() * backupErrors.length)] : undefined,
  };
}

/* ------------------------------------------------------------- automation */

export type Script = {
  id: string;
  name: string;
  kind: "Config" | "Firmware" | "CLI";
  description: string;
  apply?: (lines: string[]) => string[];
};

export const SCRIPTS: Script[] = [
  { id: "ntp", name: "Standardize NTP server", kind: "Config", description: "Ensure ntp server 10.9.0.10 is configured.", apply: ruleById.get("ntp")!.fix },
  { id: "ssh-only", name: "Enforce SSH-only VTY", kind: "Config", description: "Replace transport input with ssh only.", apply: ruleById.get("ssh-only")!.fix },
  { id: "http-off", name: "Disable HTTP server", kind: "Config", description: "Apply no ip http server.", apply: ruleById.get("http-off")!.fix },
  {
    id: "banner", name: "Deploy login banner", kind: "Config", description: "Push the standard monitored-access banner.",
    apply: lines => replaceLine(lines, line => line.startsWith("banner motd"), "banner motd ^Authorized access only - activity is monitored^"),
  },
  { id: "firmware", name: "Firmware upgrade (stage and reboot)", kind: "Firmware", description: "Upload the approved image per vendor, verify checksum, reboot in the maintenance window." },
  { id: "inventory", name: "CLI: show version / inventory", kind: "CLI", description: "Read-only command; output is stored with the job." },
];

export type JobResult = { device: string; ok: boolean; message: string };
export type Job = {
  id: number;
  scriptId: string;
  name: string;
  kind: Script["kind"];
  at: number;
  targets: string[];
  status: "Running" | "Completed" | "Completed with errors";
  results: JobResult[];
};

export const devices = cmdbDevices;

const sampleTargets = (prefix: string) => devices.filter(item => item.name.startsWith(prefix)).map(item => item.name);

export const initialJobs: Job[] = [
  {
    id: 1044, scriptId: "inventory", name: "CLI: show version / inventory", kind: "CLI", at: NOW - 3 * DAY, status: "Completed",
    targets: sampleTargets("SH-DC1"),
    results: sampleTargets("SH-DC1").map(device => ({ device, ok: true, message: "Output stored with job" })),
  },
  {
    id: 1043, scriptId: "ntp", name: "Standardize NTP server", kind: "Config", at: NOW - 22 * DAY, status: "Completed with errors",
    targets: sampleTargets("BJ-HQ"),
    results: sampleTargets("BJ-HQ").map((device, index) => (
      index === 1
        ? { device, ok: false, message: "Connection timed out (TCP 22)" }
        : { device, ok: true, message: "Already compliant" }
    )),
  },
];

/* ------------------------------------------------------ compliance report */

export type Violation = { device: string; ruleId: string };

export function computeCompliance(versions: Record<string, ConfigVersion[]>) {
  const violations: Violation[] = [];
  for (const item of devices) {
    const lines = latestOf(versions[item.name]).lines;
    for (const rule of RULES) if (!rule.check(lines)) violations.push({ device: item.name, ruleId: rule.id });
  }
  const policies = POLICIES.map(policy => {
    const own = violations.filter(violation => policy.ruleIds.includes(violation.ruleId));
    const checks = devices.length * policy.ruleIds.length;
    return {
      ...policy,
      score: Math.round(((checks - own.length) / checks) * 100),
      compliantDevices: devices.length - new Set(own.map(violation => violation.device)).size,
    };
  });
  const score = Math.round(policies.reduce((sum, policy) => sum + policy.score, 0) / policies.length);
  return { violations, policies, score };
}
