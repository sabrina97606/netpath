"use client";

import "@/lib/suppress-resize-observer-error";
import { useEffect, useMemo, useRef, useState } from "react";
import { NetworkPathAnalysis } from "./network-path-analysis";
import { PathTimeline } from "./network-path-timeline";
import {
  buildTimelineSlots,
  slotCenter,
  type TimelineBrush,
} from "@/lib/network-path-timeline";
import { CiLink } from "@/components/ci-link";
import { useNpI18n } from "@/lib/network-path-i18n";
import { cityOf, cmdbByIp, cmdbByName } from "@/lib/cmdb";
import {
  buildPathSnapshot,
  type PathStats,
} from "@/lib/network-path-model";
import {
  Activity,
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

type DestinationMeta = {
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  deviceType?: string;
  vendor?: string;
  model?: string;
};
const PUBLIC_DESTINATIONS: Record<string, DestinationMeta> = {
  "1.1.1.1": {
    hostname: "one.one.one.one",
    city: "Brisbane",
    region: "Queensland",
    country: "Australia",
    timezone: "UTC+10:00",
  },
  "8.8.8.8": {
    hostname: "dns.google",
    city: "Mountain View",
    region: "California",
    country: "United States",
    timezone: "UTC-08:00",
  },
};
function destinationMeta(ip: string | undefined, fallback: string): DestinationMeta {
  if (ip && PUBLIC_DESTINATIONS[ip]) return PUBLIC_DESTINATIONS[ip];
  const ci = cmdbByIp.get(ip ?? "") ?? cmdbByName.get(fallback);
  if (ci) {
    return {
      hostname: ci.name,
      city: cityOf(ci.name)?.name,
      country: "China",
      timezone: "UTC+08:00",
      deviceType: ci.type === "firewall" ? "Firewall" : "Switch",
      vendor: ci.vendor,
      model: ci.model,
    };
  }
  return /[a-z]/i.test(fallback) ? { hostname: fallback } : {};
}
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
  badge?: string;
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
  const { t } = useNpI18n();
  return (
    <div
      className="npd-group-boundary"
      role="group"
      aria-label={`${t("Expanded from")} ${data.label}`}
    >
      <header>
        <Layers size={12} />
        <span title={`${t("Expanded from")} ${data.label}`}>
          <small>{t("Expanded from")}</small>
          <strong>{data.label}</strong>
        </span>
        <small>{t(`${data.count} hops`)}</small>
        {data.onCollapse && (
          <button
            className="nodrag nopan"
            title={t(`Collapse ${data.label}`)}
            aria-label={t(`Collapse group frame ${data.label}`)}
            onClick={data.onCollapse}
          >
            <X size={13} />
          </button>
        )}
      </header>
    </div>
  );
}

