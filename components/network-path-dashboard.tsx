"use client";

import { useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Check, ChevronDown, Clock3, RefreshCw } from "lucide-react";
import { ChartContainer } from "@/components/ui/chart";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CiLink } from "@/components/ci-link";
import { cmdbByName, seeded } from "@/lib/cmdb";
import { useNpI18n } from "@/lib/network-path-i18n";

export type DashboardTest = {
  id: string;
  source: string;
  destination: string;
  protocol: string;
  port: string;
  reach: number;
  rtt: number;
  noData?: boolean;
};

type Status = "All tests" | "Reachable" | "Unreachable" | "No Data";
type Metric = "reach" | "rtt" | "loss";

const statusColors = { Reachable: "#25a77a", Unreachable: "#e05a60", "No Data": "#909399" };
const stateOf = (test: DashboardTest): Exclude<Status, "All tests"> =>
  test.noData ? "No Data" : test.reach > 0 ? "Reachable" : "Unreachable";

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);
const format = (value: number | null, unit = "") => (value === null ? "N/A" : `${Number(value.toFixed(1))}${unit}`);

function trend(tests: DashboardTest[], hours: number, end: number) {
  const valid = tests.filter((test) => test.reach > 0);
  const meanReach = average(tests.map((test) => test.reach));
  const meanRtt = average(valid.map((test) => test.rtt));
  return Array.from({ length: 25 }, (_, index) => {
    const timestamp = end - (24 - index) * hours * 3600000 / 24;
    const date = new Date(timestamp);
    const localHour = ((date.getUTCHours() + 8) % 24) + date.getUTCMinutes() / 60;
    const businessLoad = Math.exp(-(((localHour - 14) / 4) ** 2));
    const noise = seeded(`np-trend-${hours}-${index}`);
    const spike = noise() > 0.9 ? 1.25 : 1;
    const factor = index === 24 ? 1 : (0.9 + businessLoad * 0.14 + (noise() - 0.5) * 0.06) * spike;
    const reach = meanReach === null ? null : Math.min(100, meanReach * (index === 24 ? 1 : 1 - (factor - 1) * 0.08));
    return {
      time: date.toISOString().slice(11, 16),
      rtt: meanRtt === null ? null : Number((meanRtt * factor).toFixed(1)),
      reach: reach === null ? null : Number(reach.toFixed(2)),
      loss: reach === null ? null : Number((100 - reach).toFixed(2)),
    };
  });
}

