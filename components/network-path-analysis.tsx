"use client";

import { useState } from "react";
import { Download, Expand, Search, Settings2, X } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AnalysisHop = {
  id: string;
  label: string;
  kind: string;
  latency: number | null;
  traversed: number;
  packetLoss?: number;
};
type Props = {
  source: string;
  destination: string;
  reach: number;
  rtt: number;
  hops: AnalysisHop[];
  startTime: number;
  endTime: number;
};
type ChartKey = "reach" | "rtt" | "hop";
type Sample = { time: number; value: number | null };

const columnLabels = {
  loss: "LOSS %",
  count: "COUNT",
  latest: "LATEST",
  avg: "AVG",
  min: "MIN",
  max: "MAX",
};
type ColumnKey = keyof typeof columnLabels;
const allColumns = Object.keys(columnLabels) as ColumnKey[];
const formatRtt = (value: number | null) =>
  value === null
    ? "N/A"
    : value >= 1000
      ? `${(value / 1000).toFixed(2)} s`
      : `${Number(value.toFixed(1))} ms`;

function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "N/A").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function NetworkPathAnalysis({
  source,
  destination,
  reach,
  rtt,
  hops,
  startTime,
  endTime,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("gateway");
  const [columns, setColumns] = useState<ColumnKey[]>(allColumns);
  const [fullscreen, setFullscreen] = useState<ChartKey | null>(null);
  const times = Array.from(
    { length: 64 },
    (_, index) => startTime + ((endTime - startTime) * index) / 63,
  );
  const hopSamples = (hop: AnalysisHop): Sample[] =>
    times.map((time, index) => ({
      time,
      value:
        hop.latency === null || hop.kind === "source"
          ? null
          : Number(
              Math.max(
                0.1,
                hop.latency * (0.78 + 0.16 * Math.sin(index * 0.7)) +
                  (index === 39
                    ? hop.latency * 9
                    : index === 61
                      ? hop.latency * 1.5
                      : 0),
              ).toFixed(1),
            ),
    }));
  const rows = hops.map((hop, index) => {
    const samples = hopSamples(hop);
    const values = samples.flatMap((sample) =>
      sample.value === null ? [] : [sample.value],
    );
    return {
      ...hop,
      index: hop.kind === "unknown" ? "N/A" : index,
      samples,
      loss: hop.kind === "unknown" ? null : hop.packetLoss || 0,
      latest: values.at(-1) ?? null,
      avg: values.length
        ? values.reduce((total, value) => total + value, 0) / values.length
        : null,
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
    };
  });
  const filteredRows = rows.filter((row) =>
    row.label.toLowerCase().includes(search.toLowerCase()),
  );
  const selected =
    filteredRows.find((row) => row.id === selectedId) ||
    filteredRows.find((row) => row.avg !== null) ||
    filteredRows[0];
  const reachSamples = times.map((time, index) => ({
    time,
    value:
      reach === 0
        ? 0
        : Number(
            Math.min(
              100,
              Math.max(0, reach + Math.sin(index * 0.65) * 0.7),
            ).toFixed(1),
          ),
  }));
  const rttSamples = times.map((time, index) => ({
    time,
    value:
      reach === 0
        ? null
        : Number(
            Math.max(0, rtt * (1 + Math.sin(index * 0.6) * 0.045)).toFixed(1),
          ),
  }));
  const formatTime = (time: number) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Hong_Kong",
      ...(endTime - startTime >= 86400000
        ? { month: "short", day: "numeric" }
        : { hour: "2-digit", minute: "2-digit" }),
    }).format(time);
  const titles: Record<ChartKey, string> = {
    reach: "End-to-End Reachability",
    rtt: "End-to-End RTT Latency",
    hop: "Hop RTT Latency",
  };
  const series: Record<ChartKey, Sample[]> = {
    reach: reachSamples,
    rtt: rttSamples,
    hop: selected?.samples || times.map((time) => ({ time, value: null })),
  };
  const ticks = Array.from(
    { length: 6 },
    (_, index) => startTime + ((endTime - startTime) * index) / 5,
  );

  const renderChart = (key: ChartKey, enlarged = false) => {
    const data = series[key];
    const noData = data.every((sample) => sample.value === null);
    return (
      <section
        className={`npd-metric-chart ${enlarged ? "enlarged" : ""}`}
        aria-label={titles[key]}
      >
        <header>
          <h4>{titles[key]}</h4>
          <div>
            <button
              title={`Export ${titles[key]}`}
              aria-label={`Export ${titles[key]}`}
              onClick={() =>
                downloadCsv(`network-path-${key}.csv`, [
                  [
                    "Time (UTC)",
                    key === "reach" ? "Reachability (%)" : "RTT (ms)",
                  ],
                  ...data.map((sample) => [
                    new Date(sample.time).toISOString(),
                    sample.value,
                  ]),
                ])
              }
            >
              <Download size={13} />
            </button>
            <button
              title={enlarged ? "Close chart" : `Expand ${titles[key]}`}
              aria-label={enlarged ? "Close chart" : `Expand ${titles[key]}`}
              onClick={() => setFullscreen(enlarged ? null : key)}
            >
              {enlarged ? <X size={15} /> : <Expand size={13} />}
            </button>
          </div>
        </header>
        <div className="npd-chart-plot">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 15, right: 12, bottom: 8, left: 7 }}
            >
              <CartesianGrid stroke="#e7edf3" vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                domain={[startTime, endTime]}
                ticks={ticks}
                tickFormatter={formatTime}
                tick={{ fontSize: 9, fill: "#738391" }}
                minTickGap={22}
                axisLine={{ stroke: "#cbd6df" }}
                tickLine={false}
              />
              <YAxis
                domain={key === "reach" ? [0, 100] : [0, "auto"]}
                width={48}
                tick={{ fontSize: 9, fill: "#738391" }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: key === "reach" ? "Percent" : "Milliseconds",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 9, fill: "#8b99a5" },
                }}
              />
              <Tooltip
                labelFormatter={(value) =>
                  new Intl.DateTimeFormat("en-GB", {
                    timeZone: "Asia/Hong_Kong",
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(Number(value))
                }
                formatter={(value: number) => [
                  key === "reach" ? `${value}%` : formatRtt(value),
                  key === "hop" ? selected?.label : titles[key],
                ]}
                contentStyle={{
                  fontSize: 11,
                  borderColor: "#dce4ec",
                  borderRadius: 3,
                }}
              />
              <Line
                type="linear"
                dataKey="value"
                stroke="#409eff"
                strokeWidth={1.6}
                dot={false}
                activeDot={{ r: 3 }}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          {noData && (
            <span className="npd-chart-empty">
              {key === "rtt" && reach === 0 ? "N/A" : "No RTT samples"}
            </span>
          )}
        </div>
        <div className="npd-chart-legend">
          <i />
          <span
            title={
              key === "hop" ? selected?.label : `${destination}, ${source}`
            }
          >
            {key === "hop"
              ? selected?.label || "No hops"
              : `${destination}, ${source}`}
          </span>
        </div>
      </section>
    );
  };

  return (
    <div className="npd-analysis npd-analysis-dashboard">
      <h3>End-to-End Metrics</h3>
      <div className="npd-analysis-grid">
        {renderChart("reach")}
        {renderChart("rtt")}
      </div>
      <h3>Hop RTT Latency</h3>
      <div className="npd-analysis-grid npd-hop-analysis-grid">
        <section className="npd-hop-metrics" aria-label="Hop metrics">
          <div className="npd-hop-table-tools">
            <span>
              Showing {filteredRows.length ? `1–${filteredRows.length}` : "0"}{" "}
              of {rows.length} hops
            </span>
            <label>
              <Search size={13} />
              <input
                aria-label="Search analysis hops"
                placeholder="Search by name or IP address"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <details className="npd-column-settings">
              <summary title="Table columns" aria-label="Table columns">
                <Settings2 size={14} />
              </summary>
              <div>
                {allColumns.map((column) => (
                  <label key={column}>
                    <input
                      type="checkbox"
                      checked={columns.includes(column)}
                      onChange={() =>
                        setColumns((current) =>
                          current.includes(column)
                            ? current.filter((value) => value !== column)
                            : [...current, column],
                        )
                      }
                    />
                    {columnLabels[column]}
                  </label>
                ))}
                <button onClick={() => setColumns(allColumns)}>Reset</button>
              </div>
            </details>
            <button
              title="Export hop metrics"
              aria-label="Export hop metrics"
              onClick={() =>
                downloadCsv("network-path-hops.csv", [
                  [
                    "Hop",
                    "Name",
                    ...allColumns.map((column) => columnLabels[column]),
                  ],
                  ...filteredRows.map((row) => [
                    row.index,
                    row.label,
                    row.loss,
                    row.traversed,
                    row.latest,
                    row.avg === null ? null : Number(row.avg.toFixed(1)),
                    row.min,
                    row.max,
                  ]),
                ])
              }
            >
              <Download size={13} />
            </button>
          </div>
          <div className="npd-analysis-scroll">
            <table>
              <colgroup>
                <col className="npd-hop-index-column" />
                <col className="npd-hop-name-column" />
                {allColumns
                  .filter((column) => columns.includes(column))
                  .map((column) => (
                    <col key={column} />
                  ))}
              </colgroup>
              <thead>
                <tr className="npd-table-column-groups">
                  <th colSpan={2} />
                  {columns.some(
                    (column) => column === "loss" || column === "count",
                  ) && (
                    <th
                      colSpan={
                        columns.filter(
                          (column) => column === "loss" || column === "count",
                        ).length
                      }
                    >
                      PACKETS
                    </th>
                  )}
                  {columns.some(
                    (column) => column !== "loss" && column !== "count",
                  ) && (
                    <th
                      colSpan={
                        columns.filter(
                          (column) => column !== "loss" && column !== "count",
                        ).length
                      }
                    >
                      RTT LATENCY
                    </th>
                  )}
                </tr>
                <tr>
                  <th>#</th>
                  <th>NAME</th>
                  {allColumns
                    .filter((column) => columns.includes(column))
                    .map((column) => (
                      <th key={column}>{columnLabels[column]}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className={selected?.id === row.id ? "selected" : ""}
                  >
                    <td>{row.index}</td>
                    <td>
                      <button
                        className="npd-hop-select"
                        aria-pressed={selected?.id === row.id}
                        title={row.label}
                        onClick={() => setSelectedId(row.id)}
                      >
                        {row.label}
                      </button>
                    </td>
                    {allColumns
                      .filter((column) => columns.includes(column))
                      .map((column) => (
                        <td
                          key={column}
                          className={
                            column === "loss" && (row.loss || 0) > 0
                              ? "np-red"
                              : ""
                          }
                        >
                          {column === "loss"
                            ? row.loss === null
                              ? "N/A"
                              : `${row.loss.toFixed(1)}%`
                            : column === "count"
                              ? row.traversed.toLocaleString("en-US")
                              : formatRtt(row[column])}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredRows.length && (
              <div className="npd-analysis-empty">
                No hops match your search
              </div>
            )}
          </div>
        </section>
        {renderChart("hop")}
      </div>
      {fullscreen && (
        <div
          className="npd-chart-modal-backdrop"
          onClick={() => setFullscreen(null)}
        >
          <div
            className="npd-chart-modal"
            role="dialog"
            aria-modal="true"
            aria-label={titles[fullscreen]}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setFullscreen(null);
            }}
            tabIndex={-1}
            ref={(element) => element?.focus()}
          >
            {renderChart(fullscreen, true)}
          </div>
        </div>
      )}
    </div>
  );
}
