"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, GraduationCap, Loader2, CheckCircle2, XCircle, Clock, Trash2, RotateCcw } from "lucide-react";

type Device = { id: string; macAddress: string; hostname: string | null; approved: boolean; reason: string | null };
type Student = {
  id: string;
  studentId: string;
  nama: string;
  kelas: string;
  status: "PENDING" | "ACTIVE" | "DENIED";
  createdAt: string;
  devices: Device[];
};

type ActionPayload = {
  deviceId?: string;
  studentId?: string;
};

function StatusBadge({ status }: { status: Student["status"] }) {
  const map = {
    ACTIVE:  { cls: "badge-active",  label: "Active" },
    PENDING: { cls: "badge-pending", label: "Pending" },
    DENIED:  { cls: "badge-denied",  label: "Denied" },
  };
  const { cls, label } = map[status];
  return <span className={`badge-status ${cls}`}>{label}</span>;
}

export default function StudentsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    const url = new URL("/api/admin/students", window.location.origin);
    if (q) url.searchParams.set("q", q);
    if (status) url.searchParams.set("status", status);
    const res = await fetch(url);
    const data = await res.json();
    setStudents(data.students);
    setBusy(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function act(path: string, payload: ActionPayload) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { alert(await res.text()); return; }
    const data = await res.json().catch(() => null);
    if (data?.ok) {
      setStudents((prev) => prev.map((student) => {
        if (student.studentId !== payload.studentId) return student;
        if (path.includes("approve-student")) return { ...student, status: "ACTIVE" as const };
        if (path.includes("deny-student") || path.includes("revoke")) {
          return { ...student, status: "DENIED" as const, devices: student.devices.map((d) => ({ ...d, approved: false, reason: "revoked-by-admin" })) };
        }
        return student;
      }));
      return;
    }
    await load();
  }

  function handleDelete(studentId: string) {
    if (!confirm(`Delete ${studentId} and all bound devices?`)) return;
    void act("/api/admin/delete-student", { studentId });
  }
  function handleRevoke(studentId: string) {
    if (!confirm(`Revoke ${studentId}?`)) return;
    void act("/api/admin/revoke", { studentId });
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Students</h1>
        <p className="page-subtitle">Manage student registrations and access</p>
      </div>

      {/* Filters */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-body" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="form-label">Search</label>
            <input
              className="form-input"
              placeholder="Student ID, name, or class…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <div style={{ minWidth: 160 }}>
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="DENIED">Denied</option>
            </select>
          </div>
          <button onClick={load} className="btn-admin btn-primary-admin">
            <Search size={14} /> Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            Results
            {!busy && <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 8, fontSize: ".78rem" }}>({students.length})</span>}
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Class</th>
                <th>Status</th>
                <th>Devices</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {busy && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Loader2 size={28} style={{ margin: "0 auto 10px", display: "block", opacity: .5, animation: "spin 1s linear infinite" }} />
                      Loading students…
                    </div>
                  </td>
                </tr>
              )}
              {!busy && students.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <GraduationCap size={36} style={{ margin: "0 auto 12px", display: "block", opacity: .3 }} />
                      No students found.
                    </div>
                  </td>
                </tr>
              )}
              {students.map((s) => {
                const approved = s.devices.filter((d) => d.approved).length;
                const pending = s.devices.length - approved;
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/admin/students/${s.id}`} className="mono" style={{ color: "var(--accent)", textDecoration: "none" }}>
                        {s.studentId}
                      </Link>
                    </td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{s.nama || "—"}</td>
                    <td className="mono" style={{ fontSize: ".8rem" }}>{s.kelas || "—"}</td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      {s.devices.length === 0 ? (
                        <span className="text-muted-admin">none</span>
                      ) : (
                        <Link href={`/admin/students/${s.id}`} style={{ textDecoration: "none", color: "var(--text-secondary)" }}>
                          {s.devices.length} device{s.devices.length !== 1 ? "s" : ""}
                          {pending > 0 && (
                            <span style={{ color: "var(--warning)", marginLeft: 6, fontSize: ".75rem" }}>({pending} pending)</span>
                          )}
                        </Link>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(s.status === "PENDING" || s.status === "DENIED") && (
                          <button
                            onClick={() => act("/api/admin/approve-student", { studentId: s.studentId })}
                            className="btn-admin btn-success-admin"
                          >
                            <CheckCircle2 size={13} />
                            {s.status === "DENIED" ? "Re-approve" : "Approve"}
                          </button>
                        )}
                        {s.status === "ACTIVE" && (
                          <button onClick={() => handleRevoke(s.studentId)} className="btn-admin btn-danger-admin">
                            <RotateCcw size={13} /> Revoke
                          </button>
                        )}
                        {s.status === "PENDING" && (
                          <button
                            onClick={() => act("/api/admin/deny-student", { studentId: s.studentId })}
                            className="btn-admin btn-ghost-admin"
                          >
                            <XCircle size={13} /> Deny
                          </button>
                        )}
                        <button onClick={() => handleDelete(s.studentId)} className="btn-admin btn-danger-admin" style={{ opacity: 0.7 }}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
