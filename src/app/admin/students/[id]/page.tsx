"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft, AlertTriangle, Loader2, Pencil, CheckCircle2,
  XCircle, Lock, Trash2, Save, Smartphone, RotateCcw, X
} from "lucide-react";

type Device = {
  id: string;
  macAddress: string;
  hostname: string | null;
  approved: boolean;
  reason: string | null;
  createdAt: string;
};

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

function deviceStatus(d: Device, studentStatus: Student["status"]): { label: string; cls: string } {
  if (d.approved)                        return { label: "Approved", cls: "badge-active" };
  if (d.reason === "revoked-by-admin")   return { label: "Revoked",  cls: "badge-denied" };
  if (d.reason === "denied-by-admin")    return { label: "Denied",   cls: "badge-denied" };
  if (studentStatus === "DENIED")        return { label: "Denied",   cls: "badge-denied" };
  return { label: "Pending", cls: "badge-pending" };
}

function StudentStatusBadge({ status }: { status: Student["status"] }) {
  const map = { ACTIVE: "badge-active", PENDING: "badge-pending", DENIED: "badge-denied" };
  return <span className={`badge-status ${map[status]}`}>{status}</span>;
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({ studentId: "", nama: "", kelas: "" });

  const load = useCallback(async () => {
    if (!id) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/students/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) {
      setError(res.status === 404 ? "Student not found." : await res.text());
      setStudent(null); setBusy(false); return;
    }
    const data = await res.json();
    setStudent(data.student); setBusy(false);
  }, [id]);

  useEffect(() => { if (id) void load(); }, [id, load]);
  useEffect(() => {
    if (!student) return;
    setEditValues({ studentId: student.studentId, nama: student.nama, kelas: student.kelas });
  }, [student]);

  async function act(path: string, payload: ActionPayload, opts?: { redirect?: string }) {
    const res = await fetch(path, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!res.ok) { alert(await res.text()); return; }
    if (opts?.redirect) { router.push(opts.redirect); return; }
    await load();
  }

  async function handleSaveDetails() {
    if (!student) return;
    setSaving(true); setError(null);
    const res = await fetch(`/api/admin/students/${encodeURIComponent(student.id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editValues),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setError(data?.message ?? "Unable to update student details."); setSaving(false); return; }
    setStudent((prev) => prev ? { ...prev, ...data.student } : prev);
    setEditMode(false); setSaving(false);
  }

  if (!id || (busy && !student)) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <Loader2 size={32} style={{ margin: "0 auto 12px", display: "block", opacity: .4, animation: "spin 1s linear infinite" }} />
        Loading student…
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div>
        <Link href="/admin/students" className="btn-admin btn-ghost-admin" style={{ marginBottom: 20, display: "inline-flex" }}>
          <ArrowLeft size={14} /> Back to Students
        </Link>
        <div className="alert-danger-admin" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} /> {error ?? "Student not found."}
        </div>
      </div>
    );
  }

  const approvedCount = student.devices.filter((d) => d.approved).length;
  const pendingCount = student.devices.length - approvedCount;

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Back link */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/students" className="btn-admin btn-ghost-admin" style={{ display: "inline-flex" }}>
          <ArrowLeft size={14} /> Back to Students
        </Link>
      </div>

      {/* Student info card */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <h1 className="panel-title" style={{ fontSize: "1rem" }}>Student Profile</h1>
          <StudentStatusBadge status={student.status} />
        </div>
        <div className="panel-body">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: ".7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Full Name</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{student.nama || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: ".7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Student ID</div>
              <div className="mono" style={{ fontSize: "1rem", color: "var(--accent)" }}>{student.studentId}</div>
            </div>
            <div>
              <div style={{ fontSize: ".7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Class</div>
              <div className="mono" style={{ fontSize: "1rem" }}>{student.kelas || "—"}</div>
            </div>
            <div>
              <div style={{ fontSize: ".7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Registered</div>
              <div style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>{new Date(student.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: ".7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>Devices</div>
              <div style={{ fontSize: ".85rem" }}>
                <span style={{ color: "var(--success)" }}>{approvedCount} approved</span>
                {pendingCount > 0 && <span style={{ color: "var(--warning)", marginLeft: 8 }}>{pendingCount} pending</span>}
                {student.devices.length === 0 && <span style={{ color: "var(--text-muted)" }}>none</span>}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {student.status === "ACTIVE" && !editMode && (
              <button onClick={() => setEditMode(true)} className="btn-admin btn-ghost-admin">
                <Pencil size={13} /> Edit Details
              </button>
            )}
            {student.status === "PENDING" && (
              <>
                <button
                  onClick={() => act("/api/admin/approve-student", { studentId: student.studentId })}
                  className="btn-admin btn-success-admin"
                >
                  <CheckCircle2 size={13} /> Approve Student
                </button>
                <button
                  onClick={() => act("/api/admin/deny-student", { studentId: student.studentId })}
                  className="btn-admin btn-danger-admin"
                >
                  <XCircle size={13} /> Deny Student
                </button>
              </>
            )}
            {student.status === "DENIED" && (
              <button
                onClick={() => act("/api/admin/approve-student", { studentId: student.studentId })}
                className="btn-admin btn-success-admin"
              >
                <CheckCircle2 size={13} /> Re-approve Student
              </button>
            )}
            {student.status === "ACTIVE" && (
              <button
                onClick={() => {
                  if (!confirm(`Revoke access for ${student.studentId}?`)) return;
                  act("/api/admin/revoke", { studentId: student.studentId });
                }}
                className="btn-admin btn-danger-admin"
              >
                <Lock size={13} /> Revoke Access
              </button>
            )}
            <button
              onClick={() => {
                if (!confirm(`Delete ${student.studentId} and all devices permanently?`)) return;
                act("/api/admin/delete-student", { studentId: student.studentId }, { redirect: "/admin/students" });
              }}
              className="btn-admin btn-danger-admin"
              style={{ marginLeft: "auto" }}
            >
              <Trash2 size={13} /> Delete Student
            </button>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {student.status === "ACTIVE" && editMode && (
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-header">
            <h2 className="panel-title">Edit Student Details</h2>
            <button onClick={() => setEditMode(false)} className="btn-admin btn-ghost-admin" style={{ fontSize: ".78rem" }}>
              <X size={13} /> Cancel
            </button>
          </div>
          <div className="panel-body">
            {error && (
              <div className="alert-danger-admin" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={14} /> {error}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
              <div className="form-field" style={{ margin: 0 }}>
                <label className="form-label">Student ID</label>
                <input className="form-input" value={editValues.studentId} onChange={(e) => setEditValues((p) => ({ ...p, studentId: e.target.value }))} />
              </div>
              <div className="form-field" style={{ margin: 0 }}>
                <label className="form-label">Name (Nama)</label>
                <input className="form-input" value={editValues.nama} onChange={(e) => setEditValues((p) => ({ ...p, nama: e.target.value }))} />
              </div>
              <div className="form-field" style={{ margin: 0 }}>
                <label className="form-label">Class (Kelas)</label>
                <input className="form-input" value={editValues.kelas} onChange={(e) => setEditValues((p) => ({ ...p, kelas: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSaveDetails} disabled={saving} className="btn-admin btn-success-admin">
                <Save size={13} /> {saving ? "Saving…" : "Save Changes"}
              </button>
              <button onClick={() => setEditMode(false)} className="btn-admin btn-ghost-admin">
                <X size={13} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Devices table */}
      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Registered Devices</h2>
          <span style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>{student.devices.length} total</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>MAC Address</th>
                <th>Hostname</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {student.devices.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <Smartphone size={36} style={{ margin: "0 auto 12px", display: "block", opacity: .3 }} />
                      No devices registered yet.
                    </div>
                  </td>
                </tr>
              )}
              {student.devices.map((d) => {
                const ds = deviceStatus(d, student.status);
                const canApprove = student.status === "ACTIVE";
                return (
                  <tr key={d.id}>
                    <td className="mono" style={{ color: "var(--text-primary)" }}>{d.macAddress}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{d.hostname ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</td>
                    <td><span className={`badge-status ${ds.cls}`}>{ds.label}</span></td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>{d.reason ?? "—"}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>{new Date(d.createdAt).toLocaleString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!d.approved && (
                          <>
                            <button
                              onClick={() => act("/api/admin/approve-device", { deviceId: d.id })}
                              disabled={!canApprove}
                              title={!canApprove ? "Re-approve the student first" : d.reason === "revoked-by-admin" ? "Re-approve device" : "Approve device"}
                              className="btn-admin btn-success-admin"
                            >
                              <CheckCircle2 size={13} />
                              {d.reason === "revoked-by-admin" ? "Re-approve" : "Approve"}
                            </button>
                            {d.reason === "revoked-by-admin" ? (
                              <button
                                onClick={() => {
                                  if (!confirm(`Permanently delete device ${d.macAddress}?`)) return;
                                  act("/api/admin/reject-device", { deviceId: d.id });
                                }}
                                className="btn-admin btn-danger-admin"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (!confirm(`Reject device ${d.macAddress}?`)) return;
                                  act("/api/admin/reject-device", { deviceId: d.id });
                                }}
                                className="btn-admin btn-danger-admin"
                              >
                                <XCircle size={13} /> Reject
                              </button>
                            )}
                          </>
                        )}
                        {d.approved && (
                          <button
                            onClick={() => {
                              if (!confirm(`Revoke access for ${d.macAddress}?`)) return;
                              act("/api/admin/revoke-device", { deviceId: d.id });
                            }}
                            className="btn-admin btn-danger-admin"
                          >
                            <RotateCcw size={13} /> Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
