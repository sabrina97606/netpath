import devicesJson from "./cmdb-devices.json";

export type CmdbDevice = {
  name: string;
  ip: string;
  oobIp: string;
  type: "switch" | "firewall";
  vendor: string;
  model: string;
  portCount: number | null;
  running: string;
};

export const cmdbDevices = devicesJson as CmdbDevice[];
export const cmdbByName = new Map(cmdbDevices.map((device) => [device.name, device]));
export const cmdbByIp = new Map(cmdbDevices.map((device) => [device.ip, device]));

export function device(name: string): CmdbDevice {
  const found = cmdbByName.get(name);
  if (!found) throw new Error(`CMDB device not found: ${name}`);
  return found;
}

const cities = {
  BJ: { name: "Beijing", lat: 39.9, lon: 116.4 },
  SH: { name: "Shanghai", lat: 31.23, lon: 121.47 },
  GZ: { name: "Guangzhou", lat: 23.13, lon: 113.26 },
  SZ: { name: "Shenzhen", lat: 22.54, lon: 114.06 },
  HZ: { name: "Hangzhou", lat: 30.27, lon: 120.16 },
  NJ: { name: "Nanjing", lat: 32.06, lon: 118.8 },
  CD: { name: "Chengdu", lat: 30.57, lon: 104.07 },
  WH: { name: "Wuhan", lat: 30.59, lon: 114.3 },
  XA: { name: "Xi'an", lat: 34.34, lon: 108.94 },
  CQ: { name: "Chongqing", lat: 29.56, lon: 106.55 },
} as const;

export function cityOf(deviceName: string) {
  return cities[deviceName.slice(0, 2) as keyof typeof cities];
}

export function siteCode(deviceName: string) {
  return deviceName.split("-").slice(0, 2).join("-");
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Estimated round-trip time over a domestic backbone: fiber detour plus fixed forwarding overhead.
export function baseRtt(sourceName: string, targetName: string) {
  if (siteCode(sourceName) === siteCode(targetName)) return 0.6;
  return 2 + distanceKm(cityOf(sourceName), cityOf(targetName)) * 0.02;
}

export function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const probeFeature: Record<string, string> = {
  Cisco: "Cisco IP SLA",
  Huawei: "Huawei NQA",
  H3C: "H3C NQA",
  Ruijie: "Ruijie SLA",
  Juniper: "Juniper RPM",
  Arista: "Arista EOS probe",
  Fortinet: "FortiGate Link Monitor",
  "Palo Alto Networks": "Path Monitoring",
};
