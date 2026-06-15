import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, User, ChevronRight, Cloud, CloudOff } from "lucide-react";
import { useStore } from "../../store";
import { invoke } from "../../services/tauri";
import { Client, CreateClientPayload } from "../../types";
import { PageHeader } from "../Shared/PageHeader";
import { Modal } from "../Shared/Modal";
import { format } from "date-fns";

export function ClientList() {
  const { clients, loadClients, setSelectedClient, showToast } = useStore();
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(clients);
    } else {
      invoke<Client[]>("search_clients", { query: search })
        .then(setFiltered)
        .catch(() => setFiltered(clients.filter(c =>
          c.full_name.toLowerCase().includes(search.toLowerCase()) ||
          c.client_number.toLowerCase().includes(search.toLowerCase())
        )));
    }
  }, [search, clients]);

  const handleCreate = async (payload: CreateClientPayload) => {
    setLoading(true);
    try {
      await invoke("create_client", { payload });
      await loadClients();
      setModalOpen(false);
      showToast("Client created successfully", "success");
    } catch (e) {
      showToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (c: Client) => {
    setSelectedClient(c);
    navigate(`/clients/${c.id}`);
  };

  return (
    <div className="animate-fade">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} total client${clients.length !== 1 ? "s" : ""}`}
        actions={
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> New Client
          </button>
        }
      />

      <div style={{ padding: "20px 32px" }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 20 }}>
          <Search size={15} style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: "var(--text-muted)", pointerEvents: "none",
          }} />
          <input
            className="input"
            style={{ paddingLeft: 36, maxWidth: 420 }}
            placeholder="Search by name, ID, or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Client list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "var(--text-muted)" }}>
            <User size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>{search ? "No clients match your search" : "No clients yet"}</p>
            {!search && (
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>
                Add your first client
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Header row */}
            <div style={{
              display: "grid", gridTemplateColumns: "140px 1fr 180px 140px 80px 40px",
              padding: "6px 14px", fontSize: 11, color: "var(--text-muted)",
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              <span>Client No.</span>
              <span>Name</span>
              <span>Contact</span>
              <span>Added</span>
              <span>Status</span>
              <span></span>
            </div>

            {filtered.map(client => (
              <div
                key={client.id}
                onClick={() => handleSelect(client)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 180px 140px 80px 40px",
                  alignItems: "center",
                  padding: "12px 14px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  transition: "all 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-elevated)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--bg-surface)")}
              >
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>
                  {client.client_number}
                </span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{client.full_name}</p>
                  {client.occupation && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{client.occupation}</p>
                  )}
                </div>
                <div>
                  {client.email && <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>{client.email}</p>}
                  {client.phone && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{client.phone}</p>}
                </div>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {format(new Date(client.created_at), "MMM d, yyyy")}
                </span>
                <span className={`badge ${client.status === "active" ? "badge-success" : "badge-muted"}`}>
                  {client.status}
                </span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {client.synced ? (
                    <Cloud size={13} color="var(--success)" opacity={0.7} title="Synced" />
                  ) : (
                    <CloudOff size={13} color="var(--text-muted)" title="Not synced" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        loading={loading}
      />
    </div>
  );
}

function CreateClientModal({ open, onClose, onSubmit, loading }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (p: CreateClientPayload) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<CreateClientPayload>({ full_name: "" });
  const set = (k: keyof CreateClientPayload, v: string) =>
    setForm(f => ({ ...f, [k]: v || undefined }));

  useEffect(() => { if (!open) setForm({ full_name: "" }); }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="New Client" width={560}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input className="input" value={form.full_name}
            onChange={e => set("full_name", e.target.value)} placeholder="e.g. John Doe" autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="input" type="email" value={form.email || ""}
              onChange={e => set("email", e.target.value)} placeholder="john@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="input" value={form.phone || ""}
              onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">ID / PAN Number</label>
            <input className="input" value={form.id_number || ""}
              onChange={e => set("id_number", e.target.value)} placeholder="ABCDE1234F" />
          </div>
          <div className="form-group">
            <label className="form-label">Date of Birth</label>
            <input className="input" type="date" value={form.date_of_birth || ""}
              onChange={e => set("date_of_birth", e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Occupation</label>
          <input className="input" value={form.occupation || ""}
            onChange={e => set("occupation", e.target.value)} placeholder="e.g. Software Engineer" />
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea className="textarea" value={form.address || ""}
            onChange={e => set("address", e.target.value)} placeholder="Full address…" />
        </div>
        <div className="form-group">
          <label className="form-label">Initial Notes</label>
          <textarea className="textarea" value={form.notes || ""}
            onChange={e => set("notes", e.target.value)} placeholder="Any intake notes…" />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSubmit(form)}
            disabled={!form.full_name.trim() || loading}>
            {loading ? "Creating…" : "Create Client"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
