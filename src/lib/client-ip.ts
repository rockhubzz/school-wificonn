import type { NextRequest } from "next/server";

/** Student hotspot VLAN — admin routes must not be reachable from here. */
const STUDENT_VLAN_PREFIX = "192.168.30.";

/** Staff VLAN — should see admin login, not the student portal. */
const STAFF_VLAN_PREFIX = "192.168.20.";

export function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return req.ip ?? null;
}

function normalizeIp(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

export function isStudentVlanIp(ip: string | null): boolean {
  if (!ip) return false;
  return normalizeIp(ip).startsWith(STUDENT_VLAN_PREFIX);
}

export function isStaffVlanIp(ip: string | null): boolean {
  if (!ip) return false;
  return normalizeIp(ip).startsWith(STAFF_VLAN_PREFIX);
}
