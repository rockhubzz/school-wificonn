"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, RefreshCw, Wifi } from "lucide-react";

type NetworkStats = {
  avgDownloadMbps: number;
  avgUploadMbps: number;
  peakDownloadMbps: number;
  peakUploadMbps: number;
  activeUsers: number;
} | null;

type InterfaceStats = {
  rxBytes: number;
  txBytes: number;
  activeSessions: number;
} | null;

export type NetworkData = {
  configured: boolean;
  ok: boolean;
  error: string | null;
  networkStats: NetworkStats;
  interfaceStats: InterfaceStats;
};

let sharedFetch: Promise<NetworkData> | null = null;
let currentData: NetworkData | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function loadNetworkData(): Promise<NetworkData> {
  if (!sharedFetch) {
    sharedFetch = fetch("/api/admin/dashboard/network", { cache: "no-store" })
      .then((res) =>
        res.ok ? res.json() : Promise.reject(new Error(`Request failed (${res.status})`)),
      )
      .catch((err) => ({
        configured: true,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        networkStats: null,
        interfaceStats: null,
      }))
      .then((data) => {
        currentData = data;
        notify();
        return data;
      });
  }
  return sharedFetch;
}

export function refreshNetworkData(): void {
  sharedFetch = null;
  currentData = null;
  void loadNetworkData();
}

function useNetworkData(): NetworkData | null {
  const [, setTick] = useState(0);
  useEffect(() => subscribe(() => setTick((n) => n + 1)), []);
  useEffect(() => {
    void loadNetworkData();
  }, []);
  return currentData;
}

function SpeedCard({
  href,
  label,
  color,
  Icon,
  unit,
  loading,
  value,
  peak,
  error,
}: {
  href: string;
  label: string;
  color: "success" | "warning";
  Icon: typeof ArrowDown;
  unit: string;
  loading: boolean;
  value: string;
  peak: string;
  error: string | null;
}) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <div className="stat-card">
        <div className={`stat-card-icon ${color}`}>
          <Icon size={24} strokeWidth={2} />
        </div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">
          {loading ? (
            <Loader2
              size={26}
              style={{ animation: "spin 1s linear infinite", color: "var(--text-muted)" }}
            />
          ) : error ? (
            <span style={{ fontSize: "1.6rem", color: "var(--text-muted)" }}>—</span>
          ) : (
            <>
              {value}
              <span style={{ fontSize: "1.2rem", fontWeight: 600, marginLeft: 6, color: "var(--text-muted)" }}>{unit}</span>
            </>
          )}
        </div>
        <div className="stat-card-trend">
          {loading ? (
            "Fetching from router…"
          ) : error ? (
            <span style={{ color: "var(--danger)" }}>{error}</span>
          ) : (
            `Peak: ${peak} ${unit}`
          )}
        </div>
      </div>
    </Link>
  );
}

export function NetworkSpeedCards() {
  const data = useNetworkData();
  const loading = data === null;
  const error = data && !data.ok ? (data.error ?? "Router unavailable") : null;
  const stats = data?.networkStats;

  return (
    <>
      <SpeedCard
        href="/admin/students?status=ACTIVE"
        label="Avg Download Speed"
        color="success"
        Icon={ArrowDown}
        unit="Mbps"
        loading={loading}
        value={stats ? Math.round(stats.avgDownloadMbps).toString() : "0"}
        peak={stats ? Math.round(stats.peakDownloadMbps).toString() : "0"}
        error={error}
      />
      <SpeedCard
        href="/admin/students?status=ACTIVE"
        label="Avg Upload Speed"
        color="warning"
        Icon={ArrowUp}
        unit="Mbps"
        loading={loading}
        value={stats ? Math.round(stats.avgUploadMbps).toString() : "0"}
        peak={stats ? Math.round(stats.peakUploadMbps).toString() : "0"}
        error={error}
      />
    </>
  );
}

export function NetworkPerformancePanel() {
  const data = useNetworkData();
  const loading = data === null;
  const error = data && !data.ok ? (data.error ?? "Router unavailable") : null;
  const stats = data?.networkStats;
  const connected = data?.interfaceStats?.activeSessions ?? stats?.activeUsers ?? 0;
  const down = stats ? Math.round(stats.avgDownloadMbps).toString() : "0";
  const up = stats ? Math.round(stats.avgUploadMbps).toString() : "0";

  return (
    <div style={{ padding: 14, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--text-primary)" }}>
          Network Performance
        </div>
        <button
          onClick={refreshNetworkData}
          disabled={loading}
          className="btn-admin btn-ghost-admin"
          style={{ fontSize: ".72rem", padding: "4px 10px", boxShadow: "none" }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", color: "var(--text-muted)", fontSize: ".8rem" }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          Connecting to MikroTik router…
        </div>
      ) : error ? (
        <div className="alert-danger-admin" style={{ fontSize: ".76rem" }}>{error}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ArrowDown size={14} color="var(--success)" />
              <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>Download</span>
            </div>
            <span style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--success)" }}>{down} Mbps</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ArrowUp size={14} color="var(--warning)" />
              <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>Upload</span>
            </div>
            <span style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--warning)" }}>{up} Mbps</span>
          </div>
          <div style={{ height: 1, background: "var(--border)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Wifi size={14} color="var(--accent)" />
              <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>Connected now</span>
            </div>
            <span style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--accent)" }}>
              {connected} device{connected === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
