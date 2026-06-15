import { useState, useEffect } from "react";
import { Cloud, ExternalLink, Check, AlertTriangle, Key } from "lucide-react";
import { invoke } from "../../services/tauri";
import { useStore } from "../../store";
import { PageHeader } from "../Shared/PageHeader";
import { SyncStatus } from "../../types";

export function SettingsPage() {
  const { syncStatus, loadSyncStatus, showToast } = useStore();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [step, setStep] = useState<"config" | "code" | "done">(
    syncStatus?.is_authenticated ? "done" : "config"
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (syncStatus?.is_authenticated) setStep("done");
  }, [syncStatus]);

  const handleGetAuthUrl = async () => {
    if (!clientId) { showToast("Enter your Google OAuth Client ID", "warning"); return; }
    setLoading(true);
    try {
      const url = await invoke<string>("initiate_google_auth", { client_id: clientId });
      // Open browser
      window.open(url, "_blank");
      setStep("code");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExchangeCode = async () => {
    if (!authCode || !clientSecret) return;
    setLoading(true);
    try {
      const folderUrl = await invoke<string>("exchange_auth_code", {
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
      });
      await loadSyncStatus();
      setStep("done");
      showToast("Google Drive connected successfully!", "success");
    } catch (e) {
      showToast(`Auth failed: ${e}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure Google Drive sync and application preferences"
      />

      <div style={{ padding: 32, maxWidth: 680, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Google Drive Sync */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Cloud size={18} color="var(--accent)" />
              <h3>Google Drive Integration</h3>
            </div>
            {step === "done" && (
              <span className="badge badge-success"><Check size={10} /> Connected</span>
            )}
          </div>

          {step === "done" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Your practice data is being synced to Google Drive.
              </p>
              {syncStatus?.drive_folder_url && (
                <a
                  href={syncStatus.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: "inline-flex", width: "fit-content" }}
                >
                  <ExternalLink size={13} /> Open Drive Folder
                </a>
              )}
              {syncStatus?.last_sync && (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Last sync: {new Date(syncStatus.last_sync).toLocaleString()}
                </p>
              )}
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: "fit-content", color: "var(--text-secondary)" }}
                onClick={() => setStep("config")}
              >
                Reconfigure
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Instructions */}
              <div style={{ padding: "12px 14px", background: "var(--accent-glow)",
                border: "1px solid rgba(201,168,76,0.15)", borderRadius: "var(--radius-md)" }}>
                <h4 style={{ marginBottom: 10, color: "var(--accent)" }}>Setup Instructions</h4>
                <ol style={{ paddingLeft: 18, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.8 }}>
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank">Google Cloud Console</a></li>
                  <li>Create a new project, enable the <strong>Google Drive API</strong></li>
                  <li>Create OAuth2 credentials → Desktop App type</li>
                  <li>Add <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-elevated)", padding: "1px 5px", borderRadius: 3 }}>http://localhost:8976/oauth/callback</code> as a redirect URI</li>
                  <li>Copy the Client ID and Client Secret below</li>
                </ol>
              </div>

              {step === "config" ? (
                <>
                  <div className="form-group">
                    <label className="form-label">Google OAuth Client ID</label>
                    <input
                      className="input"
                      value={clientId}
                      onChange={e => setClientId(e.target.value)}
                      placeholder="xxxx.apps.googleusercontent.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client Secret</label>
                    <input
                      className="input"
                      type="password"
                      value={clientSecret}
                      onChange={e => setClientSecret(e.target.value)}
                      placeholder="GOCSPX-…"
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: "fit-content" }}
                    onClick={handleGetAuthUrl}
                    disabled={!clientId || !clientSecret || loading}
                  >
                    <ExternalLink size={14} />
                    {loading ? "Opening browser…" : "Authorize with Google"}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ padding: "10px 12px", background: "var(--info-dim)",
                    borderRadius: "var(--radius-md)", fontSize: 12, color: "var(--info)" }}>
                    A browser window has opened. Authorize access, then paste the code from the redirect URL below.
                  </div>
                  <div className="form-group">
                    <label className="form-label">Authorization Code</label>
                    <input
                      className="input"
                      value={authCode}
                      onChange={e => setAuthCode(e.target.value)}
                      placeholder="Paste authorization code here"
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => setStep("config")}>Back</button>
                    <button
                      className="btn btn-primary"
                      onClick={handleExchangeCode}
                      disabled={!authCode || loading}
                    >
                      {loading ? "Connecting…" : "Connect Drive"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Security Info */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Key size={18} color="var(--accent)" />
              <h3>Security</h3>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ["Database Encryption", "AES-256 via SQLCipher"],
              ["Storage Location", "%APPDATA%\\LegalPracticeManager"],
              ["Password Hashing", "SHA-256 (local only)"],
              ["Drive Auth", "OAuth 2.0 + Refresh Token"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
                <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
