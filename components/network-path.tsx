"use client";

import { useEffect, useState } from "react";
import { NetworkPathDetail } from "@/components/network-path-detail";
import { CiLink } from "@/components/ci-link";
import { cmdbByIp, cmdbByName, device as cmdbDevice } from "@/lib/cmdb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  ArrowDownUp,
  ArrowRight,
  Bell,
  Box,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Database,
  Download,
  Filter,
  Globe,
  Home,
  Layers,
  Map,
  MoreVertical,
  Network,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Workflow,
  X,
} from "lucide-react";

type Test = {
  id: string;
  source: string;
  destination: string;
  protocol: string;
  port: string;
  reach: number;
  rtt: number;
  site: string;
  env: string;
  interval?: string;
};
const ip = (name: string) => cmdbDevice(name).ip;
const initialTests: Test[] = [
  { id: "70de870cc48fbeaf", source: "SH-DC1-CORE-SW01", destination: ip("BJ-HQ-CORE-SW01"), protocol: "TCP", port: "443", reach: 99.8, rtt: 23, site: "sh-dc1", env: "production" },
  { id: "7d0e870cc48fbeaf", source: "SH-DC1-CORE-SW01", destination: ip("SZ-DC1-CORE-SW01"), protocol: "UDP", port: "", reach: 99.6, rtt: 34, site: "sh-dc1", env: "production" },
  { id: "4fba40ec9c4d24df", source: "BJ-HQ-EDGE-FW01", destination: ip("SH-DC1-DMZ-FW01"), protocol: "TCP", port: "443", reach: 98.9, rtt: 27, site: "bj-hq", env: "production" },
  { id: "a80246de490bb32c", source: "GZ-HQ-CORE-SW01", destination: ip("BJ-HQ-CORE-SW01"), protocol: "UDP", port: "", reach: 97.4, rtt: 41, site: "gz-hq", env: "production" },
  { id: "b3159c0d7e2a46f1", source: "SH-DC1-DMZ-FW01", destination: ip("HZ-CAMPUS-EDGE-FW01"), protocol: "TCP", port: "22", reach: 99.9, rtt: 9, site: "sh-dc1", env: "production" },
  { id: "c9e21b84a05d3f67", source: "BJ-HQ-CORE-SW01", destination: ip("WH-CAMPUS-CORE-SW01"), protocol: "TCP", port: "161", reach: 0, rtt: 0, site: "bj-hq", env: "production" },
];
const facetGroups = [
  { name: "PATH", fields: ["Origin", "Protocol"] },
  {
    name: "SOURCE",
    fields: [
      "Source Display Name",
      "Source Hostname",
      "Source Name",
      "Source Service",
    ],
  },
  {
    name: "DESTINATION",
    fields: [
      "Destination Hostname",
      "Destination IP Address",
      "Destination Port",
      "Destination Reachable",
      "Destination Reverse DNS",
      "Destination Service",
      "Destination TTL",
    ],
  },
  {
    name: "TRACEROUTE RUNS",
    fields: [
      "Destination AS Domain",
      "Destination AS Name",
      "Destination AS Number",
      "Hop Count",
    ],
  },
];
const navigation = [
  { label: "Event", icon: Activity },
  { label: "Inspection", icon: Layers },
  { label: "Biz Systems", icon: Box },
  { label: "APM", icon: Workflow },
  { label: "Infrastructure", icon: Network },
  { label: "RUM", icon: Activity },
  { label: "Transactions", icon: ArrowDownUp },
  { label: "LLM Observability", icon: Box },
  { label: "Query & Analysis", icon: Search },
  { label: "Visualization", icon: Map },
  { label: "Monitoring", icon: Activity },
  { label: "Data Governance", icon: Database },
  { label: "Discovery & Collection", icon: Layers },
  { label: "System Definition", icon: Settings },
];

function IconButton({
  label,
  onClick,
  children,
  active = false,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`np-icon ${active ? "active" : ""}`}
    >
      {children}
    </button>
  );
}

function Sparkline({
  value,
  latency = false,
}: {
  value: number;
  latency?: boolean;
}) {
  const samples = Array.from({ length: 31 }, (_, index) =>
    value === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            100,
            (latency ? 58 : value) +
              Math.sin(index * 2.1) * (latency ? 8 : 1.5) +
              Math.cos(index * 0.8) * 2,
          ),
        ),
  );
  const points = samples
    .map((sample, index) => `${index * 3},${26 - sample * 0.22}`)
    .join(" ");
  return (
    <svg
      className="np-spark"
      viewBox="0 0 90 30"
      role="img"
      aria-label={`${latency ? "RTT" : "Reachability"} trend: ${value}${latency ? " ms" : "%"}`}
    >
      <path
        d={`M0,28 L${points.replaceAll(" ", " L")} L90,28 Z`}
        fill="#c9e4ff"
      />
      <polyline points={points} fill="none" stroke="#409eff" strokeWidth="1" />
      <text x="1" y="7">
        {latency ? Math.round(value * 1.05) : value ? "100" : "0"}
      </text>
      <text x="1" y="28">
        0{latency ? "s" : "%"}
      </text>
    </svg>
  );
}

