import { useState } from "react";
import { Scale, Eye, EyeOff } from "lucide-react";
import { invoke } from "../../services/tauri";
import { useStore } from "../../store";

export function LoginScreen() {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setAuthenticated } = useStore();

  const handleLogin = async () => {
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const ok = await invoke<boolean>("verify_master_password", { password });
      if (ok) {
        setAuthenticated(true);
      } else {
        setError("Incorrect password. Please try again.");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={screen}>
      {/* Background pattern */}
      <div style={bgPattern} />
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={iconWrap}>
            <span style={{ fontSize: 28 }}>⚖</span>
          </div>
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>LexTrack</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            LEGAL PRACTICE MANAGER
          </p>
        </div>

        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Master Password</label>
          <div style={{ position: "relative" }}>
            <input
              className="input"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              placeholder="Enter your master password"
              style={{ paddingRight: 40 }}
              autoFocus
            />
            <button
              onClick={() => setShowPw(!showPw)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: "8px 12px", background: "var(--danger-dim)",
            borderRadius: "var(--radius-md)", marginBottom: 16,
            fontSize: 12, color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary btn-lg"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={handleLogin}
          disabled={!password || loading}
        >
          {loading ? "Verifying…" : "Unlock Vault"}
        </button>

        <p style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "var(--text-muted)" }}>
          All data stored locally · AES-256 encrypted
        </p>
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
  position: "relative",
  overflow: "hidden",
};
const bgPattern: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundImage: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(201,168,76,0.05), transparent)",
  pointerEvents: "none",
};
const card: React.CSSProperties = {
  width: 360,
  background: "var(--bg-surface)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-xl)",
  padding: "36px 32px",
  boxShadow: "var(--shadow-lg), 0 0 60px rgba(201,168,76,0.06)",
  position: "relative",
  zIndex: 1,
};
const iconWrap: React.CSSProperties = {
  width: 60, height: 60,
  background: "var(--accent-dim)",
  border: "1px solid rgba(201,168,76,0.2)",
  borderRadius: "var(--radius-lg)",
  display: "flex", alignItems: "center", justifyContent: "center",
  margin: "0 auto 16px",
  fontSize: 28,
};
