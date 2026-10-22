"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChartContainer } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Activity, ArrowDownUp, ArrowLeft, ArrowRight, Bell, Box, Check,
  ChevronDown, ChevronLeft, ChevronRight, Clock3, Cloud, Database, Download, Home, Layers,
  Map, Network, Pause, Play, RefreshCw, Search,
  Server, Settings, Workflow, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis,
} from "recharts";

type Health = "Healthy" | "Warning" | "Critical" | "Down" | "Collection error" | "Stale" | "Paused";
type Operation = {
  key: string;
  id: string;
  device: string;
  source: string;
  target: string;
  site: string;
  type: "ICMP Echo" | "UDP Jitter";
  quality: "Healthy" | "Warning" | "Critical" | "Down";
  collection: "success" | "error";
  fresh: boolean;
  enabled: boolean;
  rtt: number | null;
  jitterSd: number | null;
  jitterDs: number | null;
  lossSd: number | null;
  lossDs: number | null;
  reason: string;
};

const healthColors: Record<Health, string> = {
  Healthy: "#25a77a", Warning: "#d99519", Critical: "#e05a60", Down: "#b64154",
  "Collection error": "#7864aa", Stale: "#8795a7", Paused: "#b3bbc6",
};
const healthOrder = Object.keys(healthColors) as Health[];
const sites = ["Shanghai", "Hong Kong", "Beijing"];
const navigation = [
  { label: "Event", icon: Activity }, { label: "Inspection", icon: Layers },
  { label: "Biz Systems", icon: Box }, { label: "APM", icon: Workflow },
  { label: "Infrastructure", icon: Network }, { label: "RUM", icon: Activity },
  { label: "Transactions", icon: ArrowDownUp }, { label: "LLM Observability", icon: Box },
  { label: "Query & Analysis", icon: Search }, { label: "Visualization", icon: Map },
  { label: "Monitoring", icon: Activity }, { label: "Data Governance", icon: Database },
  { label: "Discovery & Collection", icon: Layers }, { label: "System Definition", icon: Settings },
];

function initialOperations(): Operation[] {
  return Array.from({ length: 18 }, (_, index) => {
    const jitter = index % 3 !== 0;
    const quality = index === 4 ? "Down" : index === 2 || index === 11 ? "Critical" : index === 1 || index === 8 ? "Warning" : "Healthy";
    return {
      key: `router-${index % 6}-op-${101 + index}`,
      id: String(101 + index),
      device: `${["SH", "HK", "BJ"][index % 3]}-WAN-${String(index % 6 + 1).padStart(2, "0")}`,
      source: `192.0.2.${index % 6 + 2}`,
      target: `198.51.100.${30 + index}`,
      site: sites[index % 3],
      type: jitter ? "UDP Jitter" : "ICMP Echo",
      quality,
      collection: index === 9 ? "error" : "success",
      fresh: index !== 7,
      enabled: index !== 13,
      rtt: quality === "Down" ? null : index === 2 ? 29 : index === 11 ? 186 : 14 + index * 4,
      jitterSd: jitter ? index === 2 ? 24 : 1.2 + index * 0.6 : null,
      jitterDs: jitter ? index === 2 ? 38 : 2.4 + index * 0.8 : null,
      lossSd: jitter ? index === 2 ? 2 : index === 11 ? 6 : index === 1 ? 1 : 0 : null,
      lossDs: jitter ? index === 2 ? 8 : index === 11 ? 12 : index === 8 ? 3 : 0 : null,
      reason: quality === "Down" ? "Device result: timeout" : index === 2 ? "Target → source loss 8% ≥ 5%; jitter 38ms ≥ 30ms" : index === 11 ? "Target → source loss 12% ≥ 5%; RTT 186ms ≥ 150ms" : index === 1 ? "Source → target loss 1% ≥ 1%" : index === 8 ? "Target → source loss 3% ≥ 1%" : "Within quality thresholds",
    };
  });
}

function health(operation: Operation): Health {
  if (!operation.enabled) return "Paused";
  if (operation.collection === "error") return "Collection error";
  if (!operation.fresh) return "Stale";
  return operation.quality;
}

