/** Base URL of the MikroTik hotspot gateway (VLAN 30, typically 192.168.30.1). */
export function hotspotGatewayBase(): string {
  const configured = process.env.HOTSPOT_GATEWAY_URL ?? "http://192.168.30.1/status";
  try {
    const url = new URL(configured);
    return `${url.protocol}//${url.host}`;
  } catch {
    return "http://192.168.30.1";
  }
}

export function hotspotStatusUrl(): string {
  return `${hotspotGatewayBase()}/status`;
}

function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

const PORTAL_SERVER_IP = (process.env.PORTAL_PUBLIC_URL ?? "http://192.168.10.10")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "")
  .split(":")[0];

/** When the client was trying to reach the gateway or the portal server itself,
 *  land on the hotspot status page instead of looping back. */
export function resolveContinueUrl(target: string): string {
  const statusUrl = hotspotStatusUrl();
  if (!/^https?:\/\//i.test(target)) return statusUrl;

  try {
    const requested = new URL(target);
    if (isLocalHost(requested.hostname)) return statusUrl;

    const gateway = new URL(hotspotGatewayBase());
    if (requested.hostname === gateway.hostname) return statusUrl;
    if (requested.hostname === PORTAL_SERVER_IP) return statusUrl;
  } catch {
    return statusUrl;
  }

  return target;
}
