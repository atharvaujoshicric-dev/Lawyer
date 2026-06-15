import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Plus, Folder, Edit2, Trash2, Shield, Home, Briefcase, Phone, Mail, MapPin, Cloud, CloudOff } from "lucide-react";
import { useStore } from "../../store";
import { invoke } from "../../services/tauri";
import { Client, Case, CreateClientPayload } from "../../types";
import { PageHeader } from "../Shared/PageHeader";
import { Modal } from "../Shared/Modal";
import { CaseCard } from "../Cases/CaseCard";
import { CreateCaseModal } from "../Cases/CreateCaseModal";
import { format } from "date-fns";

export function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const { cases, loadCasesByClient, showToast } = useStore();
  const [client, setClient] = useState<Client | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!clientId) return;
    invoke<Client>("get_client_by_id", { id: clientId }).then(setClient).catch(console.error);
    loadCasesByClient(clientId);
  }, [clientId]);

  const handleUpdate = async (payload: CreateClientPayload) => {
    if (!client) return;
    setLoading(true);
    try {
      const updated = await invoke<Client>("update_client", { id: client.id, payload });
      setClient(updated);
      setEditOpen(false);
      showToast("Client updated", "success");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    try {
      await invoke("delete_client", { id: client.id });
      showToast("Client archived", "success");
      navigate("/clients");
    } catch (e) {
      showToast(String(e), "error");
    }
  };

  const handleOpenFolder = async () => {
    if (!client) return;
    try {
      await invoke("open_client_folder", { client_id: client.id });
    } catch (e) {
      showToast(String(e), "warning");
    }
  };

  const handleCaseCreate = async (payload: unknown) => {
    setLoading(true);
    try {
      await invoke("create_case", { payload });
      if (clientId) await loadCasesByClient(clientId);
      setCaseModalOpen(false);
      showToast("Case created", "success");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  };

  if (!client) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <p className="pulse" style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    );
  }

  const cyberCases = cases.filter(c => c.case_type === "cybersecurity");
  const rentalCases = cases.filter(c => c.case_type === "rental");
  const otherCases = cases.filter(c => !["cybersecurity", "rental"].includes(c.case_type));

  return (
    <div className="animate-fade">
      <PageHeader
        title={client.full_name}
        subtitle={client.client_number}
        back={
          <Link to="/clients" style={{ display: "flex", alignItems: "center", gap: 4,
            fontSize: 12, color: "var(--text-muted)", textDecoration: "none" }}>
            <ChevronLeft size={13} /> All Clients
          </Link>
        }
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={handleOpenFolder}>
              <Folder size={13} /> Open Folder
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditOpen(true)}>
              <Edit2 size={13} /> Edit
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm(true)}>
              <Trash2 size={13} />
            </button>
          </div>
        }
      />

      <div style={{ padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Client info card */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card">
            <h4 style={{ marginBottom: 14 }}>Client Information</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {client.email && (
                <InfoRow icon={<Mail size={13} />} label="Email" value={client.email} />
              )}
              {client.phone && (
                <InfoRow icon={<Phone size={13} />} label="Phone" value={client.phone} />
              )}
              {client.address && (
                <InfoRow icon={<MapPin size={13} />} label="Address" value={client.address} />
              )}
              {client.id_number && (
                <InfoRow icon={null} label="ID / PAN" value={client.id_number} mono />
              )}
              {client.occupation && (
                <InfoRow icon={null} label="Occupation" value={client.occupation} />
              )}
              {client.date_of_birth && (
                <InfoRow icon={null} label="Date of Birth" value={format(new Date(client.date_of_birth), "MMM d, yyyy")} />
              )}
            </div>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 14 }}>Overview</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <MiniStat label="Total Cases" value={cases.length} />
              <MiniStat label="Open Cases" value={cases.filter(c => c.status === "open").length} />
              <MiniStat label="Cyber Cases" value={cyberCases.length} color="var(--cyber)" />
              <MiniStat label="Rental Cases" value={rentalCases.length} color="var(--rental)" />
            </div>
            {client.notes && (
              <>
                <div className="divider" />
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {client.notes}
                </p>
              </>
            )}
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
              {client.synced ? (
                <><Cloud size={12} color="var(--success)" /><span style={{ fontSize: 11, color: "var(--success)" }}>Synced to Drive</span></>
              ) : (
                <><CloudOff size={12} color="var(--text-muted)" /><span style={{ fontSize: 11, color: "var(--text-muted)" }}>Not yet synced</span></>
              )}
            </div>
          </div>
        </div>

        {/* Cases section */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2>Cases</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setCaseModalOpen(true)}>
              <Plus size={13} /> New Case
            </button>
          </div>

          {cases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}>
              <Briefcase size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No cases yet for this client</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }}
                onClick={() => setCaseModalOpen(true)}>
                Open First Case
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {cyberCases.length > 0 && (
                <CaseSection title="Cybersecurity" icon={<Shield size={14} color="var(--cyber)" />}
                  cases={cyberCases} color="cyber" clientId={client.id} />
              )}
              {rentalCases.length > 0 && (
                <CaseSection title="Rental & Property" icon={<Home size={14} color="var(--rental)" />}
                  cases={rentalCases} color="rental" clientId={client.id} />
              )}
              {otherCases.length > 0 && (
                <CaseSection title="General" icon={<Briefcase size={14} color="var(--text-secondary)" />}
                  cases={otherCases} color="muted" clientId={client.id} />
              )}
            </div>
          )}
        </div>

      </div>

      {/* Edit modal */}
      <EditClientModal
        open={editOpen}
        client={client}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        loading={loading}
      />

      {/* Create case modal */}
      <CreateCaseModal
        open={caseModalOpen}
        clientId={client.id}
        onClose={() => setCaseModalOpen(false)}
        onSubmit={handleCaseCreate}
        loading={loading}
      />

      {/* Delete confirm */}
      <Modal open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Archive Client" width={440}>
        <p style={{ color: "var(--text-secondary)", marginBottom: 20 }}>
          This will archive <strong>{client.full_name}</strong> and all their cases.
          The folder will be moved to the archive directory. This can be recovered manually.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={() => setDeleteConfirm(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete}>Archive Client</button>
        </div>
      </Modal>
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      {icon && <span style={{ color: "var(--text-muted)", marginTop: 1 }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>{label}</span>
        <span style={{ fontSize: 13, fontFamily: mono ? "var(--font-mono)" : undefined }}>{value}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-md)" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || "var(--text-primary)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function CaseSection({ title, icon, cases, color, clientId }: {
  title: string; icon: React.ReactNode; cases: Case[]; color: string; clientId: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        {icon}
        <h4 style={{ color: "var(--text-secondary)", margin: 0 }}>{title}</h4>
        <span className={`badge badge-${color}`}>{cases.length}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {cases.map(c => <CaseCard key={c.id} case_={c} clientId={clientId} />)}
      </div>
    </div>
  );
}

function EditClientModal({ open, client, onClose, onSubmit, loading }: {
  open: boolean; client: Client; onClose: () => void;
  onSubmit: (p: CreateClientPayload) => void; loading: boolean;
}) {
  const [form, setForm] = useState<CreateClientPayload>({ full_name: client.full_name });
  useEffect(() => {
    setForm({
      full_name: client.full_name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      id_number: client.id_number,
      date_of_birth: client.date_of_birth,
      occupation: client.occupation,
      notes: client.notes,
    });
  }, [client, open]);

  const set = (k: keyof CreateClientPayload, v: string) =>
    setForm(f => ({ ...f, [k]: v || undefined }));

  return (
    <Modal open={open} onClose={onClose} title="Edit Client" width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="input" value={form.full_name}
            onChange={e => set("full_name", e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" value={form.email || ""}
              onChange={e => set("email", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="input" value={form.phone || ""}
              onChange={e => set("phone", e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">ID / PAN</label>
            <input className="input" value={form.id_number || ""}
              onChange={e => set("id_number", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Occupation</label>
            <input className="input" value={form.occupation || ""}
              onChange={e => set("occupation", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea className="textarea" value={form.address || ""}
            onChange={e => set("address", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="textarea" value={form.notes || ""}
            onChange={e => set("notes", e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSubmit(form)}
            disabled={!form.full_name.trim() || loading}>
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