function usable(operation: Operation) {
  return operation.enabled && operation.collection === "success" && operation.fresh && operation.quality !== "Down";
}

function reason(operation: Operation) {
  const state = health(operation);
  return state === "Paused" ? "DOOP collection paused" : state === "Collection error" ? "SNMP request timed out; last device result retained" : state === "Stale" ? "No new device result for 18 minutes" : operation.reason;
}

function number(value: number | null, unit = "") {
  return value === null ? "N/A" : `${Number(value.toFixed(1))}${unit}`;
}

function Badge({ state }: { state: Health }) {
  return <span className="sla-badge" style={{ color: healthColors[state] }}><span style={{ background: healthColors[state] }} />{state}</span>;
}

function DashboardSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <Collapsible defaultOpen className="sla-dashboard-section">
    <div className="sla-section-heading"><CollapsibleTrigger className="sla-section-toggle"><ChevronDown size={13} /><h3>{title}</h3></CollapsibleTrigger>{note && <span>{note}</span>}</div>
    <CollapsibleContent>{children}</CollapsibleContent>
  </Collapsible>;
}

function OperationTable({ operations, mode, onSelect, onToggle }: { operations: Operation[]; mode: "issues" | "all" | "ranking"; onSelect: (key: string) => void; onToggle: (operation: Operation) => void }) {
  const [sort, setSort] = useState<{ key: "device" | "target" | "type" | "rtt"; ascending: boolean } | null>(null);
  const [pageSize, setPageSize] = useState(30);
  const [pagination, setPagination] = useState({ scope: "", page: 1 });
  const scope = `${operations.map(operation => operation.key).join(",")}:${pageSize}:${sort?.key}:${sort?.ascending}`;
  const pageCount = Math.max(1, Math.ceil(operations.length / pageSize));
  const currentPage = pagination.scope === scope ? Math.min(pagination.page, pageCount) : 1;
  const sorted = sort ? [...operations].sort((left, right) => {
    const leftValue = left[sort.key];
    const rightValue = right[sort.key];
    if (leftValue === null) return rightValue === null ? 0 : 1;
    if (rightValue === null) return -1;
    const comparison = typeof leftValue === "number" && typeof rightValue === "number" ? leftValue - rightValue : String(leftValue).localeCompare(String(rightValue), undefined, { numeric: true });
    return sort.ascending ? comparison : -comparison;
  }) : operations;
  const sortableHead = (key: "device" | "target" | "type" | "rtt", title: string) => <TableHead aria-sort={sort?.key === key ? sort.ascending ? "ascending" : "descending" : "none"}><button className="sla-sort-button" title={`Sort by ${title}`} onClick={() => setSort({ key, ascending: sort?.key === key ? !sort.ascending : true })}>{title}<ArrowDownUp size={12} /></button></TableHead>;
  return <>
    <Table>
    <TableHeader><TableRow>{sortableHead("device", "Source device / operation")}{sortableHead("target", "Target")}{sortableHead("type", "Type")}<TableHead>Status</TableHead>{mode === "issues" ? <TableHead>Issue</TableHead> : <TableHead>Site</TableHead>}{sortableHead("rtt", "Latest RTT (ms)")}{mode === "all" && <><TableHead>Jitter S→T / T→S (ms)</TableHead><TableHead>Loss S→T / T→S (%)</TableHead><TableHead>Collection</TableHead></>}</TableRow></TableHeader>
    <TableBody>{sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(operation => <TableRow key={operation.key}>
      <TableCell><button className="sla-table-link" onClick={() => onSelect(operation.key)}>{operation.device}<span>#{operation.id}</span></button></TableCell>
      <TableCell>{operation.target}</TableCell><TableCell>{operation.type}</TableCell><TableCell><Badge state={health(operation)} /></TableCell>
      <TableCell className={mode === "issues" ? "sla-reason" : undefined}>{mode === "issues" ? reason(operation) : operation.site}</TableCell><TableCell>{number(operation.rtt)}</TableCell>
      {mode === "all" && <><TableCell>{number(operation.jitterSd)} / {number(operation.jitterDs)}</TableCell><TableCell>{number(operation.lossSd)} / {number(operation.lossDs)}</TableCell><TableCell><button className="sla-icon-button" title={operation.enabled ? "Pause collection" : "Resume collection"} aria-label={`${operation.enabled ? "Pause" : "Resume"} collection ${operation.device} ${operation.id}`} onClick={() => onToggle(operation)}>{operation.enabled ? <Pause size={13} /> : <Play size={13} />}</button></TableCell></>}
    </TableRow>)}</TableBody>
    </Table>
    <div className="sla-table-footer"><span>{operations.length} total</span><select aria-label="Rows per page" value={pageSize} onChange={event => setPageSize(Number(event.target.value))}>{[10, 30, 50].map(value => <option key={value} value={value}>{value} / page</option>)}</select><button className="sla-page-button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPagination({ scope, page: currentPage - 1 })}><ChevronLeft size={14} /></button>{Array.from({ length: pageCount }, (_, index) => <button key={index} className="sla-page-button" aria-label={`Page ${index + 1}`} aria-current={currentPage === index + 1 ? "page" : undefined} onClick={() => setPagination({ scope, page: index + 1 })}>{index + 1}</button>)}<button className="sla-page-button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPagination({ scope, page: currentPage + 1 })}><ChevronRight size={14} /></button></div>
  </>;
}

