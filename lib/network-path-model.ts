export type PathStats = {
  latest: number;
  min: number;
  avg: number;
  max: number;
};
export type PathHop = {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: "source" | "hop" | "asn" | "location" | "destination" | "unknown";
  latency: number | null;
  asn: string;
  subtitle?: string;
  children?: number;
  groupId?: string;
  ip?: string;
  asName?: string;
  packetLoss?: number;
  traversed: number;
  stats?: PathStats;
};
export type PathLink = {
  id: string;
  from: string;
  to: string;
  latency: number | null;
  complete: boolean;
  count: number;
  packetLoss?: number;
};
export type PathIssue = {
  id: string;
  title: string;
  observed: string;
  condition: string;
  nodeIds: string[];
  edgeIds: string[];
  severity: "warning" | "critical";
};
export type PathGroup = { id: string; label: string; count: number };
type Test = { source: string; destination: string; reach: number; rtt: number };

export function buildPathSnapshot(
  test: Test,
  sample: number | null,
  groupBy: string,
  expanded: string[],
  hideUnknown: boolean,
) {
  const phase =
    sample === null || sample >= 96
      ? "recent"
      : sample < 48
        ? "healthy"
        : "degraded";
  const unreachable = test.reach === 0;
  const reach = unreachable
    ? 0
    : phase === "healthy"
      ? 100
      : phase === "degraded"
        ? Math.min(test.reach, 82)
        : test.reach;
  const loss = Number((100 - reach).toFixed(1));
  const rtt = unreachable
    ? null
    : phase === "degraded"
      ? Math.round(test.rtt * 1.65)
      : phase === "healthy"
        ? Math.round(test.rtt * 0.85)
        : test.rtt;
  const factor = test.rtt > 0 ? test.rtt / 177 : 1;
  const hops: PathHop[] = [];
  const links: PathLink[] = [];
  const issues: PathIssue[] = [];
  const groups: PathGroup[] = [];
  const endpoints: Record<
    string,
    { entry: string; exit: string; end: number; members: string[] }
  > = {};
  const addHop = (hop: PathHop) => {
    if (hop.latency !== null && hop.kind !== "source") {
      hop.latency = Math.round(hop.latency * factor);
      hop.stats = {
        latest: hop.latency,
        min: Math.max(1, Math.round(hop.latency * 0.65)),
        avg: Math.round(hop.latency * 0.93),
        max: Math.round(hop.latency * 1.4),
      };
    }
    hops.push(hop);
  };
  const addLink = (
    from: string,
    to: string,
    latency: number | null,
    complete = true,
    packetLoss?: number,
  ) => {
    const link = {
      id: `link-${from}-${to}`,
      from,
      to,
      latency:
        latency === null ? null : Math.max(1, Math.round(latency * factor)),
      complete,
      count: 6840,
      packetLoss,
    };
    links.push(link);
    return link.id;
  };
  addHop({
    id: "source",
    label: test.source,
    kind: "source",
    x: 0,
    y: 160,
    latency: null,
    asn: "Local network",
    ip: "203.156.216.193",
    traversed: 6840,
  });
  addHop({
    id: "gateway",
    label: "10.3.28.1",
    kind: "hop",
    x: 300,
    y: 160,
    latency: unreachable ? 11 : 8,
    asn: "Private network",
    ip: "10.3.28.1",
    traversed: 6840,
    packetLoss: 0,
  });
  addLink("source", "gateway", unreachable ? 11 : 8, !unreachable);

  const addGroup = (
    id: string,
    label: string,
    asn: string,
    x: number,
    y: number,
    base: number,
    addresses: string[],
  ) => {
    groups.push({ id, label, count: addresses.length });
    const isExpanded = groupBy === "IP Address" || expanded.includes(id);
    const affected = id === "as4812" && phase === "degraded";
    const asName = asn.startsWith("AS48")
      ? "China Telecom (Group)"
      : "CHINANET Backbone";
    if (!isExpanded) {
      addHop({
        id,
        label,
        kind: id === "location" ? "location" : "asn",
        x,
        y,
        latency: affected ? 180 : base,
        asn,
        asName,
        children: addresses.length,
        traversed: 5160,
        packetLoss: affected ? 21 : 0,
      });
      endpoints[id] = { entry: id, exit: id, end: x + 180, members: [id] };
      return;
    }
    const members = addresses.map((ip, index) => `${id}-hop-${index + 1}`);
    addresses.forEach((ip, index) => {
      const diamond = addresses.length === 4;
      const column = diamond ? (index === 0 ? 0 : index === 3 ? 2 : 1) : index;
      const offsetY =
        diamond && index === 1 ? -110 : diamond && index === 2 ? 110 : 0;
      addHop({
        id: members[index],
        groupId: id,
        label: ip,
        kind: "hop",
        x: x + column * 240,
        y: y + offsetY,
        latency: affected && index === 1 ? 180 : base + index * 3,
        asn,
        asName,
        ip,
        traversed: index === 2 && diamond ? 1680 : 5160,
        packetLoss: affected && index === 1 ? 21 : 0,
      });
    });
    if (addresses.length === 4) {
      addLink(members[0], members[1], 7, true, affected ? 21 : undefined);
      addLink(
        members[0],
        members[2],
        affected ? 55 : 5,
        true,
        affected ? 21 : undefined,
      );
      addLink(members[1], members[3], 3);
      addLink(members[2], members[3], 3);
    } else {
      members
        .slice(1)
        .forEach((member, index) =>
          addLink(
            members[index],
            member,
            affected ? 55 : 3,
            true,
            affected ? 21 : undefined,
          ),
        );
    }
    endpoints[id] = {
      entry: members[0],
      exit: members[members.length - 1],
      end:
        x + (addresses.length === 4 ? 480 : (addresses.length - 1) * 240) + 180,
      members,
    };
  };

  let destinationX = 720;
  if (!unreachable) {
    addGroup(
      "as4811",
      "AS4811 – China Telecom (Group)",
      "AS4811",
      600,
      160,
      25,
      ["203.0.113.1", "203.0.113.2", "203.0.113.3", "203.0.113.4"],
    );
    const first = endpoints.as4811;
    addGroup(
      "as4812",
      "AS4812 – China Telecom (Group)",
      "AS4812",
      first.end + 300,
      210,
      53,
      phase === "degraded"
        ? ["203.0.113.8", "203.0.113.10", "203.0.113.11"]
        : ["203.0.113.8", "203.0.113.9", "203.0.113.11"],
    );
    const second = endpoints.as4812;
    addGroup(
      "as4134",
      "AS4134 – CHINANET Backbone",
      "AS4134",
      second.end + 130,
      160,
      123,
      ["203.0.113.16", "203.0.113.17"],
    );
    const third = endpoints.as4134;
    addGroup(
      "location",
      "Hong Kong, Hong Kong",
      "AS4134",
      third.end + 130,
      160,
      134,
      ["203.0.113.20", "203.0.113.21"],
    );
    const location = endpoints.location;
    addLink("gateway", first.entry, 1);
    if (phase === "degraded") {
      addHop({
        id: "alternate",
        label: "192.168.19.254",
        kind: "hop",
        x: first.end + 40,
        y: 20,
        latency: 70,
        asn: "Private network",
        ip: "192.168.19.254",
        traversed: 1680,
        packetLoss: 0,
      });
      addLink(first.exit, "alternate", 18);
      addLink("alternate", second.entry, 55, true, 21);
      addLink("alternate", third.entry, 26);
    } else {
      addLink(first.exit, second.entry, 18);
    }
    addLink(second.exit, third.entry, 26);
    addLink(third.exit, location.entry, 11);
    if (phase === "recent") addLink(third.exit, "destination", 19);
    destinationX = location.end + 130;
    addLink(
      location.exit,
      hideUnknown ? "destination" : "unknown",
      8,
      hideUnknown,
    );
    if (phase === "degraded") {
      const target = second.members[Math.min(1, second.members.length - 1)];
      const affectedEdges = links
        .filter((link) => link.to === target || link.packetLoss === 21)
        .map((link) => link.id);
      issues.push({
        id: "transit-response",
        title: "Transit response degradation",
        observed: `Hop response loss 21% · average RTT ${hops.find((hop) => hop.id === target)?.stats?.avg ?? 0} ms`,
        condition: "Hop response loss > 10% in this snapshot",
        nodeIds: [target],
        edgeIds: affectedEdges,
        severity: "warning",
      });
    }
  } else {
    addLink("gateway", hideUnknown ? "destination" : "unknown", null, false);
  }
  if (!hideUnknown) {
    addHop({
      id: "unknown",
      label: "Unknown",
      kind: "unknown",
      x: destinationX,
      y: 175,
      latency: null,
      asn: "Unknown",
      traversed: 6840,
    });
    destinationX += 220;
    addLink("unknown", "destination", null, false);
  }
  const asn =
    test.destination === "8.8.8.8"
      ? "AS15169"
      : test.destination === "1.1.1.1"
        ? "AS13335"
        : "Unknown";
  const asName =
    asn === "AS15169"
      ? "Google LLC"
      : asn === "AS13335"
        ? "Cloudflare, Inc."
        : undefined;
  addHop({
    id: "destination",
    label: test.destination,
    kind: "destination",
    x: destinationX,
    y: 150,
    latency: rtt === null ? null : rtt / factor,
    asn,
    asName,
    subtitle: asName ? `${asn} – ${asName}` : "Destination endpoint",
    ip: /^\d+\.\d+\.\d+\.\d+$/.test(test.destination)
      ? test.destination
      : undefined,
    traversed: 6840,
    packetLoss: loss,
  });
  if (loss > 0) {
    issues.push({
      id: "destination-loss",
      title: unreachable ? "Destination unreachable" : "End-to-end packet loss",
      observed: `${loss}% packet loss · ${rtt === null ? "N/A RTT" : `${rtt} ms RTT`}`,
      condition: "End-to-end packet loss > 1% in this snapshot",
      nodeIds: ["destination"],
      edgeIds: links
        .filter((link) => link.to === "destination")
        .map((link) => link.id),
      severity: unreachable ? "critical" : "warning",
    });
  }
  return { hops, links, issues, groups, reach, loss, rtt, phase };
}
