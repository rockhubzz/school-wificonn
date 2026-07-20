"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, AlertTriangle, Loader2, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) { setError(await res.text()); return; }
    router.push(params.get("next") ?? "/admin");
    router.refresh();
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <Shield size={24} color="#fff" strokeWidth={2} />
        </div>
        <h1 className="login-title">Admin Sign In</h1>
        <p className="login-subtitle">School Network Captive Portal</p>

        <form onSubmit={submit}>
          <div className="form-field">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="admin@school.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="alert-danger-admin" style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={14} strokeWidth={2} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-admin btn-primary-admin"
            style={{ width: "100%", justifyContent: "center", padding: "10px 14px", fontSize: ".9rem" }}
          >
            {busy ? (
              <>
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}