function trend(operations: Operation[], hours: number, end: number) {
  const valid = operations.filter(usable);
  const jitter = valid.filter(operation => operation.type === "UDP Jitter");
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const meanRtt = average(valid.flatMap(operation => operation.rtt === null ? [] : [operation.rtt]));
  const meanJitter = average(jitter.flatMap(operation => operation.jitterDs === null ? [] : [operation.jitterDs]));
  const meanLoss = average(jitter.flatMap(operation => operation.lossDs === null ? [] : [operation.lossDs]));
  return Array.from({ length: 25 }, (_, index) => {
    const timestamp = end - (24 - index) * hours * 3600000 / 24;
    const factor = index === 24 ? 1 : 0.72 + (Math.sin(index * 0.8) + 1) * 0.15 + (index === 17 ? 0.5 : 0);
    return {
      time: new Date(timestamp).toISOString().slice(11, 16),
      rtt: meanRtt === null ? null : Number((meanRtt * factor).toFixed(1)),
      jitter: meanJitter === null ? null : Number((meanJitter * factor).toFixed(1)),
      loss: meanLoss === null ? null : Number(Math.min(100, meanLoss * factor).toFixed(2)),
    };
  });
}

function QualityChart({ data, metric, color, unit }: { data: ReturnType<typeof trend>; metric: "rtt" | "jitter" | "loss"; color: string; unit: string }) {
  return <ChartContainer className="sla-chart" aria-label={`${metric} trend`} config={{ [metric]: { label: metric, color } }}>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e8edf3" />
        <XAxis dataKey="time" minTickGap={35} tick={{ fontSize: 12, fill: "#909399" }} axisLine={{ stroke: "#e8edf3" }} tickLine={false} />
        <YAxis width={58} tick={{ fontSize: 12, fill: "#909399" }} axisLine={false} tickLine={false} unit={unit} domain={[0, "auto"]} />
        <Tooltip formatter={(value: number) => [`${value}${unit}`, metric === "rtt" ? "Mean RTT" : metric === "jitter" ? "Mean jitter · target → source" : "Mean loss · target → source"]} contentStyle={{ border: "1px solid #dcdfe6", borderRadius: 2, fontSize: 12 }} />
        <Area type="linear" dataKey={metric} stroke={color} fill={color} fillOpacity={0.45} strokeWidth={1} dot={false} isAnimationActive={false} connectNulls={false} />
      </AreaChart>
  </ChartContainer>;
}

