import { useState, useEffect } from "react";
import { Shield, Home, Briefcase, ChevronDown } from "lucide-react";
import { Modal } from "../Shared/Modal";
import { CaseType } from "../../types";

interface CreateCasePayload {
  client_id: string;
  case_type: CaseType;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  court_date?: string;
  next_action?: string;
  billing_rate?: number;
  // Cyber
  incident_date?: string;
  breach_type?: string;
  affected_systems?: string;
  regulatory_deadline?: string;
  regulatory_body?: string;
  data_compromised?: string;
  severity_level?: string;
  containment_status?: string;
  notification_sent?: boolean;
  notification_date?: string;
  // Rental
  property_address?: string;
  property_type?: string;
  monthly_rent?: number;
  security_deposit?: number;
  lock_in_period_months?: number;
  agreement_start_date?: string;
  agreement_expiry_date?: string;
  renewal_date?: string;
  landlord_name?: string;
  landlord_contact?: string;
  tenant_name?: string;
  tenant_contact?: string;
  rent_escalation_pct?: number;
  maintenance_terms?: string;
}

const CASE_TYPES: { value: CaseType; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: "cybersecurity", label: "Cybersecurity", icon: <Shield size={16} />, desc: "Incident response, CERT compliance, breach investigation" },
  { value: "rental", label: "Rental / Property", icon: <Home size={16} />, desc: "Lease agreements, landlord-tenant disputes, property law" },
  { value: "general", label: "General", icon: <Briefcase size={16} />, desc: "General legal matters, advisory, documentation" },
  { value: "corporate", label: "Corporate", icon: <Briefcase size={16} />, desc: "Company law, contracts, incorporation, M&A" },
  { value: "litigation", label: "Litigation", icon: <Briefcase size={16} />, desc: "Court matters, hearings, appeals" },
];

const BREACH_TYPES = ["Ransomware", "Data Exfiltration", "Phishing", "Insider Threat", "DDoS", "Unauthorized Access", "Malware", "Supply Chain Attack", "Social Engineering", "Other"];
const REGULATORY_BODIES = ["CERT-In", "TRAI", "RBI", "SEBI", "IRDAI", "MeitY", "DPDPA", "Other"];
const PROPERTY_TYPES = ["Residential Apartment", "Commercial Office", "Retail Space", "Industrial Unit", "Plot / Land", "Villa / Bungalow", "Co-working Space"];
const SEVERITY_LEVELS = ["low", "medium", "high", "critical"];

