import type { Metadata } from "next";
import { IpSlaDashboard } from "@/components/ip-sla-dashboard";
import "../network-path/network-path.css";
import "./ip-sla.css";

export const metadata: Metadata = {
  title: "DOOP - IP SLA",
  description: "IP SLA network quality dashboard prototype",
};

export default function IpSlaPage() {
  return <IpSlaDashboard />;
}