function Destination({ name }: { name: string }) {
  const ci = cmdbByIp.get(name) ?? cmdbByName.get(name);
  return (
    <span className="np-destination">
      {ci ? <Server size={12} /> : <Globe size={12} />}
      {name}
      {ci && <small className="np-ci-name">{ci.name}</small>}
      <CiLink ci={ci} />
    </span>
  );
}

function SourceName({ name }: { name: string }) {
  return (
    <>
      {name}
      <CiLink ci={cmdbByName.get(name)} />
    </>
  );
}

export function NetworkPath() {
  const [tests, setTests] = useState(initialTests);
  const [tab, setTab] = useState("Explorer");
  const [showChrome, setShowChrome] = useState(false);
  const [view, setView] = useState("Grouped Tests");
  const [groupBy, setGroupBy] = useState("source");
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("All");
  const [destination, setDestination] = useState("All");
  const [port, setPort] = useState("All");
  const [protocol, setProtocol] = useState("All");
  const [testId, setTestId] = useState("All");
  const [status, setStatus] = useState("All Tests");
  const [facetQuery, setFacetQuery] = useState("");
  const [openFacet, setOpenFacet] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>(["8.8.8.8", "1.1.1.1"]);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<"new" | "detail" | "map" | null>(null);
  const [detail, setDetail] = useState<Test>(initialTests[1]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [range, setRange] = useState("Past 4 Hours");
  const [timeOffset, setTimeOffset] = useState(0);
  const [refreshed, setRefreshed] = useState("Just now");
  const [limit, setLimit] = useState(100);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const [newSource, setNewSource] = useState(initialTests[0].source);
  const [newDestination, setNewDestination] = useState("");
  const [newProtocol, setNewProtocol] = useState("TCP");
  const [newPort, setNewPort] = useState("443");
  const [newInterval, setNewInterval] = useState("1 minute");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    null,
  );
  const [formError, setFormError] = useState("");
  const [saved, setSaved] = useState(false);
  const refresh = () => setRefreshed(new Date().toLocaleTimeString("en-GB"));
  useEffect(() => {
    const restoreDetail = () => {
      const id = new URL(location.href).searchParams.get("test");
      const shared = initialTests.find((test) => test.id === id);
      if (shared) {
        setDetail(shared);
        setTab("Explorer");
      }
      setDetailOpen(Boolean(shared));
    };
    restoreDetail();
    window.addEventListener("popstate", restoreDetail);
    return () => window.removeEventListener("popstate", restoreDetail);
  }, []);
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(
      () => setRefreshed(new Date().toLocaleTimeString("en-GB")),
      30000,
    );
    return () => clearInterval(timer);
  }, [paused]);
  useEffect(() => {
    if (!drawer) return;
    const dialog = document.querySelector<HTMLElement>(".np-drawer");
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]",
        ) || [],
      );
    if (!dialog?.contains(document.activeElement)) focusable()[0]?.focus();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(null);
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      previousFocus?.focus();
    };
  }, [drawer]);
  const filtered = tests
    .filter(
      (test) =>
        (source === "All" || test.source === source) &&
        (destination === "All" || test.destination === destination) &&
        (port === "All" || (test.port || "-") === port) &&
        (protocol === "All" || test.protocol === protocol) &&
        (testId === "All" || test.id === testId) &&
        (status === "All Tests" ||
          (status === "Reachable" ? test.reach > 0 : test.reach === 0)) &&
        `${test.source} ${test.destination} ${test.id} ${test.env} ${test.site}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((left, right) =>
      sortDirection
        ? sortDirection === "asc"
          ? left.rtt - right.rtt
          : right.rtt - left.rtt
        : 0,
    )
    .slice(0, limit);
  const groups = Object.entries(
    filtered.reduce<Record<string, Test[]>>((result, test) => {
      const key =
        groupBy === "source"
          ? `${test.source}|${test.destination}`
          : test.destination;
      (result[key] ||= []).push(test);
      return result;
    }, {}),
  );
  const visibleGroups = groups.slice((page - 1) * pageSize, page * pageSize);
  const toggleSelected = (id: string) =>
    setSelected(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  const openDetail = (test: Test) => {
    setDetail(test);
    setDetailOpen(true);
    setTab("Explorer");
    const url = new URL(location.href);
    url.searchParams.set("test", test.id);
    history.pushState(null, "", url);
  };
  const closeDetail = () => {
    setDetailOpen(false);
    const url = new URL(location.href);
    url.searchParams.delete("test");
    history.replaceState(null, "", url);
  };
  const resetPage = () => setPage(1);
  const exportTests = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "network-path-tests.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const saveView = () => {
    localStorage.setItem(
      "doop-network-path-view",
      JSON.stringify({
        query,
        source,
        destination,
        port,
        protocol,
        testId,
        status,
        view,
        groupBy,
        range,
      }),
    );
    setSaved(true);
    setNotice("View saved");
  };
  const restoreView = () => {
    const stored = localStorage.getItem("doop-network-path-view");
    if (!stored) {
      setNotice("No saved view");
      return;
    }
    const config = JSON.parse(stored);
    setQuery(config.query);
    setSource(config.source);
    setDestination(config.destination);
    setPort(config.port || "All");
    setProtocol(config.protocol);
    setTestId(config.testId);
    setStatus(config.status);
    setView(config.view);
    setGroupBy(config.groupBy);
    setRange(config.range);
    resetPage();
    setNotice("Saved view restored");
  };
  const metrics = (test: Test) => (
    <>
      <div className="np-metric">
        <strong>{test.reach}%</strong>
        <Sparkline value={test.reach} />
      </div>
      <div className="np-metric">
        <strong>{test.rtt ? `${test.rtt} ms` : "0 ns"}</strong>
        <Sparkline value={test.rtt} latency />
      </div>
    </>
  );
  const testRow = (test: Test) => (
    <div className="np-test-row" key={test.id}>
      <input
        aria-label={`Select ${test.destination} ${test.id}`}
        type="checkbox"
        checked={selected.includes(test.id)}
        onChange={() => toggleSelected(test.id)}
      />
      <span className={`np-status-line ${test.reach ? "" : "down"}`} />
      <button className="np-source-link" onClick={() => openDetail(test)}>
        <SourceName name={test.source} />
      </button>
      <ArrowRight size={14} />
      <button className="np-link" onClick={() => openDetail(test)}>
        <Destination name={test.destination} />
      </button>
      <div className="np-tags">
        <span>test_id:{test.id}</span>
        <span>env:{test.env}</span>
        <span>site:{test.site}</span>
        <button
          title={`origin:agent, team:infrastructure, region:apac`}
          onClick={() => openDetail(test)}
        >
          +3
        </button>
      </div>
      <span className="np-protocol">{test.protocol}</span>
      <span>{test.port || "-"}</span>
      {metrics(test)}
    </div>
  );
  const testHeader = (
    <div className="np-test-header">
      <span />
      <span />
      <span>SOURCE</span>
      <span />
      <span>DESTINATION</span>
      <span>TAGS</span>
      <span>PROTOCOL</span>
      <span>PORT</span>
      <span>AVG REACHABILITY</span>
      <span>AVG RTT</span>
    </div>
  );
  const facetValues = (field: string) =>
    field === "Protocol"
      ? ["TCP", "UDP"]
      : field === "Destination Reachable"
        ? ["Reachable", "Unreachable"]
        : field.includes("Source")
          ? [...new Set(tests.map((test) => test.source))]
          : field.includes("Port")
            ? [...new Set(tests.map((test) => test.port || "-"))]
            : field === "Origin"
              ? ["agent"]
              : field.includes("AS")
                ? ["Google LLC", "Cloudflare, Inc."]
                : field === "Hop Count"
                  ? ["8", "12"]
                  : field.includes("TTL")
                    ? ["64", "128"]
                    : [...new Set(tests.map((test) => test.destination))];

  return (
    <div className="np-app">
      {showChrome && (
      <header className="np-top">
        <div className="np-brand">
          <Cloud size={23} />
          <span>Digital Operation Central Platform</span>
        </div>
        <Home size={13} />
        <span>
          Products <ChevronDown size={10} />
        </span>
        <i />
        <span>DOOP</span>
        <div className="np-top-right">
          <Search size={13} />
          <Bell size={13} />
          <b>云智慧集团</b>
          <span>
            English <ChevronDown size={10} />
          </span>
          <span>
            Admin <ChevronDown size={10} />
          </span>
        </div>
      </header>
      )}
      <div className="np-shell">
        {showChrome && (
        <aside className="np-nav">
          {navigation.map((item) => (
            <div key={item.label}>
              <button
                className={
                  item.label === "Infrastructure" ? "np-nav-current" : ""
                }
                onClick={() =>
                  item.label !== "Infrastructure" &&
                  setNotice(
                    `${item.label} is outside the Network Path prototype`,
                  )
                }
              >
                <item.icon size={13} />
                <span>{item.label}</span>
                <ChevronDown size={11} />
              </button>
              {item.label === "Infrastructure" && (
                <div className="np-subnav">
                  {[
                    "Hosts",
                    "Processes",
                    "Kubernetes",
                    "Network Devices",
                    "Network Path",
                    "IP SLA",
                    "Resources",
                    "Reports",
                  ].map((label) => (
                    <button
                      key={label}
                      className={label === "Network Path" ? "active" : ""}
                      onClick={() => {
                        if (label === "IP SLA") {
                          window.location.assign("/ip-sla");
                        } else if (label !== "Network Path") {
                          setNotice(
                            `${label} is outside the Network Path prototype`,
                          );
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <footer>
            7.1.0 <Layers size={12} />
          </footer>
        </aside>
        )}
        <main className="np-main">
          {showChrome && (
          <div className="np-workspace-tabs">
            <span>
              <Network size={12} /> Network Path
            </span>
            <a href="/pipeline">
              Netflow Pipeline <X size={10} />
            </a>
            <span className="np-muted-tab">
              default <X size={10} />
            </span>
            <MoreVertical size={13} />
          </div>
          )}
          <div className="np-module-header">
            <button
              type="button"
              role="switch"
              aria-checked={showChrome}
              aria-label="显示顶部导航与左侧菜单"
              title={showChrome ? "隐藏导航" : "显示导航"}
              className={`np-chrome-switch${showChrome ? " on" : ""}`}
              onClick={() => setShowChrome((value) => !value)}
            >
              <span />
            </button>
            <button className="np-my-view" onClick={restoreView}>
              My View
            </button>
            <h1>Network Path</h1>
            <small className="np-demo">Demo data</small>
            <div className="np-module-tabs">
              <div>
                {["Explorer", "Dashboards"].map((item) => (
                  <button
                    key={item}
                    className={tab === item ? "active" : ""}
                    onClick={() => {
                      setTab(item);
                      closeDetail();
                    }}
                  >
                    {item === "Dashboards" && <Activity size={12} />}
                    {item}
                    {item === "Dashboards" && <ChevronDown size={10} />}
                  </button>
                ))}
              </div>
              {!detailOpen && (
                <button
                  className="np-primary"
                  onClick={() => {
                    setFormError("");
                    setDrawer("new");
                  }}
                >
                  <Plus size={14} /> New Test
                </button>
              )}
            </div>
            <div className="np-viewbar">
              {!detailOpen && (
                <>
                  <IconButton label="Save current view" onClick={saveView}>
                    {saved ? <Check size={13} /> : <MoreVertical size={13} />}
                  </IconButton>
                </>
              )}
              <div className="np-timebar">
                <span>UTC+08:00</span>
                <select
                  aria-label="Time range"
                  value={range}
                  onChange={(event) => {
                    setRange(event.target.value);
                    setTimeOffset(0);
                    refresh();
                  }}
                >
                  {[
                    "Past 15 Minutes",
                    "Past 1 Hour",
                    "Past 4 Hours",
                    "Past 1 Day",
                    "Past 7 Days",
                  ].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
                {timeOffset !== 0 && (
                  <small>
                    {Math.abs(timeOffset)} window
                    {Math.abs(timeOffset) > 1 ? "s" : ""}{" "}
                    {timeOffset < 0 ? "earlier" : "later"}
                  </small>
                )}
                <IconButton
                  label="Previous time window"
                  onClick={() => setTimeOffset(timeOffset - 1)}
                >
                  <ChevronLeft size={13} />
                </IconButton>
                <IconButton
                  label={paused ? "Resume refresh" : "Pause refresh"}
                  active={!paused}
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? <Play size={13} /> : <Pause size={13} />}
                </IconButton>
                <IconButton
                  label="Next time window"
                  onClick={() => setTimeOffset(timeOffset + 1)}
                >
                  <ChevronRight size={13} />
                </IconButton>
                <IconButton label="Refresh" onClick={refresh}>
                  <RefreshCw size={13} />
                </IconButton>
              </div>
            </div>
          </div>
          {notice && (
            <div className="np-notice" role="status">
              {notice}
              <IconButton label="Dismiss" onClick={() => setNotice("")}>
                <X size={12} />
              </IconButton>
            </div>
          )}
          {detailOpen && (
            <NetworkPathDetail
              test={detail}
              tests={tests}
              range={range}
              timeOffset={timeOffset}
              onBack={closeDetail}
              onChangeTest={openDetail}
            />
          )}
          {tab === "Explorer" && !detailOpen && (
            <>
              <section className="np-filterbar">
                <div className="np-search">
                  <Search size={13} />
                  <input
                    aria-label="Search tests"
                    placeholder="Search for"
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      resetPage();
                    }}
                  />
                  <IconButton
                    label="Show facets"
                    onClick={() => {
                      setCollapsed([]);
                      setFacetQuery("");
                    }}
                  >
                    <Filter size={12} />
                  </IconButton>
                </div>
                {[
                  {
                    label: "Source Display Name",
                    value: source,
                    setter: setSource,
                    options: [...new Set(tests.map((test) => test.source))],
                  },
                  {
                    label: "Destination Hostname",
                    value: destination,
                    setter: setDestination,
                    options: [
                      ...new Set(tests.map((test) => test.destination)),
                    ],
                  },
                  {
                    label: "Destination Port",
                    value: port,
                    setter: setPort,
                    options: [
                      ...new Set(tests.map((test) => test.port || "-")),
                    ],
                  },
                  {
                    label: "Test Run Type",
                    value: protocol,
                    setter: setProtocol,
                    options: ["TCP", "UDP", "ICMP"],
                  },
                  {
                    label: "Test ID",
                    value: testId,
                    setter: setTestId,
                    options: tests.map((test) => test.id),
                  },
                ].map((filter) => (
                  <label className="np-filter" key={filter.label}>
                    <span>{filter.label}</span>
                    <select
                      aria-label={filter.label}
                      value={filter.value}
                      onChange={(event) => {
                        filter.setter(event.target.value);
                        resetPage();
                      }}
                    >
                      <option>All</option>
                      {filter.options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                ))}
                <div className="np-view-options">
                  <span>View By</span>
                  <Select
                    value={view === "Individual Tests" ? "individual" : groupBy}
                    onValueChange={(value) => {
                      setView(
                        value === "individual"
                          ? "Individual Tests"
                          : "Grouped Tests",
                      );
                      if (value !== "individual") setGroupBy(value);
                      resetPage();
                    }}
                  >
                    <SelectTrigger
                      className="np-view-trigger"
                      aria-label="View By"
                    >
                      <SelectValue>
                        {view === "Individual Tests"
                          ? "Individual Tests"
                          : "Group by tags"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="np-view-menu">
                      <SelectItem value="individual">
                        Individual Tests
                      </SelectItem>
                      <SelectItem value="source">
                        source.display_name × destination.hostname
                      </SelectItem>
                      <SelectItem value="destination">
                        destination.hostname
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <button
                  className="np-blue-link"
                  onClick={() => {
                    setOpenFacet("Protocol");
                    setCollapsed([]);
                  }}
                >
                  <Plus size={13} /> Add Facet
                </button>
                <button
                  className="np-blue-link"
                  onClick={() => {
                    setQuery("");
                    setSource("All");
                    setDestination("All");
                    setPort("All");
                    setProtocol("All");
                    setTestId("All");
                    setStatus("All Tests");
                    resetPage();
                  }}
                >
                  Reset
                </button>
              </section>
              <div className="np-explorer">
                <aside className="np-facets">
                  <div className="np-facet-search">
                    <Search size={12} />
                    <input
                      placeholder="Search facets"
                      aria-label="Search facets"
                      value={facetQuery}
                      onChange={(event) => setFacetQuery(event.target.value)}
                    />
                  </div>
                  <div className="np-facet-meta">
                    Showing{" "}
                    {
                      facetGroups
                        .flatMap((group) => group.fields)
                        .filter((field) =>
                          field
                            .toLowerCase()
                            .includes(facetQuery.toLowerCase()),
                        ).length
                    }{" "}
                    of 20{" "}
                    <button
                      onClick={() => {
                        setOpenFacet("Protocol");
                        setCollapsed([]);
                      }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {facetGroups.map((group) => (
                    <div key={group.name}>
                      <button
                        className="np-facet-group"
                        onClick={() =>
                          setCollapsed(
                            collapsed.includes(group.name)
                              ? collapsed.filter((item) => item !== group.name)
                              : [...collapsed, group.name],
                          )
                        }
                      >
                        {collapsed.includes(group.name) ? (
                          <ChevronRight size={12} />
                        ) : (
                          <ChevronDown size={12} />
                        )}
                        {group.name}
                      </button>
                      {!collapsed.includes(group.name) &&
                        group.fields
                          .filter((field) =>
                            field
                              .toLowerCase()
                              .includes(facetQuery.toLowerCase()),
                          )
                          .map((field) => (
                            <div key={field}>
                              <button
                                className="np-facet-field"
                                onClick={() =>
                                  setOpenFacet(
                                    openFacet === field ? null : field,
                                  )
                                }
                              >
                                {openFacet === field ? (
                                  <ChevronDown size={12} />
                                ) : (
                                  <ChevronRight size={12} />
                                )}
                                <span>{field}</span>
                              </button>
                              {openFacet === field && (
                                <div className="np-facet-values">
                                  {facetValues(field).map((value) => (
                                    <button
                                      key={value}
                                      onClick={() => {
                                        if (field === "Protocol")
                                          setProtocol(
                                            protocol === value ? "All" : value,
                                          );
                                        else if (
                                          field === "Destination Reachable"
                                        )
                                          setStatus(
                                            status === value
                                              ? "All Tests"
                                              : value,
                                          );
                                        else if (field.includes("Source"))
                                          setSource(
                                            source === value ? "All" : value,
                                          );
                                        else if (field === "Destination Port")
                                          setPort(
                                            port === value ? "All" : value,
                                          );
                                        else if (
                                          [
                                            "Destination Hostname",
                                            "Destination IP Address",
                                            "Destination Reverse DNS",
                                          ].includes(field)
                                        )
                                          setDestination(
                                            destination === value
                                              ? "All"
                                              : value,
                                          );
                                        else
                                          setNotice(
                                            `${field}: ${value} (sample metadata)`,
                                          );
                                        resetPage();
                                      }}
                                    >
                                      {value}
                                      <span>
                                        {tests.filter((test) =>
                                          [
                                            test.source,
                                            test.destination,
                                            test.protocol,
                                            test.port,
                                          ].includes(value),
                                        ).length || tests.length}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                    </div>
                  ))}
                </aside>
                <section className="np-results">
                  <div className="np-results-toolbar">
                    <div className="np-segment np-status-segment">
                      {["All Tests", "Reachable", "Unreachable"].map((item) => (
                        <button
                          className={status === item ? "active" : ""}
                          key={item}
                          onClick={() => {
                            setStatus(item);
                            resetPage();
                          }}
                        >
                          {item} (
                          {item === "All Tests"
                            ? tests.length
                            : tests.filter((test) =>
                                item === "Reachable"
                                  ? test.reach > 0
                                  : test.reach === 0,
                              ).length}
                          )
                        </button>
                      ))}
                    </div>
                    <span>
                      Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–
                      {Math.min(
                        page * pageSize,
                        view === "Grouped Tests"
                          ? groups.length
                          : filtered.length,
                      )}{" "}
                      of{" "}
                      {view === "Grouped Tests"
                        ? groups.length
                        : filtered.length}{" "}
                      results
                    </span>
                    <button
                      className="np-outline"
                      disabled={!selected.length}
                      onClick={() => setSelected([])}
                    >
                      Clear Selections
                    </button>
                    <button
                      className="np-primary"
                      disabled={selected.length < 2}
                      onClick={() => setDrawer("map")}
                    >
                      <Map size={12} /> Create Multi-Test Map
                      {selected.length > 0 ? ` (${selected.length})` : ""}
                    </button>
                  </div>
                  <div className="np-table-scroll">
                    {view === "Grouped Tests" ? (
                      <div className="np-group-table">
                        <div className="np-group-caption">
                          <span />
                          <span>SOURCE</span>
                          <span>DESTINATION</span>
                          <span>METRICS</span>
                        </div>
                        <div className="np-group-header">
                          <span />
                          <span>DISPLAY NAME</span>
                          <span>HOSTNAME</span>
                          <span>AVG REACHABILITY</span>
                          <button
                            title={
                              sortDirection === "asc"
                                ? "Sort RTT descending"
                                : "Sort RTT ascending"
                            }
                            onClick={() => {
                              setSortDirection(
                                sortDirection === "asc" ? "desc" : "asc",
                              );
                              resetPage();
                            }}
                          >
                            <ArrowDownUp size={12} /> AVG RTT
                          </button>
                        </div>
                        {visibleGroups.map(([key, items]) => {
                          const test = items[0];
                          const aggregate = {
                            ...test,
                            reach:
                              Math.round(
                                (items.reduce(
                                  (sum, item) => sum + item.reach,
                                  0,
                                ) /
                                  items.length) *
                                  10,
                              ) / 10,
                            rtt: Math.round(
                              items.reduce((sum, item) => sum + item.rtt, 0) /
                                items.length,
                            ),
                          };
                          const isExpanded = expanded.includes(
                            test.destination,
                          );
                          return (
                            <div key={key}>
                              <div className="np-group-row">
                                <IconButton
                                  label={`${isExpanded ? "Collapse" : "Expand"} ${test.destination}`}
                                  onClick={() =>
                                    setExpanded(
                                      isExpanded
                                        ? expanded.filter(
                                            (item) => item !== test.destination,
                                          )
                                        : [...expanded, test.destination],
                                    )
                                  }
                                >
                                  {isExpanded ? (
                                    <ChevronDown size={13} />
                                  ) : (
                                    <ChevronRight size={13} />
                                  )}
                                </IconButton>
                                <button
                                  className="np-source-link"
                                  onClick={() => openDetail(test)}
                                >
                                  {groupBy === "source"
                                    ? <SourceName name={test.source} />
                                    : `${items.length} source${items.length > 1 ? "s" : ""}`}
                                </button>
                                <button
                                  className="np-link"
                                  onClick={() => openDetail(test)}
                                >
                                  <Destination name={test.destination} />
                                </button>
                                {metrics(aggregate)}
                              </div>
                              {isExpanded && (
                                <div className="np-expanded">
                                  {testHeader}
                                  {items.map(testRow)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="np-individual-table">
                        {testHeader}
                        {filtered
                          .slice((page - 1) * pageSize, page * pageSize)
                          .map(testRow)}
                      </div>
                    )}
                    {filtered.length === 0 && (
                      <div className="np-empty">
                        <Search size={24} />
                        <strong>No tests match your filters</strong>
                        <button
                          className="np-blue-link"
                          onClick={() => {
                            setQuery("");
                            setSource("All");
                            setDestination("All");
                            setPort("All");
                            setProtocol("All");
                            setTestId("All");
                            setStatus("All Tests");
                            resetPage();
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="np-pagination">
                    <div>
                      Show top{" "}
                      <div className="np-segment">
                        {[100, 1000].map((value) => (
                          <button
                            className={limit === value ? "active" : ""}
                            key={value}
                            onClick={() => {
                              setLimit(value);
                              resetPage();
                            }}
                          >
                            {value}
                          </button>
                        ))}
                      </div>{" "}
                      results
                    </div>
                    <span className="np-update">
                      {paused ? "Paused" : `Updated: ${refreshed}`}
                    </span>
                    <label>
                      Results per page:{" "}
                      <select
                        aria-label="Results per page"
                        value={pageSize}
                        onChange={(event) => {
                          setPageSize(Number(event.target.value));
                          resetPage();
                        }}
                      >
                        <option>10</option>
                        <option>50</option>
                        <option>100</option>
                      </select>
                    </label>
                    <IconButton
                      label="Previous page"
                      onClick={() => setPage(Math.max(1, page - 1))}
                    >
                      <ChevronLeft size={12} />
                    </IconButton>
                    <span>{page}</span>
                    <IconButton
                      label="Next page"
                      onClick={() =>
                        setPage(
                          Math.min(
                            Math.max(
                              1,
                              Math.ceil(
                                (view === "Grouped Tests"
                                  ? groups.length
                                  : filtered.length) / pageSize,
                              ),
                            ),
                            page + 1,
                          ),
                        )
                      }
                    >
                      <ChevronRight size={12} />
                    </IconButton>
                  </div>
                </section>
              </div>
            </>
          )}
          {tab === "Configs" && (
            <section className="np-secondary">
              <div className="np-section-title">
                <h2>Network Path Tests</h2>
                <button className="np-outline" onClick={exportTests}>
                  <Download size={13} /> Export
                </button>
              </div>
              <div className="np-simple-table">
                <div className="np-config-header">
                  <span>TEST ID / SOURCE</span>
                  <span>DESTINATION</span>
                  <span>PROTOCOL</span>
                  <span>STATUS</span>
                  <span />
                </div>
                {tests.map((test) => (
                  <div className="np-config-row" key={test.id}>
                    <button
                      className="np-source-link"
                      onClick={() => openDetail(test)}
                    >
                      <SourceName name={test.source} />
                      <small>{test.id}</small>
                    </button>
                    <Destination name={test.destination} />
                    <span>
                      {test.protocol}
                      {test.port && ` : ${test.port}`}
                    </span>
                    <span className={test.reach ? "np-green" : "np-red"}>
                      {test.reach ? "Reachable" : "Unreachable"}
                    </span>
                    <IconButton
                      label={`Delete test ${test.destination}`}
                      onClick={() => {
                        setTests(tests.filter((item) => item.id !== test.id));
                        setSelected(selected.filter((id) => id !== test.id));
                      }}
                    >
                      <X size={13} />
                    </IconButton>
                  </div>
                ))}
              </div>
            </section>
          )}
          {tab === "Dashboards" && (
            <section className="np-secondary">
              <h2>Network Path Overview</h2>
              <div className="np-dashboard-stats">
                {[
                  ["Tests", tests.length],
                  ["Reachable", tests.filter((test) => test.reach > 0).length],
                  ["Unreachable", tests.filter((test) => !test.reach).length],
                  [
                    "Average RTT",
                    `${Math.round(tests.reduce((sum, test) => sum + test.rtt, 0) / (tests.length || 1))} ms`,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <h3>Destination Performance</h3>
              {tests.map((test) => (
                <div className="np-dashboard-row" key={test.id}>
                  <Destination name={test.destination} />
                  <div className="np-reach-bar">
                    <span style={{ width: `${test.reach}%` }} />
                  </div>
                  <strong>{test.reach}%</strong>
                  <span>{test.rtt} ms</span>
                  <button
                    className="np-blue-link"
                    onClick={() => openDetail(test)}
                  >
                    View Path <ArrowRight size={12} />
                  </button>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
      {drawer && (
        <div className="np-overlay" onClick={() => setDrawer(null)}>
          <section
            className={`np-drawer ${drawer === "map" ? "np-wide-drawer" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              drawer === "new"
                ? "New Network Path Test"
                : drawer === "map"
                  ? "Multi-Test Map"
                  : "Network Path Details"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <small>NETWORK PATH</small>
                <h2>
                  {drawer === "new"
                    ? "New Test"
                    : drawer === "map"
                      ? "Multi-Test Map"
                      : detail.destination}
                </h2>
              </div>
              <IconButton label="Close dialog" onClick={() => setDrawer(null)}>
                <X size={18} />
              </IconButton>
            </header>
            {drawer === "new" ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (
                    !newDestination.trim() ||
                    /\s|[/:]/.test(newDestination) ||
                    !newSource.trim()
                  ) {
                    setFormError(
                      "Enter a valid hostname or IP address without a URL scheme.",
                    );
                    return;
                  }
                  if (
                    newProtocol !== "ICMP" &&
                    (!/^\d+$/.test(newPort) ||
                      Number(newPort) < 1 ||
                      Number(newPort) > 65535)
                  ) {
                    setFormError("Port must be between 1 and 65535.");
                    return;
                  }
                  const created = {
                    id: crypto.randomUUID().replaceAll("-", "").slice(0, 16),
                    source: newSource.trim(),
                    destination: newDestination.trim(),
                    protocol: newProtocol,
                    port: newProtocol === "ICMP" ? "" : newPort,
                    reach: 0,
                    rtt: 0,
                    site: "sh-dc1",
                    env: "production",
                    interval: newInterval,
                  };
                  setTests([...tests, created]);
                  setDrawer(null);
                  setNewDestination("");
                  setNotice(
                    "Test created in demo data. No network probe has been started.",
                  );
                }}
              >
                <label>
                  Source
                  <input
                    required
                    value={newSource}
                    onChange={(event) => setNewSource(event.target.value)}
                  />
                </label>
                <label>
                  Destination
                  <input
                    autoFocus
                    required
                    placeholder="Hostname or IP address"
                    value={newDestination}
                    onChange={(event) => setNewDestination(event.target.value)}
                  />
                </label>
                <div className="np-form-grid">
                  <label>
                    Protocol
                    <select
                      aria-label="Protocol"
                      value={newProtocol}
                      onChange={(event) => setNewProtocol(event.target.value)}
                    >
                      <option>TCP</option>
                      <option>UDP</option>
                      <option>ICMP</option>
                    </select>
                  </label>
                  {newProtocol !== "ICMP" && (
                    <label>
                      Port
                      <input
                        type="number"
                        min="1"
                        max="65535"
                        required
                        value={newPort}
                        onChange={(event) => setNewPort(event.target.value)}
                      />
                    </label>
                  )}
                </div>
                <label>
                  Test interval
                  <select
                    aria-label="Test interval"
                    value={newInterval}
                    onChange={(event) => setNewInterval(event.target.value)}
                  >
                    <option>1 minute</option>
                    <option>5 minutes</option>
                    <option>15 minutes</option>
                  </select>
                </label>
                <label>
                  Tags
                  <input
                    defaultValue="env:production, site:sh-dc1"
                    readOnly
                  />
                </label>
                {formError && (
                  <p className="np-red" role="alert">
                    {formError}
                  </p>
                )}
                <div className="np-form-actions">
                  <button
                    type="button"
                    className="np-outline"
                    onClick={() => setDrawer(null)}
                  >
                    Cancel
                  </button>
                  <button className="np-primary" type="submit">
                    <Plus size={14} /> Create Test
                  </button>
                </div>
              </form>
            ) : (
              <div className="np-detail-body">
                {drawer === "detail" && (
                  <>
                    <div className="np-detail-source">
                      <Server size={15} />
                      {detail.source}
                      <ArrowRight size={14} />
                      <Destination name={detail.destination} />
                    </div>
                    <div className="np-detail-stats">
                      <div>
                        <span>Average Reachability</span>
                        <strong
                          className={detail.reach ? "np-green" : "np-red"}
                        >
                          {detail.reach}%
                        </strong>
                      </div>
                      <div>
                        <span>Average RTT</span>
                        <strong>{detail.rtt} ms</strong>
                      </div>
                      <div>
                        <span>Protocol / Port</span>
                        <strong>
                          {detail.protocol} {detail.port || ""}
                        </strong>
                      </div>
                    </div>
                    <h3>Path Map</h3>
                    <small className="np-muted">
                      Illustrative route · simulated data
                    </small>
                  </>
                )}
                {(drawer === "map"
                  ? tests.filter((test) => selected.includes(test.id))
                  : [detail]
                ).map((test) => (
                  <div key={test.id} className="np-route">
                    <div className="np-route-name">
                      <Destination name={test.destination} />
                      <span className={test.reach ? "np-green" : "np-red"}>
                        {test.reach ? "Reachable" : "Unreachable"}
                      </span>
                    </div>
                    <div className="np-path-nodes">
                      {[
                        { name: "Source", ip: test.source, icon: Server },
                        { name: "Gateway", ip: "192.168.1.1", icon: Network },
                        { name: "Transit", ip: "203.0.113.1", icon: Workflow },
                        {
                          name: "Destination",
                          ip: test.destination,
                          icon: Globe,
                        },
                      ].map((hop, index) => (
                        <div className="np-hop" key={hop.name}>
                          <div
                            className={`np-hop-icon ${index === 3 && !test.reach ? "down" : ""}`}
                          >
                            <hop.icon size={20} />
                          </div>
                          <b>{hop.name}</b>
                          <span>{hop.ip}</span>
                          {index < 3 && (
                            <ArrowRight className="np-hop-arrow" size={18} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {drawer === "detail" && (
                  <>
                    <h3>Traceroute Runs</h3>
                    <div className="np-hops-table">
                      <div>
                        <b>HOP</b>
                        <b>HOSTNAME / IP</b>
                        <b>RTT</b>
                        <b>STATUS</b>
                      </div>
                      {["192.168.1.1", "203.0.113.1", detail.destination].map(
                        (ip, index) => (
                          <div key={ip}>
                            <span>{index + 1}</span>
                            <span>{ip}</span>
                            <span>
                              {detail.reach
                                ? `${Math.round((detail.rtt * (index + 1)) / 3)} ms`
                                : "-"}
                            </span>
                            <span
                              className={
                                index === 2 && !detail.reach
                                  ? "np-red"
                                  : "np-green"
                              }
                            >
                              {index === 2 && !detail.reach
                                ? "Timeout"
                                : "Responded"}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    <h3>Test Tags</h3>
                    <div className="np-detail-tags">
                      <span>test_id:{detail.id}</span>
                      <span>env:{detail.env}</span>
                      <span>site:{detail.site}</span>
                      <span>origin:agent</span>
                      <span>team:infrastructure</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