export function CreateCaseModal({ open, clientId, onClose, onSubmit, loading }: {
  open: boolean;
  clientId: string;
  onClose: () => void;
  onSubmit: (payload: CreateCasePayload) => void;
  loading: boolean;
}) {
  const [step, setStep] = useState<"type" | "details">("type");
  const [form, setForm] = useState<CreateCasePayload>({
    client_id: clientId,
    case_type: "general",
    title: "",
    status: "open",
    priority: "medium",
  });

  useEffect(() => {
    if (!open) {
      setStep("type");
      setForm({ client_id: clientId, case_type: "general", title: "", status: "open", priority: "medium" });
    }
  }, [open]);

  const set = <K extends keyof CreateCasePayload>(k: K, v: CreateCasePayload[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const setStr = (k: keyof CreateCasePayload, v: string) =>
    set(k as keyof CreateCasePayload, (v || undefined) as CreateCasePayload[typeof k]);

  const setNum = (k: keyof CreateCasePayload, v: string) =>
    set(k as keyof CreateCasePayload, (v ? Number(v) : undefined) as CreateCasePayload[typeof k]);

  const selectedType = CASE_TYPES.find(t => t.value === form.case_type);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={step === "type" ? "Select Case Type" : `New ${selectedType?.label} Case`}
      width={640}
    >
      {step === "type" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {CASE_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { set("case_type", t.value); setStep("details"); }}
              style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 16px",
                background: "var(--bg-elevated)",
                border: `1px solid ${form.case_type === t.value ? "var(--accent)" : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-md)",
                cursor: "pointer", textAlign: "left",
                transition: "all 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-subtle)"}
            >
              <div style={{
                padding: 8, borderRadius: "var(--radius-md)", flexShrink: 0,
                background: t.value === "cybersecurity" ? "var(--cyber-dim)"
                  : t.value === "rental" ? "var(--rental-dim)" : "var(--bg-hover)",
                color: t.value === "cybersecurity" ? "var(--cyber)"
                  : t.value === "rental" ? "var(--rental)" : "var(--text-secondary)",
              }}>
                {t.icon}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{t.label}</p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Back */}
          <button className="btn btn-ghost btn-sm" style={{ width: "fit-content", marginBottom: -4 }}
            onClick={() => setStep("type")}>
            ← Change type
          </button>

          {/* Common fields */}
          <Section title="Case Details">
            <div className="form-group">
              <label className="form-label">Case Title *</label>
              <input className="input" value={form.title}
                onChange={e => setStr("title", e.target.value)}
                placeholder={form.case_type === "cybersecurity"
                  ? "e.g. Ransomware Incident — Server Farm 01"
                  : form.case_type === "rental"
                  ? "e.g. Lease Dispute — 42 Park Avenue"
                  : "Brief case description"}
                autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="select" value={form.status}
                  onChange={e => setStr("status", e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="select" value={form.priority}
                  onChange={e => setStr("priority", e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Court Date</label>
                <input className="input" type="date" value={form.court_date || ""}
                  onChange={e => setStr("court_date", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Billing Rate (₹/hr)</label>
                <input className="input" type="number" min={0} value={form.billing_rate || ""}
                  onChange={e => setNum("billing_rate", e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="textarea" value={form.description || ""}
                onChange={e => setStr("description", e.target.value)} placeholder="Details about this matter…" />
            </div>
            <div className="form-group">
              <label className="form-label">Next Action</label>
              <input className="input" value={form.next_action || ""}
                onChange={e => setStr("next_action", e.target.value)} placeholder="What needs to happen next?" />
            </div>
          </Section>

          {/* === CYBERSECURITY FIELDS === */}
          {form.case_type === "cybersecurity" && (
            <Section title="Cybersecurity Details" accent="cyber">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Incident Date</label>
                  <input className="input" type="date" value={form.incident_date || ""}
                    onChange={e => setStr("incident_date", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Severity Level</label>
                  <select className="select" value={form.severity_level || ""}
                    onChange={e => setStr("severity_level", e.target.value)}>
                    <option value="">Select…</option>
                    {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Breach Type</label>
                  <select className="select" value={form.breach_type || ""}
                    onChange={e => setStr("breach_type", e.target.value)}>
                    <option value="">Select…</option>
                    {BREACH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Containment Status</label>
                  <select className="select" value={form.containment_status || ""}
                    onChange={e => setStr("containment_status", e.target.value)}>
                    <option value="">Select…</option>
                    <option>Not Contained</option>
                    <option>Partially Contained</option>
                    <option>Contained</option>
                    <option>Remediated</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Affected Systems / Servers</label>
                <input className="input" value={form.affected_systems || ""}
                  onChange={e => setStr("affected_systems", e.target.value)}
                  placeholder="e.g. ERP Server, Customer Database, Email Server" />
              </div>
              <div className="form-group">
                <label className="form-label">Data Compromised</label>
                <input className="input" value={form.data_compromised || ""}
                  onChange={e => setStr("data_compromised", e.target.value)}
                  placeholder="e.g. PII of ~5000 customers, financial records" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Regulatory Body</label>
                  <select className="select" value={form.regulatory_body || ""}
                    onChange={e => setStr("regulatory_body", e.target.value)}>
                    <option value="">Select…</option>
                    {REGULATORY_BODIES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Regulatory Deadline ⚠</label>
                  <input className="input" type="date" value={form.regulatory_deadline || ""}
                    onChange={e => setStr("regulatory_deadline", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Notification Sent</label>
                  <select className="select" value={form.notification_sent === true ? "yes" : form.notification_sent === false ? "no" : ""}
                    onChange={e => set("notification_sent", e.target.value === "yes" ? true : e.target.value === "no" ? false : undefined)}>
                    <option value="">Unknown</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notification Date</label>
                  <input className="input" type="date" value={form.notification_date || ""}
                    onChange={e => setStr("notification_date", e.target.value)} />
                </div>
              </div>
            </Section>
          )}

          {/* === RENTAL FIELDS === */}
          {form.case_type === "rental" && (
            <Section title="Rental / Property Details" accent="rental">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Property Type</label>
                  <select className="select" value={form.property_type || ""}
                    onChange={e => setStr("property_type", e.target.value)}>
                    <option value="">Select…</option>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₹)</label>
                  <input className="input" type="number" min={0} value={form.monthly_rent || ""}
                    onChange={e => setNum("monthly_rent", e.target.value)} placeholder="e.g. 25000" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Property Address</label>
                <textarea className="textarea" style={{ minHeight: 60 }} value={form.property_address || ""}
                  onChange={e => setStr("property_address", e.target.value)}
                  placeholder="Full property address…" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Security Deposit (₹)</label>
                  <input className="input" type="number" min={0} value={form.security_deposit || ""}
                    onChange={e => setNum("security_deposit", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Lock-in Period (months)</label>
                  <input className="input" type="number" min={0} value={form.lock_in_period_months || ""}
                    onChange={e => setNum("lock_in_period_months", e.target.value)} placeholder="e.g. 11" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Agreement Start Date</label>
                  <input className="input" type="date" value={form.agreement_start_date || ""}
                    onChange={e => setStr("agreement_start_date", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Agreement Expiry Date ⚠</label>
                  <input className="input" type="date" value={form.agreement_expiry_date || ""}
                    onChange={e => setStr("agreement_expiry_date", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Renewal Date</label>
                  <input className="input" type="date" value={form.renewal_date || ""}
                    onChange={e => setStr("renewal_date", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rent Escalation (%)</label>
                  <input className="input" type="number" min={0} step={0.5} value={form.rent_escalation_pct || ""}
                    onChange={e => setNum("rent_escalation_pct", e.target.value)} placeholder="e.g. 5" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Landlord Name</label>
                  <input className="input" value={form.landlord_name || ""}
                    onChange={e => setStr("landlord_name", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Landlord Contact</label>
                  <input className="input" value={form.landlord_contact || ""}
                    onChange={e => setStr("landlord_contact", e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tenant Name</label>
                  <input className="input" value={form.tenant_name || ""}
                    onChange={e => setStr("tenant_name", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tenant Contact</label>
                  <input className="input" value={form.tenant_contact || ""}
                    onChange={e => setStr("tenant_contact", e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Maintenance Terms</label>
                <textarea className="textarea" style={{ minHeight: 60 }} value={form.maintenance_terms || ""}
                  onChange={e => setStr("maintenance_terms", e.target.value)}
                  placeholder="Who is responsible for maintenance, repairs, etc." />
              </div>
            </Section>
          )}

          {/* Footer */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => onSubmit(form)}
              disabled={!form.title.trim() || loading}>
              {loading ? "Creating…" : "Create Case"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function Section({ title, children, accent }: {
  title: string; children: React.ReactNode; accent?: "cyber" | "rental";
}) {
  const borderColor = accent === "cyber" ? "var(--cyber)" : accent === "rental" ? "var(--rental)" : "var(--border-subtle)";
  return (
    <div style={{
      border: `1px solid var(--border-subtle)`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: "var(--radius-md)",
      padding: "16px 18px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <h4 style={{ margin: 0, color: accent === "cyber" ? "var(--cyber)" : accent === "rental" ? "var(--rental)" : undefined }}>
        {title}
      </h4>
      {children}
    </div>
  );
}
