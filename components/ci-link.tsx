import { ExternalLink } from "lucide-react";
import type { CmdbDevice } from "@/lib/cmdb";
import { doopMonitorUrl, isLinkable } from "@/lib/doop-links";

const base = "inline-flex size-5 flex-none items-center justify-center rounded-sm align-middle";

export function CiLink({ ci }: { ci: CmdbDevice | undefined }) {
  if (!ci || !isLinkable(ci)) return null;
  const url = doopMonitorUrl(ci);
  if (!url) {
    return (
      <span
        role="img"
        className={`${base} cursor-help text-[#c0c4cc]`}
        title={`${ci.name} · CI ID pending`}
        aria-label={`${ci.name} monitor link unavailable, CI ID pending`}
      >
        <ExternalLink size={12} />
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={`${base} text-[#409eff] hover:bg-[#ecf5ff]`}
      title={`Open ${ci.name} in integrated monitor`}
      aria-label={`Open ${ci.name} in integrated monitor`}
    >
      <ExternalLink size={12} />
    </a>
  );
}
