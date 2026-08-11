import { NextResponse } from "next/server";
import { isMikrotikConfigured, pingRouter, getAverageNetworkSpeeds, getHotspotInterfaceStats } from "@/lib/mikrotik";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isMikrotikConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        ok: false,
        error: "MikroTik API is not configured (check MIKROTIK_* env vars)",
        networkStats: null,
        interfaceStats: null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await pingRouter();
  } catch (err) {
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        networkStats: null,
        interfaceStats: null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const [networkStats, interfaceStats] = await Promise.all([
    getAverageNetworkSpeeds(),
    getHotspotInterfaceStats(),
  ]);

  return NextResponse.json(
    {
      configured: true,
      ok: true,
      error: null,
      networkStats,
      interfaceStats,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
