#!/usr/bin/env tsx
import "source-map-support/register";
import { db } from "@/lib/db";
import { isMikrotikConfigured, mapMacsToIpAddresses } from "@/lib/mikrotik";

async function main() {
  console.log("mikrotik ip sync: starting");
  if (!isMikrotikConfigured()) {
    console.warn("mikrotik not configured; aborting ip sync");
    return process.exit(0);
  }

  const devices = await db.device.findMany({ select: { id: true, macAddress: true, ipAddress: true } });
  const macs = devices.map((d) => d.macAddress).filter(Boolean) as string[];
  if (macs.length === 0) {
    console.log("no devices found to sync");
    return process.exit(0);
  }

  const map = await mapMacsToIpAddresses(macs);

  let updated = 0;
  for (const dev of devices) {
    const macKey = (dev.macAddress ?? "").replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
    const ip = map[macKey] ?? null;
    if (!ip) continue;
    if (dev.ipAddress !== ip) {
      await db.device.update({ where: { id: dev.id }, data: { ipAddress: ip } });
      updated += 1;
      console.log(`updated ${dev.macAddress} -> ${ip}`);
    }
  }

  console.log(`mikrotik ip sync: finished, updated ${updated} records`);
  process.exit(0);
}

main().catch((err) => {
  console.error("mikrotik ip sync: error", err);
  process.exit(2);
});
