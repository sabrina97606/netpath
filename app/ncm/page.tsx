import type { Metadata } from "next";
import { NcmDashboard } from "@/components/ncm-dashboard";
import "../network-path/network-path.css";
import "../ip-sla/ip-sla.css";
import "./ncm.css";

export const metadata: Metadata = {
  title: "DOOP - NCM",
  description: "Network Configuration Manager: automated backups, config comparison and rollback, compliance auditing, bulk automation and change detection",
};

export default function NcmPage() {
  return <NcmDashboard />;
}
