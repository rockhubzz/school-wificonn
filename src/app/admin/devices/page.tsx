"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RefreshCw, Loader2, Smartphone, CheckCircle2, XCircle } from "lucide-react";

type Row = {
  id: string;
  macAddress: string;
  hostname: string | null;
  reason: string | null;
  createdAt: string;
  student: { id: string; studentId: string; nama: string; kelas: string; status: string };
};

type ActionPayload = {
  deviceId?: string;
  studentId?: string;
};

function StudentStatusBadge({ status }: { status: string }) {
  if (status === "ACTIVE")  return <span className="badge-status badge-active">Active</span>;
  if (status === "DENIED")  return <span className="badge-status badge-denied">Denied</span>;
  return <span className="badge-status badge-pending">Pending</span>;
}

export default function DevicesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    const res = await fetch("/api/admin/students");
    const data = await res.json();
    const flat: Row[] = [];
    for (const s of data.students) {
      for (const d of s.devices) {
        if (!d.approved) {
          flat.push({
            ...d,
            student: { id: s.id, studentId: s.studentId, nama: s.nama, kelas: s.kelas, status: s.status },
          });
        }
      }
    }
    setRows(flat);
    setBusy(false);
  }
  useEffect(() => { load(); }, []);

  async function act(path: string, payload: ActionPayload) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { alert(await res.text()); return; }
    if (path.includes("approve-device") || path.includes("reject-device")) {
      setRows((prev) => prev.filter((row) => row.id !== payload.deviceId));
      return;
    }
    await load();
  }

  function handleReject(deviceId: string, mac: string) {
    if (!confirm(`Reject device ${mac}?`)) return;
    void act("/api/admin/reject-device", { deviceId });
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Device Requests</h1>
        <p className="page-subtitle">Review and approve pending device registrations</p>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2 className="panel-title">
            Pending Requests
            {!busy && (
              <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 8, fontSize: ".78rem" }}>
                ({rows.length})
              </span>
            )}
          </h2>
          <button onClick={load} className="btn-admin btn-ghost-admin" style={{ fontSize: ".78rem" }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Name</th>
                <th>Class</th>
                <th>Student Status</th>
                <th>MAC Address</th>
                <th>Hostname</th>
                <th>Reason</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {busy && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <Loader2 size={28} style={{ margin: "0 auto 10px", display: "block", opacity: .5, animation: "spin 1s linear infinite" }} />
                      Loading device requests…
                    </div>
                  </td>
                </tr>
              )}
              {!busy && rows.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <Smartphone size={36} style={{ margin: "0 auto 12px", display: "block", opacity: .3 }} />
                      No pending device requests.
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link
                      href={`/admin/students/${r.student.id}`}
                      className="mono"
                      style={{ color: "var(--accent)", textDecoration: "none" }}
                    >
                      {r.student.studentId}
                    </Link>
                  </td>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>{r.student.nama || "—"}</td>
                  <td className="mono" style={{ fontSize: ".8rem" }}>{r.student.kelas || "—"}</td>
                  <td><StudentStatusBadge status={r.student.status} /></td>
                  <td className="mono" style={{ color: "var(--text-secondary)", fontSize: ".82rem" }}>{r.macAddress}</td>
                  <td style={{ color: "var(--text-muted)" }}>{r.hostname ?? "—"}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>{r.reason ?? "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => act("/api/admin/approve-device", { deviceId: r.id })}
                        disabled={r.student.status !== "ACTIVE"}
                        title={r.student.status !== "ACTIVE" ? "Approve or re-approve the student first" : ""}
                        className="btn-admin btn-success-admin"
                      >
                        <CheckCircle2 size={13} />
                        {r.reason === "revoked-by-admin" ? "Re-approve" : "Approve"}
                      </button>
                      {r.reason !== "revoked-by-admin" && (
                        <button
                          onClick={() => handleReject(r.id, r.macAddress)}
                          className="btn-admin btn-danger-admin"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
