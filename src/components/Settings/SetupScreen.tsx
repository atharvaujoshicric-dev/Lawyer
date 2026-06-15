import { useState } from "react";
import { Shield, Eye, EyeOff, CheckCircle } from "lucide-react";
import { invoke } from "../../services/tauri";
import { useStore } from "../../store";

export function SetupScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setIsFirstRun, setAuthenticated } = useStore();

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    match: password === confirm && confirm.length > 0,
  };
  const allGood = Object.values(checks).every(Boolean);

  const handleSubmit = async () => {
    if (!allGood) return;
    setLoading(true);
    setError("");
    try {
      await invoke("setup_master_password", { password });
      setIsFirstRun(false);
      setAuthenticated(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={screen}>
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={iconWrap}><Shield size={32} color="var(--accent)" /></div>
          <h1 style={{ fontSize: 22, marginBottom: 6 }}>Welcome to LexTrack</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Create your master password to secure your legal practice data
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Master Password</label>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter master password"
              style={{ paddingRight: 40 }}
            />
            <button
              onClick={() => setShowPw(!showPw)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Confirm Password</label>
          <input
            className="input"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat password"
          />
        </div>

        {/* Checklist */}
        <div style={{ marginBottom: 24, padding: "12px 14px", background: "var(--bg-elevated)",
          borderRadius: "var(--radius-md)", display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            [checks.length, "At least 8 characters"],
            [checks.upper, "One uppercase letter"],
            [checks.number, "One number"],
            [checks.match, "Passwords match"],
          ].map(([ok, label], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
              fontSize: 12, color: ok ? "var(--success)" : "var(--text-muted)" }}>
              <CheckCircle size={12} opacity={ok ? 1 : 0.3} />
              {label as string}
            </div>
          ))}
        </div>

        {error && (
          <p style={{ color: "var(--danger)", fontSize: 12, marginBottom: 12 }}>{error}</p>
        )}

        <button
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={handleSubmit}
          disabled={!allGood || loading}
        >
          {loading ? "Creating secure vault…" : "Create & Enter"}
        </button>
      </div>
    </div>
  );
}

const screen: React.CSSProperties = {
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg-base)",
};
const card: React.CSSProperties = {
  width: 380,
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-xl)",
  padding: 32,
  boxShadow: "var(--shadow-lg), var(--shadow-glow)",
};
const iconWrap: React.CSSProperties = {
  width: 64, height: 64,
  background: "var(--accent-dim)",
  borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  margin: "0 auto 16px",
};