export function IpSlaDashboard() {
  const [operations, setOperations] = useState(initialOperations);
  const [site, setSite] = useState("All sites");
  const [type, setType] = useState("All types");
  const [status, setStatus] = useState("All statuses");
  const [query, setQuery] = useState("");
  const [hours, setHours] = useState(6);
  const [refresh, setRefresh] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<"sd" | "ds">("ds");
  const [notice, setNotice] = useState("");
  const [showChrome, setShowChrome] = useState(false);
  const end = Date.UTC(2026, 9, 21, 8, refresh);
  const scoped = operations.filter(operation => (site === "All sites" || operation.site === site) && (type === "All types" || operation.type === type) && `${operation.device} ${operation.id} ${operation.target}`.toLowerCase().includes(query.toLowerCase()));
  const filtered = scoped.filter(operation => status === "All statuses" || health(operation) === status);
  const counts = healthOrder.map(name => ({ name, value: scoped.filter(operation => health(operation) === name).length }));
  const issues = filtered.filter(operation => health(operation) !== "Healthy" && health(operation) !== "Paused");
  const ranked = filtered.filter(usable).sort((left, right) => (right.rtt ?? 0) - (left.rtt ?? 0)).slice(0, 5);
  const selected = operations.find(operation => operation.key === selectedKey);
  const chartOperations = selected ? [selected] : filtered;
  const data = trend(chartOperations, hours, end);
  const hasChart = chartOperations.some(usable);
  const jitterOperations = filtered.filter(operation => usable(operation) && operation.type === "UDP Jitter").length;

  const exportCsv = () => {
    const rows = [["Device", "Operation ID", "Type", "Site", "Target", "Status", "RTT ms", "Jitter SD ms", "Jitter DS ms", "Loss SD %", "Loss DS %"], ...filtered.map(operation => [operation.device, operation.id, operation.type, operation.site, operation.target, health(operation), operation.rtt ?? "", operation.jitterSd ?? "", operation.jitterDs ?? "", operation.lossSd ?? "", operation.lossDs ?? ""])];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ip-sla-operations.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleCollection = (operation: Operation) => {
    setOperations(previous => previous.map(item => item.key === operation.key ? { ...item, enabled: !item.enabled } : item));
    setNotice(operation.enabled ? `Collection paused for ${operation.device} / ${operation.id}` : `Collection resumed for ${operation.device} / ${operation.id}`);
  };

  return <div className="np-app sla-app">
    {showChrome && <header className="np-top">
      <div className="np-brand"><Cloud size={23} /><span>Digital Operation Central Platform</span></div>
      <Home size={13} /><span>Products <ChevronDown size={10} /></span><i /><span>DOOP</span>
      <div className="np-top-right"><Search size={13} /><Bell size={13} /><b>云智慧集团</b><span>English <ChevronDown size={10} /></span><span>Admin <ChevronDown size={10} /></span></div>
    </header>}
    <div className="np-shell">
      {showChrome && <aside className="np-nav" aria-label="Main navigation">
        {navigation.map(item => <div key={item.label}>
          <button className={item.label === "Infrastructure" ? "np-nav-current" : ""} onClick={() => item.label !== "Infrastructure" && setNotice(`${item.label} is not available in this prototype`)}><item.icon size={13} /><span>{item.label}</span><ChevronDown size={11} /></button>
          {item.label === "Infrastructure" && <div className="np-subnav">{["Hosts", "Processes", "Kubernetes", "Network Devices", "Network Path", "IP SLA", "Resources", "Reports"].map(label => label === "Network Path" || label === "IP SLA" ? <Link key={label} className={label === "IP SLA" ? "active" : ""} href={label === "IP SLA" ? "/ip-sla" : "/network-path"} aria-current={label === "IP SLA" ? "page" : undefined}>{label}</Link> : <button key={label} onClick={() => setNotice(`${label} is not available in this prototype`)}>{label}</button>)}</div>}
        </div>)}
        <footer>7.1.0 <Layers size={12} /></footer>
      </aside>}
      <main className="np-main sla-main">
        {showChrome && <div className="np-workspace-tabs"><span><Activity size={12} />IP SLA</span><Link href="/network-path">Network Path</Link></div>}
        <div className="sla-module-header"><button type="button" role="switch" aria-checked={showChrome} aria-label="显示顶部导航与左侧菜单" title={showChrome ? "隐藏导航" : "显示导航"} className={`np-chrome-switch${showChrome ? " on" : ""}`} onClick={() => setShowChrome(value => !value)}><span /></button><h1>IP SLA</h1><span className="sla-demo">Demo data</span><div className="sla-header-actions"><Clock3 size={13} /><select aria-label="Time range" value={hours} onChange={event => setHours(Number(event.target.value))}><option value={1}>Last 1 hour</option><option value={6}>Last 6 hours</option><option value={24}>Last 24 hours</option></select><span className="sla-range-label">{new Date(end - hours * 3600000).toISOString().slice(0, 16).replace("T", " ")} – {new Date(end).toISOString().slice(11, 16)} UTC</span><button className="sla-icon-button" title="Refresh dashboard" aria-label="Refresh dashboard" onClick={() => { setRefresh(previous => previous + 1); setNotice("Dashboard refreshed"); }}><RefreshCw size={14} /></button></div></div>
        <div className="sla-content">
          {selected && <div className="sla-heading"><h2>{selected.device} / Operation {selected.id}</h2></div>}
          {selected ? <div className="sla-detail-toolbar"><button onClick={() => setSelectedKey(null)}><ArrowLeft size={14} />Back to dashboard</button><Badge state={health(selected)} /><span>{selected.type}</span><span>Cisco IP SLA</span><button className="sla-secondary sla-push-right" onClick={() => toggleCollection(selected)}>{selected.enabled ? <Pause size={13} /> : <Play size={13} />}{selected.enabled ? "Pause collection" : "Resume collection"}</button></div> : <div className="sla-filters">
            <label className="sla-search"><Search size={14} /><input aria-label="Search operations" placeholder="Search device, operation or target" value={query} onChange={event => setQuery(event.target.value)} /></label>
            <select aria-label="Site" value={site} onChange={event => setSite(event.target.value)}><option>All sites</option>{sites.map(value => <option key={value}>{value}</option>)}</select>
            <select aria-label="Operation type" value={type} onChange={event => setType(event.target.value)}><option>All types</option><option>ICMP Echo</option><option>UDP Jitter</option></select>
            <select aria-label="Operation status" value={status} onChange={event => setStatus(event.target.value)}><option>All statuses</option>{healthOrder.map(value => <option key={value}>{value}</option>)}</select>
            <button className="sla-icon-button" title="Reset filters" aria-label="Reset filters" onClick={() => { setSite("All sites"); setType("All types"); setStatus("All statuses"); setQuery(""); }}><RefreshCw size={14} /></button>
            <button className="sla-secondary sla-push-right" onClick={exportCsv}><Download size={13} />Export</button>
          </div>}

          {!selected && <>
            <DashboardSection title="Global overview" note={`Latest status · ${new Date(end).toISOString().slice(11, 19)} UTC`}>
            <section className="sla-summary" aria-label="Operation summary">
              {[{ name: "Monitored operations", value: scoped.length }, ...counts].map(item => <button className="sla-stat" key={item.name} aria-label={`Filter ${item.name}`} aria-pressed={status === (item.name === "Monitored operations" ? "All statuses" : item.name)} onClick={() => setStatus(item.name === "Monitored operations" || status === item.name ? "All statuses" : item.name)}><span>{item.name}</span><strong>{item.value}</strong></button>)}
            </section>
            <section className="sla-panel" aria-label="Operations with issues"><div className="sla-panel-title"><h3>Operations with issues <span className="sla-count">{issues.length}</span></h3><span>Quality, collection & freshness</span></div><OperationTable operations={issues} mode="issues" onSelect={setSelectedKey} onToggle={toggleCollection} />{!issues.length && <div className="sla-empty"><Check size={17} />No issues in this scope</div>}</section>
            </DashboardSection>
          </>}

          {selected && <section className="sla-endpoints"><div><Server size={22} /><div><small>Source device</small><strong>{selected.device}</strong><span>{selected.source} · {selected.site}</span></div></div><div className="sla-endpoint-link"><span>{selected.type}</span><ArrowRight size={24} /><small>{selected.type === "UDP Jitter" ? "UDP / 16384" : "ICMP"}</small></div><div><Network size={22} /><div><small>Target endpoint</small><strong>{selected.target}</strong><span>Operation {selected.id} · 60s interval</span></div></div></section>}
          {selected && <section className="sla-result-strip"><div><span>Device execution</span><strong>{selected.quality === "Down" ? "Timeout" : "OK"}</strong></div><div><span>Collection</span><strong>{!selected.enabled ? "Paused" : selected.collection === "error" ? "SNMP error" : "Success"}</strong></div><div><span>Result freshness</span><strong>{!selected.fresh ? "Stale · 18 min ago" : !selected.enabled || selected.collection === "error" ? "Last retained result" : "Fresh · 30s ago"}</strong></div><div><span>Latest RTT</span><strong>{number(selected.rtt, " ms")}</strong></div><div><span>Quality condition</span><strong>{reason(selected)}</strong></div></section>}

          <DashboardSection title={selected ? "Operation quality" : "Quality monitoring"} note={`${selected ? "Unique device results" : `Mean across valid operations · ${filtered.filter(usable).length} RTT / ${jitterOperations} UDP Jitter`} · UTC`}>
          <div className="sla-trend-grid">{([{ metric: "rtt", title: "Round-trip time", color: "#409eff", unit: "ms" }, { metric: "jitter", title: "Jitter · target → source", color: "#25a77a", unit: "ms" }, { metric: "loss", title: "Packet loss · target → source", color: "#d99519", unit: "%" }] as const).map(item => <section className="sla-panel" key={item.metric}><div className="sla-panel-title"><h3>{item.title}</h3><strong>{number(data[data.length - 1][item.metric], ` ${item.unit}`)}</strong></div>{!hasChart || (selected?.type === "ICMP Echo" && item.metric !== "rtt") || data.every(point => point[item.metric] === null) ? <div className="sla-chart-empty">{selected?.type === "ICMP Echo" && item.metric !== "rtt" ? "Not supported by ICMP Echo" : "No valid results in this scope"}</div> : <QualityChart data={data} metric={item.metric} color={item.color} unit={item.unit} />}</section>)}</div>
          </DashboardSection>

          {selected ? <section className="sla-panel sla-direction-panel"><div className="sla-panel-title"><h3>Directional measurements</h3><div className="sla-segment" role="group" aria-label="Measurement direction"><button aria-pressed={direction === "sd"} className={direction === "sd" ? "active" : ""} onClick={() => setDirection("sd")}>Source → target</button><button aria-pressed={direction === "ds"} className={direction === "ds" ? "active" : ""} onClick={() => setDirection("ds")}>Target → source</button></div></div><div className="sla-direction-values"><div><span>Jitter</span><strong>{number(direction === "sd" ? selected.jitterSd : selected.jitterDs, " ms")}</strong></div><div><span>Packet loss</span><strong>{number(direction === "sd" ? selected.lossSd : selected.lossDs, "%")}</strong></div><div><span>Measurement capability</span><strong>{selected.type === "UDP Jitter" ? "Bidirectional UDP Jitter" : "RTT only"}</strong></div></div></section> : <>
            <DashboardSection title="Operation details">
              <section className="sla-panel" aria-label="Top RTT"><div className="sla-panel-title"><h3>Top RTT</h3><span>Latest valid result · descending</span></div><OperationTable operations={ranked} mode="ranking" onSelect={setSelectedKey} onToggle={toggleCollection} />{!ranked.length && <div className="sla-empty">No valid device results</div>}</section>
              <section className="sla-panel" aria-label="All operations"><div className="sla-panel-title"><h3>All operations <span className="sla-count">{filtered.length}</span></h3><span>Cisco IP SLA · latest result</span></div><OperationTable operations={filtered} mode="all" onSelect={setSelectedKey} onToggle={toggleCollection} />{!filtered.length && <div className="sla-empty">No operations match the filters</div>}</section>
            </DashboardSection>
          </>}
        </div>
      </main>
    </div>
    {notice && <div className="sla-toast" role="status"><Check size={14} />{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={14} /></button></div>}
  </div>;
}
