import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, AlertTriangle, CloudOff, Shield, Home, TrendingUp, Clock } from "lucide-react";
import { useStore } from "../../store";
import { invoke } from "../../services/tauri";
import { Reminder, ActivityEntry } from "../../types";
import { PageHeader } from "../Shared/PageHeader";
import { format, differenceInDays } from "date-fns";

export function Dashboard() {
  const { stats, loadStats, syncStatus } = useStore();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
    invoke<Reminder[]>("get_expiring_soon", { days: 60 }).then(setReminders).catch(console.error);
    invoke<ActivityEntry[]>("get_recent_activity", { limit: 10 }).then(setActivity).catch(console.error);
  }, []);

  const urgency = (days: number) => {
    if (days <= 7) return "danger";
    if (days <= 30) return "warning";
    return "info";
  };

  return (
    <div className="animate-fade">
      <PageHeader
        title="Dashboard"
        subtitle={`${format(new Date(), "EEEE, MMMM d, yyyy")}`}
      />

      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Unsynced warning */}
        {(syncStatus?.unsynced_count || 0) > 0 && !syncStatus?.is_authenticated && (
          <div style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", background: "var(--warning-dim)",
            border: "1px solid rgba(245,166,35,0.2)", borderRadius: "var(--radius-md)" }}>
            <CloudOff size={16} color="var(--warning)" />
            <span style={{ fontSize: 13, color: "var(--warning)" }}>
              {syncStatus?.unsynced_count} change(s) not yet synced to Google Drive.
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--warning)", marginLeft: 8 }}
                onClick={() => navigate("/settings")}>Configure sync →</button>
            </span>
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <StatCard icon={<Users size={20} color="var(--accent)" />} label="Total Clients"
            value={stats?.total_clients ?? "—"} sub={`${stats?.active_clients ?? 0} active`} />
          <StatCard icon={<Briefcase size={20} color="var(--info)" />} label="Total Cases"
            value={stats?.total_cases ?? "—"} sub={`${stats?.open_cases ?? 0} open`} />
          <StatCard icon={<Shield size={20} color="var(--cyber)" />} label="Cyber Cases"
            value={stats?.cyber_cases ?? "—"} accent="cyber" />
          <StatCard icon={<Home size={20} color="var(--rental)" />} label="Rental Cases"
            value={stats?.rental_cases ?? "—"} accent="rental" />
        </div>

        {/* Main content row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

          {/* Upcoming deadlines */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={15} color="var(--warning)" />
                <h3>Upcoming Deadlines</h3>
              </div>
              {reminders.length > 0 && (
                <span className="badge badge-warning">{reminders.length}</span>
              )}
            </div>

            {reminders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
                <Clock size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                <p style={{ fontSize: 13 }}>No upcoming deadlines in the next 60 days</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {reminders.map(r => (
                  <div key={r.id} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 12px", background: "var(--bg-elevated)",
                    borderRadius: "var(--radius-md)", cursor: "pointer",
                    border: `1px solid var(--border-subtle)`,
                  }}
                    onClick={() => navigate(`/clients/${r.client_id}`)}
                  >
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        {r.client_name} · Due {format(new Date(r.due_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span className={`badge badge-${urgency(r.days_remaining)}`}>
                      {r.days_remaining}d
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Activity</h3>
            </div>
            {activity.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "20px 0" }}>
                No recent activity
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {activity.map(a => (
                  <div key={a.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{a.details}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {format(new Date(a.created_at), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate("/clients")}>
            <Users size={14} /> View All Clients
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/clients")}>
            + New Client
          </button>
        </div>

      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub?: string;
  accent?: "cyber" | "rental";
}) {
  const accentColor = accent === "cyber" ? "var(--cyber-dim)" : accent === "rental" ? "var(--rental-dim)" : "var(--bg-elevated)";
  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      padding: "18px 20px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ padding: 8, background: accentColor || "var(--bg-elevated)", borderRadius: "var(--radius-md)" }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
