import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Shield, LayoutDashboard, GraduationCap, Smartphone, LogOut, Wifi } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.adminId) return <>{children}</>;

  return (
    <div className="admin-shell">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        {/* Brand */}
        <Link href="/admin" className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Shield size={18} color="#fff" />
          </div>
          <div className="sidebar-brand-text">
            CaptiveAdmin
            <small>School Network</small>
          </div>
        </Link>

        {/* Nav */}
        <p className="sidebar-section-title">Main Menu</p>
        <ul className="sidebar-nav" style={{ padding: "6px 10px", listStyle: "none", margin: 0 }}>
          <li className="sidebar-nav-item">
            <Link href="/admin" className="sidebar-nav-link">
              <span className="sidebar-nav-icon"><LayoutDashboard size={16} /></span>
              Dashboard
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link href="/admin/students" className="sidebar-nav-link">
              <span className="sidebar-nav-icon"><GraduationCap size={16} /></span>
              Students
            </Link>
          </li>
          <li className="sidebar-nav-item">
            <Link href="/admin/devices" className="sidebar-nav-link">
              <span className="sidebar-nav-icon"><Smartphone size={16} /></span>
              Device Requests
            </Link>
          </li>
        </ul>

        {/* Footer */}
        <div className="sidebar-footer">
          <p className="sidebar-user-info">Signed in as: {session.email}</p>
          <form action="/api/admin/logout" method="POST">
            <button className="sidebar-signout-btn" type="submit">
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Topbar ── */}
      <header className="admin-topbar">
        <span className="topbar-title">Admin Control Panel</span>
        <span className="topbar-badge">
          <span className="dot" />
          <Wifi size={12} style={{ opacity: 0.7 }} />
          System online
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

export const dynamic = "force-dynamic";