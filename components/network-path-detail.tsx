"use client";

import { useEffect, useRef, useState } from "react";
import { NetworkPathAnalysis } from "./network-path-analysis";
import {
  buildPathSnapshot,
  type PathIssue,
  type PathStats,
} from "@/lib/network-path-model";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Expand,
  Globe,
  Info,
  Layers,
  Minus,
  Network,
  Plus,
  Scan,
  Search,
  Server,
  Settings2,
  Share2,
  Workflow,
  X,
} from "lucide-react";
import "@xyflow/react/dist/style.css";
import {
  BaseEdge,
  EdgeLabelRenderer,
  ReactFlow,
  ReactFlowProvider,
  getBezierPath,
  Handle,
  MarkerType,
  Position,
  useReactFlow,
  useViewport,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@/app/network-path/network-path-detail.css";

type PathTest = {
  id: string;
  source: string;
  destination: string;
  protocol: string;
  port: string;
  reach: number;
  rtt: number;
  site: string;
  env: string;
};
type DetailProps = {
  test: PathTest;
  tests: PathTest[];
  range: string;
  timeOffset: number;
  onBack: () => void;
  onChangeTest: (test: PathTest) => void;
};
type HopData = {
  label: string;
  subtitle?: string;
  latency: number | null;
  kind: "source" | "hop" | "asn" | "location" | "destination" | "unknown";
  children?: number;
  asn?: string;
  packetLoss?: number;
  selected?: boolean;
  dimmed?: boolean;
  ip?: string;
  asName?: string;
  traversed: number;
  stats?: PathStats;
  issueCount?: number;
  highlighted?: boolean;
  onSelect: () => void;
  onExpand?: () => void;
};
type HopNode = Node<HopData, "hop">;
type GroupFrameNode = Node<
  {
    label: string;
    count: number;
    onCollapse?: () => void;
  },
  "expandedGroup"
>;

function ExpandedGroupFrame({ data }: NodeProps<GroupFrameNode>) {
  return (
    <div
      className="npd-group-boundary"
      role="group"
      aria-label={`Expanded from ${data.label}`}
    >
      <header>
        <Layers size={12} />
        <span title={`Expanded from ${data.label}`}>
          <small>Expanded from</small>
          <strong>{data.label}</strong>
        </span>
        <small>{data.count} hops</small>
        {data.onCollapse && (
          <button
            className="nodrag nopan"
            title={`Collapse ${data.label}`}
            aria-label={`Collapse group frame ${data.label}`}
            onClick={data.onCollapse}
          >
            <X size={13} />
          </button>
        )}
      </header>
    </div>
  );
}

function HopObservation({
  data,
  issues,
  onIssue,
}: {
  data: HopData;
  issues: PathIssue[];
  onIssue: (id: string) => void;
}) {
  return (
    <section className="npd-hop-observation" aria-label="Node observations">
      <table aria-label="RTT statistics">
        <caption>RTT latency</caption>
        <thead>
          <tr>
            {["Latest", "Min", "Avg", "Max"].map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {(["latest", "min", "avg", "max"] as const).map((key) => (
              <td key={key}>{data.stats ? `${data.stats[key]} ms` : "N/A"}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="npd-observed-loss">
        <span>
          {data.kind === "destination"
            ? "End-to-end packet loss"
            : "Hop response loss"}
        </span>
        <strong>
          {data.kind === "unknown" ? "N/A" : `${data.packetLoss || 0}%`}
        </strong>
      </div>
      {issues.map((issue) => (
        <button
          key={issue.id}
          className="npd-node-issue"
          onClick={() => onIssue(issue.id)}
        >
          <AlertTriangle size={12} />
          {issue.title}
          <ChevronRight size={12} />
        </button>
      ))}
    </section>
  );
}

function HopCard({ data }: NodeProps<HopNode>) {
  const Icon =
    data.kind === "source"
      ? Server
      : data.kind === "asn"
        ? Workflow
        : data.kind === "location"
          ? Globe
          : data.kind === "destination"
            ? Network
            : data.kind === "unknown"
              ? Info
              : Network;
  const loss = data.packetLoss || 0;
  const unreachable = data.kind === "destination" && loss === 100;
  if (data.kind === "unknown")
    return (
      <div className="npd-unknown-node">
        <Handle type="target" position={Position.Left} />
        <button
          className="nodrag nopan"
          aria-label="Inspect Unknown"
          onClick={data.onSelect}
        >
          <span />
        </button>
        <small>Unknown</small>
        <Handle type="source" position={Position.Right} />
      </div>
    );
  return (
    <div
      className={`npd-hop-card npd-kind-${data.kind} ${unreachable ? "unreachable" : loss > 0 ? "unstable" : ""} ${data.selected ? "selected" : ""} ${data.dimmed ? "dimmed" : ""} ${data.highlighted ? "issue-highlighted" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <Handle id="in-top" type="target" position={Position.Top} />
      {(loss > 0 || data.kind === "destination") && (
        <div className="npd-unstable-label">
          <Activity size={10} />{" "}
          {unreachable
            ? "Destination is unreachable"
            : data.kind !== "destination"
              ? "Hop response warning"
              : loss > 0
                ? "Destination is unstable"
                : "Destination is reachable"}
        </div>
      )}
      <button
        className="npd-node-main nodrag nopan"
        onClick={data.children ? data.onExpand : data.onSelect}
        aria-label={
          data.children ? `Expand group ${data.label}` : `Select ${data.label}`
        }
      >
        <span className="npd-node-symbol">
          <Icon size={12} />
        </span>
        <span>
          <strong title={data.label}>{data.label}</strong>
          {data.subtitle && (
            <small title={data.subtitle}>{data.subtitle}</small>
          )}
          {data.children && <small>{data.children} child nodes</small>}
          {Boolean(data.issueCount) && (
            <small className="npd-node-warning">
              <AlertTriangle size={10} />
              {data.issueCount} issue{data.issueCount === 1 ? "" : "s"}
            </small>
          )}
        </span>
      </button>
      {data.children ? (
        <button
          className="npd-node-expand nodrag nopan"
          aria-label={`Expand ${data.label}`}
          onClick={data.onExpand}
        >
          <Layers size={10} />
          <ChevronRight size={10} />
        </button>
      ) : null}
      {data.kind !== "source" && (
        <div className="npd-node-metrics">
          {data.kind === "destination" && <span>{loss}% Packet Loss</span>}
          <span>{data.latency === null ? "N/A" : data.latency} ms</span>
        </div>
      )}
      {(data.kind === "source" || data.kind === "destination") && (
        <small className="npd-node-caption">
          <Info size={8} />
          {data.kind === "source" ? "Source" : "Destination"}
        </small>
      )}
      <Handle type="source" position={Position.Right} />
      <Handle id="out-bottom" type="source" position={Position.Bottom} />
    </div>
  );
}

function LatencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const color = String(data?.color || "#93a3b3");
  const latency = data?.latency;
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: Number(data?.width || 1.5) + (data?.highlighted ? 2 : 0),
          strokeDasharray: data?.complete === false ? "7 5" : undefined,
          opacity: data?.dimmed ? 0.15 : 1,
        }}
      />
      {latency !== null && latency !== undefined && (
        <EdgeLabelRenderer>
          <span
            className="npd-edge-label"
            style={{
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              color,
              borderColor: color,
              opacity: data?.dimmed ? 0.15 : 1,
            }}
          >
            {String(latency)} ms
            {Number(data?.packetLoss || 0) > 0 &&
              ` · ${data?.packetLoss}% response loss`}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const nodeTypes = { hop: HopCard, expandedGroup: ExpandedGroupFrame };
const edgeTypes = { latency: LatencyEdge };
const rangeMinutes: Record<string, number> = {
  "Past 15 Minutes": 15,
  "Past 1 Hour": 60,
  "Past 4 Hours": 240,
  "Past 1 Day": 1440,
  "Past 7 Days": 10080,
};

function MapTools({
  onSettings,
  settingsOpen,
}: {
  onSettings: () => void;
  settingsOpen: boolean;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <div className="npd-map-tools">
      {[
        {
          name: "Zoom in",
          icon: Plus,
          action: () => zoomIn({ duration: 180 }),
        },
        {
          name: "Zoom out",
          icon: Minus,
          action: () => zoomOut({ duration: 180 }),
        },
        {
          name: "Reset View",
          icon: Scan,
          action: () => fitView({ padding: 0.1, minZoom: 0.04, duration: 250 }),
        },
        { name: "Latency Edge Coloring", icon: Settings2, action: onSettings },
      ].map((tool) => (
        <button
          key={tool.name}
          title={tool.name}
          aria-label={tool.name}
          aria-expanded={
            tool.name === "Latency Edge Coloring" ? settingsOpen : undefined
          }
          className={
            tool.name === "Latency Edge Coloring" && settingsOpen
              ? "active"
              : ""
          }
          onClick={tool.action}
        >
          <tool.icon size={14} />
        </button>
      ))}
    </div>
  );
}

export function NetworkPathDetail(props: DetailProps) {
  return (
    <ReactFlowProvider key={props.test.id}>
      <PathDetailContent {...props} />
    </ReactFlowProvider>
  );
}

function PathDetailContent({ test, range, timeOffset, onBack }: DetailProps) {
  const [activeTab, setActiveTab] = useState("Path View");
  const [query, setQuery] = useState("");
  const [hideUnknown, setHideUnknown] = useState(true);
  const [groupBy, setGroupBy] = useState("IP Address");
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState("IP Address");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selectedHop, setSelectedHop] = useState<string | null>(null);
  const [inspectedHop, setInspectedHop] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [latencyThreshold, setLatencyThreshold] = useState(7);
  const [nameCopied, setNameCopied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [hoveredHop, setHoveredHop] = useState<string | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { fitView } = useReactFlow();
  const viewport = useViewport();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1000, height: 400 });
  useEffect(
    () => () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    },
    [],
  );
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) =>
      setCanvasSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [activeTab]);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedHop(null);
        setShowGroupMenu(false);
        setShowLegend(false);
        setShowSettings(false);
        setHoveredHop(null);
      }
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, []);
  const snapshot = buildPathSnapshot(
    test,
    selectedTime,
    groupBy,
    expanded,
    hideUnknown,
  );
  const { loss } = snapshot;
  const activeIssue = snapshot.issues.find(
    (issue) => issue.id === activeIssueId,
  );
  const highlightedEdges = new Set(activeIssue?.edgeIds || []);
  const highlightedNodes = new Set(activeIssue?.nodeIds || []);
  snapshot.links
    .filter((link) => highlightedEdges.has(link.id))
    .forEach((link) => {
      highlightedNodes.add(link.from);
      highlightedNodes.add(link.to);
    });
  const duration = (rangeMinutes[range] || 240) * 60000;
  const endTime =
    new Date("2026-10-13T10:24:00Z").getTime() + timeOffset * duration;
  const startTime = endTime - duration;
  const formatTime = (timestamp: number) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Hong_Kong",
      hour: "2-digit",
      minute: "2-digit",
    }).format(timestamp);
  const timeLabels = Array.from({ length: 16 }, (_, index) =>
    formatTime(startTime + (duration * index) / 15),
  );
  const expandableIds = snapshot.groups.map((group) => group.id);
  const allExpanded =
    expandableIds.length > 0 &&
    expandableIds.every((id) => expanded.includes(id));
  const refit = () =>
    setTimeout(
      () => fitView({ padding: 0.1, duration: 200, minZoom: 0.04 }),
      30,
    );
  const toggleGroup = (id: string) => {
    setExpanded((current) =>
      current.includes(id)
        ? current.filter((group) => group !== id)
        : [...current, id],
    );
    setSelectedHop(null);
    setHoveredHop(null);
    setInspectedHop(null);
    refit();
  };
  const selectSample = (sample: number | null) => {
    setSelectedTime(sample);
    setSelectedHop(null);
    setHoveredHop(null);
    setInspectedHop(null);
    setActiveIssueId(null);
    refit();
  };
  const focusIssue = (id: string) => {
    setActiveIssueId((current) => (current === id ? null : id));
    setSelectedHop(null);
    setHoveredHop(null);
    setIssuesOpen(true);
  };
  const nodes: HopNode[] = snapshot.hops.map((hop) => ({
    id: hop.id,
    type: "hop",
    position: { x: hop.x, y: hop.y },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: false,
    data: {
      ...hop,
      label: hop.label,
      subtitle: hop.subtitle,
      latency: hop.latency,
      kind: hop.kind,
      children: hop.children,
      asn: hop.asn,
      issueCount: snapshot.issues.filter((issue) =>
        issue.nodeIds.includes(hop.id),
      ).length,
      highlighted: highlightedNodes.has(hop.id),
      selected: selectedHop === hop.id || inspectedHop === hop.id,
      dimmed: Boolean(
        (query &&
          !`${hop.label} ${hop.asn}`
            .toLowerCase()
            .includes(query.toLowerCase())) ||
        (activeIssue && !highlightedNodes.has(hop.id)),
      ),
      onSelect: () => {
        setSelectedHop(hop.id);
        setHoveredHop(null);
        setNameCopied(false);
      },
      onExpand: () => toggleGroup(hop.id),
    },
  }));
  const groupFrames: GroupFrameNode[] = snapshot.groups.flatMap((group) => {
    const members = snapshot.hops.filter((hop) => hop.groupId === group.id);
    if (!members.length) return [];
    const left = Math.min(...members.map((hop) => hop.x)) - 24;
    const top = Math.min(...members.map((hop) => hop.y)) - 60;
    const right = Math.max(...members.map((hop) => hop.x + 180)) + 24;
    const bottom = Math.max(...members.map((hop) => hop.y + 124)) + 24;
    return [
      {
        id: `expanded-group-${group.id}`,
        type: "expandedGroup",
        position: { x: left, y: top },
        style: { width: right - left, height: bottom - top },
        zIndex: -1,
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        data: {
          label: group.label,
          count: members.length,
          onCollapse:
            groupBy === "ASN" ? () => toggleGroup(group.id) : undefined,
        },
      },
    ];
  });
  const edges: Edge[] = snapshot.links.map((link) => {
    const high = link.latency !== null && link.latency >= latencyThreshold;
    const color =
      link.latency === null ? "#91a3b5" : high ? "#f52e50" : "#3bc46d";
    return {
      id: link.id,
      source: link.from,
      target: link.to,
      type: "latency",
      data: {
        latency: link.latency,
        color,
        complete: link.complete,
        packetLoss: link.packetLoss,
        highlighted: highlightedEdges.has(link.id),
        dimmed: Boolean(activeIssue && !highlightedEdges.has(link.id)),
        width: 1 + (3 * (link.count - 1)) / 6839,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 10, height: 10 },
    };
  });
  const hop = nodes.find((node) => node.id === (selectedHop || hoveredHop));
  const inspectedNode = nodes.find((node) => node.id === inspectedHop);
  const popoverLeft = hop
    ? Math.max(
        8,
        Math.min(
          canvasSize.width - 258,
          viewport.x +
            hop.position.x * viewport.zoom +
            (hop.position.x * viewport.zoom + viewport.x > canvasSize.width / 2
              ? -258
              : 210 * viewport.zoom + 12),
        ),
      )
    : 0;
  const popoverTop = hop
    ? Math.max(
        8,
        Math.min(
          canvasSize.height - 290,
          viewport.y + hop.position.y * viewport.zoom - 95,
        ),
      )
    : 0;
  const timeText =
    selectedTime === null
      ? `${formatTime(startTime)} – ${formatTime(endTime)} (UTC+08:00)`
      : `${formatTime(startTime + (duration * selectedTime) / 143)} · Sample ${selectedTime + 1}`;
  const graphTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(
    selectedTime === null
      ? endTime
      : startTime + (duration * selectedTime) / 143,
  );
  const history = Array.from({ length: 144 }, (_, index) =>
    buildPathSnapshot(test, index, "ASN", [], true),
  );
  const renderObservations = (node: HopNode) => (
    <HopObservation
      data={node.data}
      issues={snapshot.issues.filter((issue) =>
        issue.nodeIds.includes(node.id),
      )}
      onIssue={focusIssue}
    />
  );

  return (
    <section className="npd-detail" aria-label="Network Path Details">
      <div className="npd-breadcrumb">
        <button className="np-outline" onClick={onBack}>
          <ArrowLeft size={13} /> Back to List
        </button>
        <strong>{test.source}</strong>
        <ArrowRight size={14} />
        <span className="np-destination">
          <Globe size={12} />
          {test.destination}
        </span>
        <div className="npd-actions">
          <button
            className="npd-share"
            onClick={async () => {
              try {
                const url = new URL(location.href);
                url.searchParams.set("test", test.id);
                await navigator.clipboard.writeText(url.toString());
                setCopied(true);
                setCopyError("");
              } catch {
                setCopyError("Copy unavailable. Test ID: " + test.id);
              }
            }}
          >
            {copied ? <Check size={12} /> : <Share2 size={12} />}
            {copied ? "Link copied" : "Share"}
          </button>
        </div>
      </div>
      {copyError && (
        <div className="npd-copy-error" role="status">
          {copyError}
        </div>
      )}
      <div className="npd-tabs" role="tablist" aria-label="Path detail views">
        {[
          {
            name: "Path View",
            subtitle: "Network topology visualization",
            icon: Network,
          },
          {
            name: "Analysis",
            subtitle: "Hop-to-hop metric overview",
            icon: Activity,
          },
        ].map((item) => (
          <button
            role="tab"
            aria-selected={activeTab === item.name}
            aria-label={item.name}
            className={activeTab === item.name ? "active" : ""}
            key={item.name}
            onClick={() => {
              setActiveTab(item.name);
              setQuery("");
            }}
          >
            <span>
              <item.icon size={13} />
              {item.name}
            </span>
            <small>{item.subtitle}</small>
          </button>
        ))}
      </div>
      <div className="npd-toolbar">
        <div className="npd-search">
          <Search size={13} />
          <input
            aria-label="Search hops"
            placeholder="Search hops"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button aria-label="Clear hop search" onClick={() => setQuery("")}>
              <X size={11} />
            </button>
          )}
        </div>
        <div className="npd-toolbar-right">
          <label className="npd-toggle">
            <input
              type="checkbox"
              checked={hideUnknown}
              onChange={(event) => {
                setHideUnknown(event.target.checked);
                setHoveredHop(null);
                setSelectedHop(null);
                refit();
              }}
            />
            <span />
            Hide unknown hops
          </label>
          <button
            className="np-outline"
            disabled={groupBy === "IP Address" || expandableIds.length === 0}
            onClick={() => {
              setExpanded(allExpanded ? [] : expandableIds);
              setSelectedHop(null);
              setHoveredHop(null);
              setInspectedHop(null);
              refit();
            }}
          >
            <Expand size={12} />
            {allExpanded ? "Collapse all groups" : "Expand all groups"}
          </button>
          <div className="npd-group-label">
            <span>Group by</span>
            <button
              role="combobox"
              aria-label="Group hops by"
              aria-haspopup="listbox"
              aria-expanded={showGroupMenu}
              aria-controls="npd-group-options"
              onClick={() => setShowGroupMenu(!showGroupMenu)}
            >
              {groupBy}
              <ChevronDown size={12} />
            </button>
            {showGroupMenu && (
              <div className="npd-group-menu">
                <div
                  role="listbox"
                  aria-label="Hop grouping options"
                  id="npd-group-options"
                >
                  {["IP Address", "ASN"].map((option) => (
                    <button
                      key={option}
                      role="option"
                      aria-selected={groupBy === option}
                      onMouseEnter={() => setHoveredGroup(option)}
                      onFocus={() => setHoveredGroup(option)}
                      onClick={() => {
                        setGroupBy(option);
                        setExpanded([]);
                        setSelectedHop(null);
                        setInspectedHop(null);
                        setShowGroupMenu(false);
                        setHoveredHop(null);
                        refit();
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div>
                  <b>{hoveredGroup}</b>
                  <p>
                    {hoveredGroup === "IP Address"
                      ? "The default grouping for Network Path. Groups hops based on IP Address metadata."
                      : "Groups hops belonging to the same Autonomous System Number."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {activeTab === "Path View" && (
        <div className="npd-path-context">
          <span
            className={`npd-path-state ${snapshot.reach === 0 ? "critical" : snapshot.issues.length ? "warning" : "healthy"}`}
          >
            <Activity size={12} />
            {snapshot.reach === 0
              ? "Unreachable"
              : snapshot.issues.length
                ? "Warning"
                : "Healthy"}
          </span>
          <span className="npd-snapshot-time">
            {selectedTime === null ? "Latest" : "Historical"} · {graphTime}{" "}
            (UTC+08:00)
          </span>
          {groupBy === "ASN" && expanded.length > 0 && (
            <div className="npd-expanded-groups" aria-label="Expanded groups">
              <span>Expanded:</span>
              {snapshot.groups
                .filter((group) => expanded.includes(group.id))
                .map((group) => (
                  <button
                    key={group.id}
                    title={`Collapse ${group.label}`}
                    aria-label={`Collapse ${group.label}`}
                    onClick={() => toggleGroup(group.id)}
                  >
                    {group.id === "location"
                      ? "Hong Kong"
                      : group.id.toUpperCase()}{" "}
                    ({group.count})<X size={11} />
                  </button>
                ))}
            </div>
          )}
          <button
            className="npd-issues-toggle"
            aria-expanded={issuesOpen}
            onClick={() => {
              setIssuesOpen(!issuesOpen);
              if (issuesOpen) setActiveIssueId(null);
            }}
          >
            <AlertTriangle size={13} />
            Issues ({snapshot.issues.length})
          </button>
        </div>
      )}
      <div className="npd-body">
        {activeTab === "Path View" ? (
          <div className="npd-canvas" ref={canvasRef}>
            <ReactFlow<HopNode | GroupFrameNode>
              nodes={[...groupFrames, ...nodes]}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.1, minZoom: 0.04, maxZoom: 1.2 }}
              minZoom={0.04}
              maxZoom={2}
              nodesConnectable={false}
              elementsSelectable={false}
              proOptions={{ hideAttribution: true }}
              aria-label="Network path topology"
              onNodeMouseEnter={(_, node) => {
                if (node.type !== "hop") return;
                if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                if (!selectedHop) setHoveredHop(node.id);
              }}
              onNodeMouseLeave={() => {
                hoverTimeout.current = setTimeout(
                  () => setHoveredHop(null),
                  220,
                );
              }}
              onPaneClick={() => {
                setSelectedHop(null);
                setHoveredHop(null);
                setShowLegend(false);
                setShowSettings(false);
                setShowGroupMenu(false);
              }}
            />
            <div className="npd-filtered-time">
              Filtered time range: {timeText}
            </div>
            <button
              className="npd-map-info"
              title="Path legend"
              aria-label="Path legend"
              aria-expanded={showLegend}
              onClick={() => setShowLegend(!showLegend)}
            >
              <Info size={12} />
            </button>
            {showLegend && (
              <div
                className="npd-legend"
                role="region"
                aria-label="Path legend details"
              >
                <b>Width: Traversal count</b>
                <div className="npd-legend-width">
                  <span>Min: 1</span>
                  <span>Max: 6840</span>
                </div>
                <b>Stroke: Traversal completion</b>
                <div className="npd-legend-strokes">
                  <span>Complete</span>
                  <span>Incomplete</span>
                </div>
                <b>Colors</b>
                {[
                  ["#3bc46d", "Destination Reachable"],
                  ["#f5a000", "Unstable Reachability"],
                  ["#f52e50", "Unreachable"],
                  ["#3bc46d", "Low Latency"],
                  ["#f52e50", "High Latency"],
                ].map(([color, label], index) => (
                  <div className="npd-legend-color" key={label}>
                    <i
                      style={{ background: color, height: index > 2 ? 2 : 15 }}
                    />
                    {label}
                  </div>
                ))}
              </div>
            )}
            <MapTools
              settingsOpen={showSettings}
              onSettings={() => setShowSettings(!showSettings)}
            />
            {showSettings && (
              <div
                className="npd-map-settings"
                role="region"
                aria-label="Latency threshold settings"
              >
                <b>Latency Edge Coloring</b>
                <div className="npd-threshold-value">
                  <span>
                    <i />
                    High
                  </span>
                  <span className="npd-threshold-operator">≥</span>
                  <input
                    aria-label="High latency threshold"
                    type="number"
                    min="0"
                    max="1000"
                    value={latencyThreshold}
                    onChange={(event) =>
                      setLatencyThreshold(
                        Math.max(0, Math.min(1000, Number(event.target.value))),
                      )
                    }
                  />
                  <span>ms</span>
                </div>
                <input
                  aria-label="Latency threshold slider"
                  type="range"
                  min="0"
                  max={Math.max(300, latencyThreshold)}
                  step="1"
                  value={latencyThreshold}
                  style={{
                    background: `linear-gradient(to right, #3bc46d 0%, #3bc46d ${(100 * latencyThreshold) / Math.max(300, latencyThreshold)}%, #f52e50 ${(100 * latencyThreshold) / Math.max(300, latencyThreshold)}%, #f52e50 100%)`,
                  }}
                  onChange={(event) =>
                    setLatencyThreshold(Number(event.target.value))
                  }
                />
              </div>
            )}
            {hop && (
              <div
                className="npd-node-popover"
                role="dialog"
                aria-label={`Node ${hop.data.label}`}
                style={{
                  left: popoverLeft,
                  top: popoverTop,
                  maxHeight: Math.max(180, canvasSize.height - popoverTop - 8),
                }}
                onMouseEnter={() => {
                  if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                }}
                onMouseLeave={() => {
                  if (!selectedHop) setHoveredHop(null);
                }}
              >
                <header>
                  <strong>{hop.data.label}</strong>
                  <button
                    aria-label="Close node popover"
                    onClick={() => {
                      setSelectedHop(null);
                      setHoveredHop(null);
                    }}
                  >
                    <X size={12} />
                  </button>
                </header>
                {renderObservations(hop)}
                <dl>
                  {[
                    ["IP Address", hop.data.ip],
                    [
                      "Hostname",
                      hop.data.kind === "source" ? test.source : undefined,
                    ],
                    ["AS Name", hop.data.asName],
                    [
                      "City",
                      hop.data.kind === "source" ? "Shanghai" : undefined,
                    ],
                    [
                      "Country",
                      hop.data.kind === "source" ? "China" : undefined,
                    ],
                    [
                      "AS Number",
                      hop.data.kind === "source"
                        ? "AS4811"
                        : hop.data.asn?.startsWith("AS")
                          ? hop.data.asn
                          : undefined,
                    ],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd title={value}>{value}</dd>
                      </div>
                    ))}
                </dl>
                <div className="npd-traversed">
                  <Activity size={13} />
                  <span>Traversed count</span>
                  <strong>{hop.data.traversed}</strong>
                </div>
                <button
                  className="np-primary npd-inspect-button"
                  onClick={() => {
                    setInspectedHop(hop.id);
                    setSelectedHop(null);
                    setHoveredHop(null);
                  }}
                >
                  Inspect
                </button>
                <button
                  className="npd-copy-name"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(hop.data.label);
                      setNameCopied(true);
                      setCopyError("");
                    } catch {
                      setCopyError("Copy unavailable. Name: " + hop.data.label);
                    }
                  }}
                >
                  {nameCopied ? <Check size={12} /> : <Copy size={12} />}
                  {nameCopied ? "Copied" : "Copy Name"}
                </button>
              </div>
            )}
            {query && !nodes.some((node) => !node.data.dimmed) && (
              <div className="npd-no-hops">No hops match “{query}”</div>
            )}
          </div>
        ) : (
          <NetworkPathAnalysis
            source={test.source}
            destination={test.destination}
            reach={snapshot.reach}
            rtt={snapshot.rtt || 0}
            hops={nodes
              .filter((node) => !node.data.dimmed)
              .map((node) => ({ id: node.id, ...node.data }))}
            startTime={startTime}
            endTime={endTime}
          />
        )}
        {inspectedNode && activeTab === "Path View" && (
          <aside className="npd-inspector">
            <header>
              <h3>Hop Details</h3>
              <button
                aria-label="Close path panel"
                onClick={() => {
                  setInspectedHop(null);
                }}
              >
                <X size={14} />
              </button>
            </header>
            {inspectedNode && (
              <>
                <div className="npd-inspector-hop">
                  <Network size={20} />
                  <strong>{inspectedNode.data.label}</strong>
                </div>
                {renderObservations(inspectedNode)}
                {[
                  ["IP Address", inspectedNode.data.ip || "Unknown"],
                  ["Autonomous system", inspectedNode.data.asn || "Unknown"],
                  [
                    "Average RTT",
                    !inspectedNode.data.stats
                      ? "N/A"
                      : `${inspectedNode.data.stats.avg} ms`,
                  ],
                  [
                    "Reachability",
                    inspectedNode.data.kind === "unknown"
                      ? "N/A"
                      : `${inspectedNode.data.kind === "destination" ? snapshot.reach : 100 - (inspectedNode.data.packetLoss || 0)}%`,
                  ],
                  [
                    "Packet loss",
                    inspectedNode.data.kind === "unknown"
                      ? "N/A"
                      : `${inspectedNode.data.packetLoss || 0}%`,
                  ],
                  ["Traversed count", String(inspectedNode.data.traversed)],
                  ["Type", inspectedNode.data.kind],
                  ["Child nodes", String(inspectedNode.data.children || 0)],
                ].map(([label, value]) => (
                  <div className="npd-hop-property" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
                <small className="npd-simulation-note">
                  Illustrative route · simulated data
                </small>
              </>
            )}
          </aside>
        )}
      </div>
      {activeTab === "Path View" && issuesOpen && (
        <section className="npd-issues-panel" aria-label="Path issues">
          <header>
            <strong>Issues ({snapshot.issues.length})</strong>
            <span>
              {graphTime} · Observed conditions, not a root-cause verdict
            </span>
            <button
              aria-label="Close issues"
              onClick={() => {
                setIssuesOpen(false);
                setActiveIssueId(null);
              }}
            >
              <X size={13} />
            </button>
          </header>
          {snapshot.issues.length === 0 ? (
            <p>No issues in this snapshot</p>
          ) : (
            snapshot.issues.map((issue) => (
              <button
                key={issue.id}
                className={`npd-issue-row ${issue.severity}`}
                aria-pressed={activeIssueId === issue.id}
                onClick={() => focusIssue(issue.id)}
              >
                <AlertTriangle size={15} />
                <span>
                  <strong>{issue.title}</strong>
                  <small>{issue.observed}</small>
                  <small>
                    {issue.condition} · {graphTime}
                  </small>
                </span>
                <span>
                  {activeIssueId === issue.id ? "Clear highlight" : "Locate"}
                  <ChevronRight size={12} />
                </span>
              </button>
            ))
          )}
        </section>
      )}
      {activeTab === "Path View" && (
        <div className="npd-history-heading">
          <strong>Path History</strong>
          <span>Graph shows: {graphTime} (UTC+08:00)</span>
          <button
            title="Previous sample"
            aria-label="Previous sample"
            onClick={() =>
              selectSample(
                selectedTime === null ? 142 : Math.max(0, selectedTime - 1),
              )
            }
            disabled={selectedTime === 0}
          >
            <ArrowLeft size={13} />
          </button>
          <button
            title="Next sample"
            aria-label="Next sample"
            disabled={selectedTime === null || selectedTime === 143}
            onClick={() =>
              selectSample(Math.min(143, (selectedTime ?? 142) + 1))
            }
          >
            <ArrowRight size={13} />
          </button>
          <button
            className="npd-latest"
            aria-pressed={selectedTime === null}
            onClick={() => selectSample(null)}
          >
            Latest
          </button>
        </div>
      )}
      {activeTab === "Path View" && (
        <div className="npd-timeline">
          <div className="npd-timeline-labels">
            <span>Latency</span>
            <span>Reachability</span>
          </div>
          <div className="npd-timeline-main">
            <div className="npd-timeline-cells">
              {history.map((historical, index) => (
                <button
                  aria-label={`Select time sample ${index + 1}`}
                  aria-pressed={selectedTime === index}
                  title={`${formatTime(startTime + (duration * index) / 143)} · RTT ${historical.rtt === null ? "N/A" : `${historical.rtt} ms`} · Reachability ${historical.reach}% · Issues ${historical.issues.length}`}
                  key={index}
                  className={selectedTime === index ? "selected" : ""}
                  onClick={() =>
                    selectSample(selectedTime === index ? null : index)
                  }
                >
                  <i
                    style={{
                      background:
                        historical.reach === 0
                          ? "#f7b5b5"
                          : historical.phase === "degraded"
                            ? "#e6ecc4"
                            : "#83d497",
                    }}
                  />
                  <i
                    style={{
                      background:
                        historical.reach === 0
                          ? "#f3a8a8"
                          : historical.loss > 1
                            ? "#f2d58d"
                            : "#a7dfb6",
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="npd-time-labels">
              {timeLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <input
              className="npd-history-slider"
              type="range"
              aria-label="History sample"
              min="0"
              max="143"
              value={selectedTime ?? 143}
              onChange={(event) => selectSample(Number(event.target.value))}
            />
          </div>
          {selectedTime !== null && (
            <button
              className="npd-clear-time"
              title="Clear time selection"
              aria-label="Clear time selection"
              onClick={() => selectSample(null)}
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
