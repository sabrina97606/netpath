import type { Metadata } from "next";
import { NetworkPath } from "@/components/network-path";
import "./network-path.css";

export const metadata: Metadata = {
  title: "DOOP - Network Path",
  description: "Network Path monitoring prototype",
};

export default function NetworkPathPage() {
  return <NetworkPath />;
}
