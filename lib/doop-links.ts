import type { CmdbDevice } from "./cmdb";

export const DOOP_BASE_URL = "http://10.106.3.122:18080";

export const doopModels = {
  switch: { modelId: "mod_hw_net_switch", modelName: "Switch" },
  firewall: { modelId: "mod_hw_net_firewall", modelName: "Firewall" },
} as const;

// Devices that expose a jump link to the DOOP integrated monitor page.
export const linkableDevices = [
  "SH-DC1-CORE-SW01",
  "BJ-HQ-CORE-SW01",
  "GZ-HQ-CORE-SW01",
  "SZ-DC1-CORE-SW01",
  "SH-DC1-DMZ-FW01",
  "BJ-HQ-EDGE-FW01",
];

// Fill in the CI ID looked up in DOOP, keyed by CI name. An empty value keeps the link disabled.
export const ciIds: Record<string, string> = {
  "SH-DC1-CORE-SW01": "",
  "BJ-HQ-CORE-SW01": "",
  "GZ-HQ-CORE-SW01": "",
  "SZ-DC1-CORE-SW01": "",
  "SH-DC1-DMZ-FW01": "",
  "BJ-HQ-EDGE-FW01": "",
};

export function isLinkable(device: CmdbDevice) {
  return linkableDevices.includes(device.name);
}

export function doopMonitorUrl(device: CmdbDevice) {
  const ciId = ciIds[device.name];
  if (!ciId) return null;
  const model = doopModels[device.type];
  const params = new URLSearchParams({
    modelId: model.modelId,
    modelName: model.modelName,
    faultType: "all",
    followType: "all",
    resourceVisible: "1",
    rangeTime: "6h",
    ciId,
  });
  return `${DOOP_BASE_URL}/#/doop/doop/infrastructure/integratedMonitor/list?${params.toString()}`;
}
