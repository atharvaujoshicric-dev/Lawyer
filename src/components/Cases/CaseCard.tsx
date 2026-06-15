import { useNavigate } from "react-router-dom";
import { Case } from "../../types";
import { AlertTriangle, CalendarClock, DollarSign, ChevronRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface CaseCardProps {
  case_: Case;
  clientId: string;
}

const statusColor: Record<string, string> = {
  open: "badge-success",
  in_progress: "badge-info",
  pending: "badge-warning",
  closed: "badge-muted",
  archived: "badge-muted",
};

const priorityColor: Record<string, string> = {
  low: "badge-muted",
  medium: "badge-info",
  high: "badge-warning",
  urgent: "badge-danger",
};

export function CaseCard({ case_: c, clientId }: CaseCardProps) {
  const navigate = useNavigate();

  const expiryDate = c.agreement_expiry_date || c.regulatory_deadline;
  const daysLeft = expiryDate
    ? differenceInDays(new Date(expiryDate), new Date())
    : null;

  return (
    <div
      onClick={() => navigate(`/clients/${clientId}/cases/${c.id}`)}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "14px 16px",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--border-default)";
        e.currentTarget.style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.background = "var(--bg-surface)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
          {c.case_number}
        </span>
        <ChevronRight size={13} color="var(--text-muted)" />
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>
        {c.title}
      </h3>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        <span className={`badge ${statusColor[c.status]}`}>{c.status.replace("_", " ")}</span>
        <span className={`badge ${priorityColor[c.priority]}`}>{c.priority}</span>
      </div>

      {/* Contextual info */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {c.case_type === "cybersecurity" && c.breach_type && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Breach: <span style={{ color: "var(--cyber)" }}>{c.breach_type}</span>
          </div>
        )}
        {c.case_type === "rental" && c.property_address && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }} className="truncate">
            {c.property_address}
          </div>
        )}
        {c.monthly_rent && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
            <DollarSign size={10} />
            ₹{c.monthly_rent.toLocaleString()}/mo
          </div>
        )}
        {daysLeft !== null && (
          <div style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 11,
            color: daysLeft <= 30 ? "var(--warning)" : daysLeft <= 7 ? "var(--danger)" : "var(--text-muted)",
          }}>
            <CalendarClock size={10} />
            {daysLeft <= 0 ? "Expired" : `${daysLeft}d remaining`}
          </div>
        )}
        {c.billing_rate > 0 && (
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {c.billed_hours}h billed @ ₹{c.billing_rate}/hr
          </div>
        )}
      </div>
    </div>
  );
}