function HopObservation({ data }: { data: HopData }) {
  const { t } = useNpI18n();
  const showRtt = Boolean(data.stats);
  const showLoss = data.kind !== "source" && data.kind !== "unknown";
  if (data.kind === "source" || (!showRtt && !showLoss)) return null;
  return (
    <section className="npd-hop-observation" aria-label={t("Node observations")}>
      {showRtt && data.stats && (
      <table aria-label={t("RTT statistics")}>
        <caption>{t("RTT latency")}</caption>
        <thead>
          <tr>
            {["Latest", "Min", "Avg", "Max"].map((label) => (
              <th key={label}>{t(label)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {(["latest", "min", "avg", "max"] as const).map((key) => (
              <td key={key}>{`${data.stats![key]} ms`}</td>
            ))}
          </tr>
        </tbody>
      </table>
      )}
      {showLoss && (
        <div className="npd-observed-loss">
          <span>
            {data.kind === "destination"
              ? t("End-to-end packet loss")
              : t("Hop response loss")}
          </span>
          <strong>{`${data.packetLoss || 0}%`}</strong>
        </div>
      )}
    </section>
  );
}

function HopCard({ data }: NodeProps<HopNode>) {
  const { t } = useNpI18n();
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
      <div
        className={`npd-unknown-node ${data.selected ? "selected" : ""} ${data.dimmed ? "dimmed" : ""}`}
      >
        <Handle type="target" position={Position.Left} />
        <button
          className="nodrag nopan"
          aria-label={t(`Inspect Unknown, traversed ${data.traversed} times`)}
          onClick={data.onSelect}
        >
          <span />
        </button>
        <small>{t("Unknown")}</small>
        <div className="npd-unknown-tip" role="tooltip">
          <strong>{t("Unknown nodes")}</strong>
          <div>
            <span>
              <Activity size={12} />
              {t("Traversed count")}
            </span>
            <b>{data.traversed}</b>
          </div>
          <em>
            {t("These hops aren't responding to traceroute requests likely because of a firewall or for security reasons.")}
          </em>
        </div>
        <Handle type="source" position={Position.Right} />
      </div>
    );
  return (
    <div
      className={`npd-hop-card npd-kind-${data.kind} ${unreachable ? "unreachable" : loss > 0 ? "unstable" : ""} ${data.selected ? "selected" : ""} ${data.dimmed ? "dimmed" : ""} ${data.highlighted ? "issue-highlighted" : ""} ${data.children ? "stacked" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <Handle id="in-top" type="target" position={Position.Top} />
      {(loss > 0 || data.kind === "destination") && (
        <div className="npd-unstable-label">
          <Activity size={10} />{" "}
          {unreachable
            ? t("Destination is unreachable")
            : data.kind !== "destination"
              ? t(data.badge ?? "Hop response warning")
              : loss > 0
                ? t("Destination is unstable")
                : t("Destination is reachable")}
        </div>
      )}
      <button
        className="npd-node-main nodrag nopan"
        onClick={data.children ? data.onExpand : data.onSelect}
        aria-label={
          data.children ? t(`Expand group ${data.label}`) : t(`Select ${data.label}`)
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
          {data.children && <small>{t(`${data.children} child nodes`)}</small>}
        </span>
      </button>
      {data.children ? (
        <button
          className="npd-node-expand nodrag nopan"
          aria-label={t(`Expand ${data.label}`)}
          onClick={data.onExpand}
        >
          <Layers size={10} />
          <ChevronRight size={10} />
        </button>
      ) : null}
      {data.kind !== "source" && (
        <div className="npd-node-metrics">
          {data.kind === "destination" && <span>{loss}% {t("Packet Loss")}</span>}
          <span>{data.latency === null ? "N/A" : data.latency} ms</span>
        </div>
      )}
      {(data.kind === "source" || data.kind === "destination") && (
        <small className="npd-node-caption">
          <Info size={8} />
          {data.kind === "source" ? t("Source") : t("Destination")}
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
  const { t } = useNpI18n();
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
              ` · ${data?.packetLoss}% ${t("response loss")}`}
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
  const { t } = useNpI18n();
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
          title={t(tool.name)}
          aria-label={t(tool.name)}
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
  const { t, isZh } = useNpI18n();
  const [activeTab, setActiveTab] = useState("Path View");
  const [query, setQuery] = useState("");
  const [hideUnknown, setHideUnknown] = useState(true);
  const [groupBy, setGroupBy] = useState("ASN");
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [hoveredGroup, setHoveredGroup] = useState("ASN");
  const [brush, setBrush] = useState<TimelineBrush | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [selectedHop, setSelectedHop] = useState<string | null>(null);
  const [inspectedHop, setInspectedHop] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [latencyThreshold, setLatencyThreshold] = useState(7);
  const [nameCopied, setNameCopied] = useState(false);
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
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      cancelAnimationFrame(frame);
      // 延后到下一帧再更新状态，避免在 RO 回调中触发布局变化形成循环
      frame = requestAnimationFrame(() =>
        setCanvasSize((current) =>
          Math.abs(current.width - width) < 1 &&
          Math.abs(current.height - height) < 1
            ? current
            : { width, height },
        ),
      );
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
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
  const formatStamp = (timestamp: number) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Hong_Kong",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(timestamp);
  const slots = useMemo(() => buildTimelineSlots(144), []);
  const slotTime = (index: number) =>
    startTime + slotCenter(slots[index]) * duration;
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
  const stepSample = (direction: -1 | 1) => {
    let index = (selectedTime ?? 143) + (selectedTime === null ? -1 : 0);
    do {
      index += direction;
    } while (index >= 0 && index <= 143 && slots[index].missing);
    if (index >= 0 && index <= 143) selectSample(index);
  };
  const handleBrush = (next: TimelineBrush, commit: boolean) => {
    setBrush(next);
    if (!commit) return;
    const inRange = history.filter(
      (_, index) =>
        !slots[index].missing &&
        slotCenter(slots[index]) >= next.from &&
        slotCenter(slots[index]) <= next.to,
    );
    if (!inRange.length) return;
    const worstIndex = history.indexOf(
      inRange.reduce((worst, item) =>
        item.reach < worst.reach ||
        (item.reach === worst.reach && (item.rtt ?? 0) > (worst.rtt ?? 0))
          ? item
          : worst,
      ),
    );
    selectSample(worstIndex, true);
  };
  const selectSample = (sample: number | null, keepBrush = false) => {
    if (!keepBrush) setBrush(null);
    setSelectedTime(sample);
    setSelectedHop(null);
    setHoveredHop(null);
    setInspectedHop(null);
    refit();
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
      badge: snapshot.issues.find((issue) => issue.nodeIds.includes(hop.id))
        ?.badge,
      highlighted: false,
      selected: selectedHop === hop.id || inspectedHop === hop.id,
      dimmed: Boolean(
        query &&
          !`${hop.label} ${hop.asn}`
            .toLowerCase()
            .includes(query.toLowerCase()),
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
        highlighted: false,
        dimmed: false,
        width:
          1.5 + (4.5 * Math.log10(Math.max(1, link.count))) / Math.log10(6840),
      },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 10, height: 10 },
    };
  });
  const activeHopId = selectedHop || hoveredHop;
  const hop = nodes.find(
    (node) =>
      node.id === activeHopId &&
      (node.data.kind !== "unknown" || selectedHop === activeHopId),
  );
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
      : `${formatTime(slotTime(selectedTime))} · ${isZh ? "样本" : "Sample"} ${selectedTime + 1}`;
  const graphTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Hong_Kong",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(selectedTime === null ? endTime : slotTime(selectedTime));
  const history = useMemo(
    () =>
      Array.from({ length: 144 }, (_, index) =>
        buildPathSnapshot(test, index, "ASN", [], true),
      ),
    [test],
  );
  const renderObservations = (node: HopNode) => (
    <HopObservation data={node.data} />
  );

  return (
    <section className="npd-detail" aria-label={t("Network Path Details")}>
      <div className="npd-breadcrumb">
        <button className="np-outline" onClick={onBack}>
          <ArrowLeft size={13} /> {t("Back to List")}
        </button>
        <strong>{test.source}</strong>
        <ArrowRight size={14} />
        <span className="np-destination">
          <Globe size={12} />
          {test.destination}
        </span>
      </div>
      <div className="npd-tabs" role="tablist" aria-label={t("Path detail views")}>
        {[
          {
            name: "Path View",
            subtitle: "Network topology visualization",
          },
          {
            name: "Analysis",
            subtitle: "Hop-to-hop metric overview",
          },
        ].map((item) => (
          <button
            role="tab"
            aria-selected={activeTab === item.name}
            title={t(item.subtitle)}
            className={activeTab === item.name ? "active" : ""}
            key={item.name}
            onClick={() => {
              setActiveTab(item.name);
              setQuery("");
            }}
          >
            {t(item.name)}
          </button>
        ))}
      </div>
      <div className="npd-toolbar">
        <div className="npd-search">
          <Search size={13} />
          <input
            aria-label={t("Search hops")}
            placeholder={t("Search hops")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button aria-label={t("Clear hop search")} onClick={() => setQuery("")}>
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
            {t("Hide unknown hops")}
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
            {t(allExpanded ? "Collapse all groups" : "Expand all groups")}
          </button>
          <div className="npd-group-label">
            <span>{t("Group by")}</span>
            <button
              role="combobox"
              aria-label={t("Group hops by")}
              aria-haspopup="listbox"
              aria-expanded={showGroupMenu}
              aria-controls="npd-group-options"
              onClick={() => setShowGroupMenu(!showGroupMenu)}
            >
              {t(groupBy)}
              <ChevronDown size={12} />
            </button>
            {showGroupMenu && (
              <div className="npd-group-menu">
                <div
                  role="listbox"
                  aria-label={t("Hop grouping options")}
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
                      {t(option)}
                    </button>
                  ))}
                </div>
                <div>
                  <b>{t(hoveredGroup)}</b>
                  <p>
                    {t(
                      hoveredGroup === "IP Address"
                        ? "The default grouping for Network Path. Groups hops based on IP Address metadata."
                        : "Groups hops belonging to the same Autonomous System Number.",
                    )}
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
              ? t("Unreachable")
              : snapshot.issues.length
                ? t("Warning")
                : t("Healthy")}
          </span>
          <span className="npd-snapshot-time">
            {t(selectedTime === null ? "Latest" : "Historical")} · {graphTime}{" "}
            (UTC+08:00)
          </span>
          {groupBy === "ASN" && expanded.length > 0 && (
            <div className="npd-expanded-groups" aria-label={t("Expanded groups")}>
              <span>{t("Expanded:")}</span>
              {snapshot.groups
                .filter((group) => expanded.includes(group.id))
                .map((group) => (
                  <button
                    key={group.id}
                    title={t(`Collapse ${group.label}`)}
                    aria-label={t(`Collapse ${group.label}`)}
                    onClick={() => toggleGroup(group.id)}
                  >
                    {group.id === "location"
                      ? t("Hong Kong")
                      : group.id.toUpperCase()}{" "}
                    ({group.count})<X size={11} />
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
      <div className="npd-body">
        {activeTab === "Path View" ? (
              <div className="npd-canvas" ref={canvasRef}>
                {brush && (
                  <div className="npd-range-banner" role="status">
                    {t("Filtered time range:")}{" "}
                    {formatStamp(startTime + brush.from * duration)} -{" "}
                    {formatStamp(startTime + brush.to * duration)} ·{" "}
                    {t("showing the worst sample in range")}
                  </div>
                )}
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
              aria-label={t("Network path topology")}
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
              {t("Filtered time range:")} {timeText}
            </div>
            <button
              className="npd-map-info"
              title={t("Path legend")}
              aria-label={t("Path legend")}
              aria-expanded={showLegend}
              onClick={() => setShowLegend(!showLegend)}
            >
              <Info size={12} />
            </button>
            {showLegend && (
              <div
                className="npd-legend"
                role="region"
                aria-label={t("Path legend details")}
              >
                <b>{t("Width: Traversal count")}</b>
                <div className="npd-legend-width">
                  <span>{t("Min:")} 1</span>
                  <span>{t("Max:")} 6840</span>
                </div>
                <b>{t("Stroke: Traversal completion")}</b>
                <div className="npd-legend-strokes">
                  <span>{t("Complete")}</span>
                  <span>{t("Incomplete")}</span>
                </div>
                <b>{t("Colors")}</b>
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
                    {t(label)}
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
                aria-label={t("Latency threshold settings")}
              >
                <b>{t("Latency Edge Coloring")}</b>
                <div className="npd-threshold-value">
                  <span>
                    <i />
                    {t("High")}
                  </span>
                  <span className="npd-threshold-operator">≥</span>
                  <input
                    aria-label={t("High latency threshold")}
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
                  aria-label={t("Latency threshold slider")}
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
                aria-label={`${t("Node")} ${hop.data.label}`}
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
                    aria-label={t("Close node popover")}
                    onClick={() => {
                      setSelectedHop(null);
                      setHoveredHop(null);
                    }}
                  >
                    <X size={12} />
                  </button>
                </header>
                {renderObservations(hop)}
                <div className="npd-traversed">
                  <Activity size={13} />
                  <span>{t("Traversed count")}</span>
                  <strong>{hop.data.traversed}</strong>
                </div>
                {(() => {
                  const isDestination = hop.data.kind === "destination";
                  const meta = isDestination
                    ? destinationMeta(hop.data.ip, test.destination)
                    : {};
                  const identityRows: [string, string | undefined][] = [
                    ["IP Address", hop.data.ip],
                    [
                      "Hostname",
                      hop.data.kind === "source" ? test.source : meta.hostname,
                    ],
                    ["AS Name", hop.data.asName],
                    [
                      "City",
                      hop.data.kind === "source" ? "Shanghai" : meta.city,
                    ],
                    ["Region", meta.region],
                    [
                      "Country",
                      hop.data.kind === "source" ? "China" : meta.country,
                    ],
                    ["Timezone", meta.timezone],
                    [
                      "AS Number",
                      hop.data.kind === "source"
                        ? "AS4811"
                        : hop.data.asn?.startsWith("AS")
                          ? hop.data.asn
                          : undefined,
                    ],
                    ["Device type", meta.deviceType],
                    ["Vendor", meta.vendor],
                    ["Model", meta.model],
                  ];
                  const testRows: [string, string | undefined][] = isDestination
                    ? [
                        ["Protocol", test.protocol],
                        ["Port", test.port || undefined],
                        ["Reachability", `${snapshot.reach}%`],
                        ["Site", test.site],
                        ["Environment", test.env],
                      ]
                    : [];
                  const renderRows = (rows: [string, string | undefined][]) =>
                    rows
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div key={label}>
                          <dt>{t(label)}</dt>
                          <dd title={value}>{t(value as string)}</dd>
                        </div>
                      ));
                  return (
                    <>
                      <dl>{renderRows(identityRows)}</dl>
                      {testRows.length > 0 && (
                        <>
                          <div className="npd-popover-subhead">
                            {t("Test configuration")}
                          </div>
                          <dl>{renderRows(testRows)}</dl>
                        </>
                      )}
                    </>
                  );
                })()}
                <button
                  className="np-primary npd-inspect-button"
                  onClick={() => {
                    setInspectedHop(hop.id);
                    setSelectedHop(null);
                    setHoveredHop(null);
                  }}
                >
                  {t("Inspect")}
                </button>
                <button
                  className="npd-copy-name"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(hop.data.label);
                      setNameCopied(true);
                    } catch {
                      setNameCopied(false);
                    }
                  }}
                >
                  {nameCopied ? <Check size={12} /> : <Copy size={12} />}
                  {t(nameCopied ? "Copied" : "Copy Name")}
                </button>
              </div>
            )}
            {query && !nodes.some((node) => !node.data.dimmed) && (
              <div className="npd-no-hops">{isZh ? `没有匹配“${query}”的跳点` : `No hops match “${query}”`}</div>
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
              <h3>{t("Hop Details")}</h3>
              <button
                aria-label={t("Close path panel")}
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
                  <CiLink
                    ci={
                      cmdbByName.get(inspectedNode.data.label) ??
                      cmdbByIp.get(inspectedNode.data.ip ?? "")
                    }
                  />
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
                    <span>{t(label)}</span>
                    <strong>{t(value)}</strong>
                  </div>
                ))}
                <small className="npd-simulation-note">
                  {t("Illustrative route · simulated data")}
                </small>
              </>
            )}
          </aside>
        )}
      </div>
      {activeTab === "Path View" && (
        <div className="npd-history-heading">
          <strong>{t("Path History")}</strong>
          <span>{t("Graph shows:")} {graphTime} (UTC+08:00)</span>
          <button
            title={t("Previous sample")}
            aria-label={t("Previous sample")}
            onClick={() => stepSample(-1)}
            disabled={selectedTime === 0}
          >
            <ArrowLeft size={13} />
          </button>
          <button
            title={t("Next sample")}
            aria-label={t("Next sample")}
            disabled={selectedTime === null || selectedTime === 143}
            onClick={() => stepSample(1)}
          >
            <ArrowRight size={13} />
          </button>
          <button
            className="npd-latest"
            aria-pressed={selectedTime === null}
            onClick={() => selectSample(null)}
          >
            {t("Latest")}
          </button>
        </div>
      )}
      {activeTab === "Path View" && (
        <div className="npd-timeline">
          <PathTimeline
            history={history}
            slots={slots}
            start={startTime}
            end={endTime}
            selectedIndex={selectedTime}
            brush={brush}
            formatTime={formatStamp}
            onSelect={(index) => selectSample(index)}
            onBrush={handleBrush}
          />
          {(selectedTime !== null || brush) && (
            <button
              className="npd-clear-time"
              title={t("Clear time selection")}
              aria-label={t("Clear time selection")}
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
