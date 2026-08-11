"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, GraduationCap, Smartphone, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [session, setSession] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/students")
      .then((res) => res.ok ? { email: "admin" } : null)
      .then(setSession)
      .catch(() => setSession(null));
  }, [pathname]);

  if (session === null || !session.email) return <>{children}</>;

  const isActive = (path: string) => pathname === path;

  return (
    <div className="admin-shell">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        {/* Brand */}
        <Link href="/admin" className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Shield size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div className="sidebar-brand-text">
            School Portal
            <small>Admin Dashboard</small>
          </div>
        </Link>

        {/* Nav */}
        <p className="sidebar-section-title">NAVIGATION</p>
        <ul className="sidebar-nav" style={{ padding: "8px 14px", listStyle: "none", margin: 0 }}>
          <li className="sidebar-nav-item">
            <Link href="/admin" className={`sidebar-nav-link ${isActive("/admin") ? "active" : ""}`}>
              <span className="sidebar-nav-icon"><LayoutDashboard size={18} /></span>
              Dashboard
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link href="/admin/students" className={`sidebar-nav-link ${pathname?.startsWith("/admin/students") ? "active" : ""}`}>
              <span className="sidebar-nav-icon"><GraduationCap size={18} /></span>
              Students
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link href="/admin/devices" className={`sidebar-nav-link ${isActive("/admin/devices") ? "active" : ""}`}>
              <span className="sidebar-nav-icon"><Smartphone size={18} /></span>
              Device Requests
            </Link>
          </li>
        </ul>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--border)", marginTop: "auto" }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent), #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: ".9rem"
            }}>
              <User size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: ".85rem", fontWeight: 600, margin: 0, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Administrator
              </p>
              <p style={{ fontSize: ".72rem", color: "var(--text-muted)", margin: 0 }}>
                System Admin
              </p>
            </div>
          </div>
          <form action="/api/admin/logout" method="POST" style={{ padding: "0 14px 12px" }}>
            <button className="sidebar-signout-btn" type="submit">
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Topbar ── */}
      <header className="admin-topbar">
        <span className="topbar-title">Captive Portal Admin</span>
        <span className="topbar-badge">
          System Online
        </span>
      </header>

      {/* ── Content ── */}
      <div className="admin-content">
        <main className="admin-main">
          {children}
        </main>
      </div>
    </div>
  );
}