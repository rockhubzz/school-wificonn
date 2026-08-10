import { db } from "@/lib/db";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Smartphone, ChevronRight, TrendingUp, Users, Wifi, Activity, ArrowUp, ArrowDown } from "lucide-react";
import { isMikrotikConfigured, getAverageNetworkSpeeds } from "@/lib/mikrotik";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [pending, active, denied, pendingDevices, totalStudents, approvedDevices, recentStudents, networkStats] = await Promise.all([
    db.student.count({ where: { status: "PENDING" } }),
    db.student.count({ where: { status: "ACTIVE" } }),
    db.student.count({ where: { status: "DENIED" } }),
    db.device.count({ where: { approved: false } }),
    db.student.count(),
    db.device.count({ where: { approved: true } }),
    db.student.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { devices: true },
    }),
    isMikrotikConfigured() ? getAverageNetworkSpeeds() : Promise.resolve(null),
  ]);

  // Calculate average devices per active student
  const avgDevicesPerStudent = active > 0 ? (approvedDevices / active).toFixed(1) : "0.0";

  // Real network speed statistics from MikroTik (rounded to whole numbers)
  const avgDownloadSpeed = networkStats ? Math.round(networkStats.avgDownloadMbps).toString() : "0";
  const avgUploadSpeed = networkStats ? Math.round(networkStats.avgUploadMbps).toString() : "0";
  const peakDownloadSpeed = networkStats ? Math.round(networkStats.peakDownloadMbps).toString() : "0";
  const peakUploadSpeed = networkStats ? Math.round(networkStats.peakUploadMbps).toString() : "0";

  const stats = [
    {
      label: "Total Students",
      value: totalStudents,
      color: "accent",
      Icon: Users,
      href: "/admin/students",
      subtitle: `${active} active, ${pending} pending`
    },
    {
      label: "Avg Download Speed",
      value: avgDownloadSpeed,
      unit: "Mbps",
      color: "success",
      Icon: ArrowDown,
      href: "/admin/students?status=ACTIVE",
      subtitle: `Peak: ${peakDownloadSpeed} Mbps`
    },
    {
      label: "Avg Upload Speed",
      value: avgUploadSpeed,
      unit: "Mbps",
      color: "warning",
      Icon: ArrowUp,
      href: "/admin/students?status=ACTIVE",
      subtitle: `Peak: ${peakUploadSpeed} Mbps`
    },
    {
      label: "Connected Devices",
      value: approvedDevices,
      color: "accent",
      Icon: Wifi,
      href: "/admin/devices",
      subtitle: `${avgDevicesPerStudent} avg per student`
    },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here's what's happening with your network today.</p>
      </div>

      {/* Stat cards — fixed 4-col on desktop */}
      <div className="stat-grid">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
            <div className="stat-card">
              <div className={`stat-card-icon ${s.color}`}>
                <s.Icon size={24} strokeWidth={2} />
              </div>
              <div className="stat-card-label">{s.label}</div>
              <div className="stat-card-value">
                {s.value}
                {s.unit && <span style={{ fontSize: "1.2rem", fontWeight: 600, marginLeft: 6, color: "var(--text-muted)" }}>{s.unit}</span>}
              </div>
              <div className="stat-card-trend">
                {s.subtitle}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Recent Activity */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Recent Student Registrations</h2>
            <Link href="/admin/students" className="btn-admin btn-ghost-admin" style={{ fontSize: ".85rem" }}>
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Devices</th>
                  <th>Status</th>
                  <th>Registered</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state" style={{ padding: "32px 20px" }}>
                        <Activity size={32} style={{ margin: "0 auto 10px", display: "block", opacity: .3 }} />
                        No recent registrations
                      </div>
                    </td>
                  </tr>
                ) : (
                  recentStudents.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link
                          href={`/admin/students/${s.id}`}
                          className="mono"
                          style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                        >
                          {s.studentId}
                        </Link>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.nama}</td>
                      <td className="mono" style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>{s.kelas}</td>
                      <td>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          background: "var(--bg-elevated)",
                          borderRadius: "6px",
                          fontSize: ".8rem",
                          fontWeight: 600
                        }}>
                          <Smartphone size={12} />
                          {s.devices.length}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status badge-${s.status === "ACTIVE" ? "active" :
                            s.status === "PENDING" ? "pending" : "denied"
                          }`}>
                          {s.status === "ACTIVE" ? "Active" :
                            s.status === "PENDING" ? "Pending" : "Denied"}
                        </span>
                      </td>
                      <td style={{ fontSize: ".8rem", color: "var(--text-muted)" }}>
                        {new Date(s.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats Panel */}
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Quick Statistics</h2>
          </div>
          <div className="panel-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Status breakdown */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <Activity size={16} color="var(--accent)" />
                  <span style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    Student Status
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>Active</span>
                    <span style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--success)" }}>
                      {active} ({totalStudents > 0 ? Math.round((active / totalStudents) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{
                    height: 6,
                    background: "var(--bg-elevated)",
                    borderRadius: 99,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${totalStudents > 0 ? (active / totalStudents) * 100 : 0}%`,
                      background: "var(--success)",
                      borderRadius: 99
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>Pending</span>
                    <span style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--warning)" }}>
                      {pending} ({totalStudents > 0 ? Math.round((pending / totalStudents) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{
                    height: 6,
                    background: "var(--bg-elevated)",
                    borderRadius: 99,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${totalStudents > 0 ? (pending / totalStudents) * 100 : 0}%`,
                      background: "var(--warning)",
                      borderRadius: 99
                    }} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>Denied</span>
                    <span style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--danger)" }}>
                      {denied} ({totalStudents > 0 ? Math.round((denied / totalStudents) * 100) : 0}%)
                    </span>
                  </div>
                  <div style={{
                    height: 6,
                    background: "var(--bg-elevated)",
                    borderRadius: 99,
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${totalStudents > 0 ? (denied / totalStudents) * 100 : 0}%`,
                      background: "var(--danger)",
                      borderRadius: 99
                    }} />
                  </div>
                </div>
              </div>

              {/* Device stats */}
              <div style={{
                padding: 16,
                background: "linear-gradient(135deg, var(--accent-glow), transparent)",
                border: "1px solid var(--border)",
                borderRadius: 12
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Wifi size={16} color="var(--accent)" />
                  <span style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    Device Overview
                  </span>
                </div>
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
                  {approvedDevices}
                </div>
                <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>
                  Total approved devices
                </div>
                {pendingDevices > 0 && (
                  <div style={{
                    marginTop: 10,
                    padding: "6px 10px",
                    background: "var(--warning-bg)",
                    borderRadius: 8,
                    fontSize: ".78rem",
                    color: "var(--warning)",
                    fontWeight: 600
                  }}>
                    ⚠ {pendingDevices} device{pendingDevices > 1 ? "s" : ""} awaiting approval
                  </div>
                )}
              </div>

              {/* Action needed */}
              {(pending > 0 || pendingDevices > 0) && (
                <div style={{
                  padding: 14,
                  background: "var(--warning-bg)",
                  border: "1px solid rgba(245,158,11,.2)",
                  borderRadius: 10
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <Clock size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--warning)", marginBottom: 4 }}>
                        Action Required
                      </div>
                      <div style={{ fontSize: ".78rem", color: "#92400e", lineHeight: 1.5 }}>
                        {pending > 0 && `${pending} student${pending > 1 ? "s" : ""} pending approval`}
                        {pending > 0 && pendingDevices > 0 && <br />}
                        {pendingDevices > 0 && `${pendingDevices} device request${pendingDevices > 1 ? "s" : ""} waiting`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Network Speed Info */}
              <div style={{
                padding: 14,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 10
              }}>
                <div style={{ fontSize: ".85rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
                  Network Performance
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ArrowDown size={14} color="var(--success)" />
                      <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>Download</span>
                    </div>
                    <span style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--success)" }}>
                      {avgDownloadSpeed} Mbps
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ArrowUp size={14} color="var(--warning)" />
                      <span style={{ fontSize: ".8rem", color: "var(--text-secondary)" }}>Upload</span>
                    </div>
                    <span style={{ fontSize: ".85rem", fontWeight: 700, color: "var(--warning)" }}>
                      {avgUploadSpeed} Mbps
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}