function TrendChart({ data, metric, color, unit }: { data: ReturnType<typeof trend>; metric: Metric; color: string; unit: string }) {
  const { t } = useNpI18n();
  const label = t(metric === "reach" ? "Avg reachability" : metric === "rtt" ? "Avg RTT" : "Avg packet loss");
  const reachValues = data.flatMap((point) => (point.reach === null ? [] : [point.reach]));
  const reachFloor = Math.max(0, Math.floor(Math.min(...reachValues, 100) / 10) * 10);
  const reachTicks = Array.from({ length: (100 - reachFloor) / 10 + 1 }, (_, index) => reachFloor + index * 10);
  return (
    <ChartContainer className="np-dash-chart" aria-label={t(`${label} trend`)} config={{ [metric]: { label, color } }}>
      <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e8edf3" />
        <XAxis dataKey="time" minTickGap={35} tick={{ fontSize: 12, fill: "#909399" }} axisLine={{ stroke: "#e8edf3" }} tickLine={false} />
        <YAxis width={58} tick={{ fontSize: 12, fill: "#909399" }} axisLine={false} tickLine={false} unit={unit} domain={metric === "reach" ? [reachFloor, 100] : [0, "auto"]} ticks={metric === "reach" ? reachTicks : undefined} />
        <Tooltip formatter={(value: number) => [`${value}${unit}`, label]} contentStyle={{ border: "1px solid #dcdfe6", borderRadius: 2, fontSize: 12 }} />
        <Area type="linear" dataKey={metric} stroke={color} fill={color} fillOpacity={0.45} strokeWidth={1} dot={false} isAnimationActive={false} connectNulls={false} />
      </AreaChart>
    </ChartContainer>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Collapsible defaultOpen className="np-dash-section">
      <div className="np-dash-heading">
        <CollapsibleTrigger className="np-dash-toggle">
          <ChevronDown size={13} />
          <h3>{title}</h3>
        </CollapsibleTrigger>
        {note && <span>{note}</span>}
      </div>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function NetworkPathDashboard({
  tests,
  renderDestination,
  onOpen,
}: {
  tests: DashboardTest[];
  renderDestination: (name: string) => ReactNode;
  onOpen: (id: string) => void;
}) {
  const { t } = useNpI18n();
  const [hours, setHours] = useState(6);
  const [refresh, setRefresh] = useState(0);
  const [status, setStatus] = useState<Status>("All tests");
  const end = Date.UTC(2026, 9, 28, 6, refresh);
  const measured = tests.filter((test) => !test.noData);
  const reachable = measured.filter((test) => test.reach > 0);
  const filtered = tests.filter((test) => status === "All tests" || stateOf(test) === status);
  const data = trend(measured, hours, end);
  const cards: { name: Status | "Avg reachability" | "Avg RTT"; value: string | number; filter?: Status }[] = [
    { name: "All tests", value: tests.length, filter: "All tests" },
    { name: "Reachable", value: reachable.length, filter: "Reachable" },
    { name: "Unreachable", value: measured.length - reachable.length, filter: "Unreachable" },
    { name: "Avg reachability", value: format(average(measured.map((test) => test.reach)), "%") },
    { name: "Avg RTT", value: format(average(reachable.map((test) => test.rtt)), " ms") },
  ];
  const charts: { metric: Metric; title: string; color: string; unit: string }[] = [
    { metric: "reach", title: "Reachability", color: "#25a77a", unit: "%" },
    { metric: "rtt", title: "Round-trip time", color: "#409eff", unit: "ms" },
    { metric: "loss", title: "Packet loss", color: "#d99519", unit: "%" },
  ];

  return (
    <section className="np-dash" aria-label={t("Network Path dashboard")}>
      <div className="np-dash-toolbar">
        <h2>{t("Network Path Overview")}</h2>
        <div className="np-dash-actions">
          <Clock3 size={13} />
          <select aria-label={t("Time range")} value={hours} onChange={(event) => setHours(Number(event.target.value))}>
            <option value={1}>{t("Last 1 hour")}</option>
            <option value={6}>{t("Last 6 hours")}</option>
            <option value={24}>{t("Last 24 hours")}</option>
          </select>
          <span>
            {new Date(end - hours * 3600000).toISOString().slice(0, 16).replace("T", " ")} – {new Date(end).toISOString().slice(11, 16)} UTC
          </span>
          <button type="button" title={t("Refresh dashboard")} aria-label={t("Refresh dashboard")} onClick={() => setRefresh((previous) => previous + 1)}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <Section title={t("Global overview")} note={t(`Latest status · ${new Date(end).toISOString().slice(11, 19)} UTC`)}>
        <div className="np-dash-summary" aria-label={t("Test summary")}>
          {cards.map((card) => (
            <button
              type="button"
              className="np-dash-stat"
              key={card.name}
              disabled={!card.filter}
              aria-pressed={card.filter ? status === card.filter : undefined}
              onClick={() => card.filter && setStatus(status === card.filter ? "All tests" : card.filter)}
            >
              <span>{t(card.name)}</span>
              <strong>{card.value}</strong>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t("Quality monitoring")} note={t(`Mean across ${reachable.length} reachable tests · UTC`)}>
        <div className="np-dash-trends">
          {charts.map((item) => (
            <section className="np-dash-panel" key={item.metric}>
              <div className="np-dash-panel-title">
                <h3>{t(item.title)}</h3>
                <strong>{format(data[data.length - 1][item.metric], ` ${item.unit}`.replace(" %", "%"))}</strong>
              </div>
              {data.every((point) => point[item.metric] === null) ? (
                <div className="np-dash-empty">{t("No valid results in this scope")}</div>
              ) : (
                <TrendChart data={data} metric={item.metric} color={item.color} unit={item.unit} />
              )}
            </section>
          ))}
        </div>
      </Section>

      <Section title={t("Destination details")}>
        <section className="np-dash-panel" aria-label={t("Destination performance")}>
          <div className="np-dash-panel-title">
            <h3>
              {t("Destination performance")} <span className="np-dash-count">{filtered.length}</span>
            </h3>
            <span>{t(`Latest result · ${status}`)}</span>
          </div>
          <div className="np-dash-table-wrap">
            <table className="np-dash-table">
              <thead>
                <tr>
                  <th>{t("Source")}</th>
                  <th>{t("Destination")}</th>
                  <th>{t("Protocol")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Reachability")}</th>
                  <th>{t("Avg RTT (ms)")}</th>
                  <th aria-label={t("Actions")} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((test) => {
                  const state = stateOf(test);
                  const sourceCi = cmdbByName.get(test.source);
                  return (
                    <tr key={test.id}>
                      <td>
                        <div className="np-dash-ci">
                          <button type="button" className="np-dash-link" onClick={() => onOpen(test.id)}>
                            {test.source}
                          </button>
                          <CiLink ci={sourceCi} />
                        </div>
                        {sourceCi && <small>{sourceCi.ip}</small>}
                      </td>
                      <td>{renderDestination(test.destination)}</td>
                      <td>
                        {test.protocol}
                        {test.port && ` : ${test.port}`}
                      </td>
                      <td>
                        <span className="np-dash-badge" style={{ color: statusColors[state] }}>
                          <span style={{ background: statusColors[state] }} />
                          {t(state)}
                        </span>
                      </td>
                      <td>
                        <div className="np-dash-reach">
                          <div className="np-reach-bar">
                            <span style={{ width: `${test.noData ? 0 : test.reach}%` }} />
                          </div>
                          <strong>{test.noData ? t("No data") : `${test.reach}%`}</strong>
                        </div>
                      </td>
                      <td>{test.noData ? t("No data") : test.reach > 0 ? test.rtt : "N/A"}</td>
                      <td>
                        <button type="button" className="np-dash-link" onClick={() => onOpen(test.id)}>
                          {t("View Path")} <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!filtered.length && (
            <div className="np-dash-empty">
              <Check size={17} /> {t("No tests match the selected status")}
            </div>
          )}
        </section>
      </Section>
    </section>
  );
}
