import { db } from "@/lib/db";
import Link from "next/link";
import { CheckCircle2, Clock, XCircle, Smartphone, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [pending, active, denied, pendingDevices] = await Promise.all([
    db.student.count({ where: { status: "PENDING" } }),
    db.student.count({ where: { status: "ACTIVE" } }),
    db.student.count({ where: { status: "DENIED" } }),
    db.device.count({ where: { approved: false } }),
  ]);

  const stats = [
    { label: "Active Students",   value: active,         color: "success", Icon: CheckCircle2, href: "/admin/students?status=ACTIVE" },
    { label: "Pending Approvals", value: pending,        color: "warning", Icon: Clock,        href: "/admin/students?status=PENDING" },
    { label: "Denied Students",   value: denied,         color: "danger",  Icon: XCircle,      href: "/admin/students?status=DENIED" },
    { label: "Device Requests",   value: pendingDevices, color: "accent",  Icon: Smartphone,   href: "/admin/devices" },
  ];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of the school network captive portal</p>
      </div>

      {/* Stat cards — fixed 4-col on desktop */}
      <div className="stat-grid">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
            <div className="stat-card">
              <div className="stat-card-icon">
                <s.Icon size={22} strokeWidth={1.8} />
              </div>
              <div className="stat-card-label">{s.label}</div>
              <div className={`stat-card-value ${s.color}`}>{s.value}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Summary table */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Summary</h2>
          <Link href="/admin/students" className="btn-admin btn-ghost-admin" style={{ fontSize: ".78rem" }}>
            View all <ChevronRight size={13} />
          </Link>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.label}>
                  <td style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)", fontWeight: 500 }}>
                    <s.Icon size={14} strokeWidth={2} style={{ opacity: .7 }} />
                    {s.label}
                  </td>
                  <td className="mono" style={{ color: "var(--accent)" }}>{s.value}</td>
                  <td>
                    <span className={`badge-status badge-${
                      s.color === "success" ? "active"  :
                      s.color === "warning" ? "pending" :
                      s.color === "danger"  ? "denied"  : "active"
                    }`}>
                      {s.color === "success" ? "Good" :
                       s.color === "warning" ? "Needs action" :
                       s.color === "danger"  ? "Blocked" : "Pending review"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}