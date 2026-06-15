import { useStore } from "../../store";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors = {
  success: "var(--success)",
  error: "var(--danger)",
  info: "var(--info)",
  warning: "var(--warning)",
};

export function Toast() {
  const { toast, clearToast } = useStore();
  if (!toast) return null;

  const Icon = icons[toast.type];

  return (
    <div
      className="animate-fade"
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
        borderLeft: `3px solid ${colors[toast.type]}`,
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        maxWidth: 360,
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <Icon size={16} style={{ color: colors[toast.type], flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>{toast.message}</span>
      <button
        onClick={clearToast}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", padding: 2, display: "flex",
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
