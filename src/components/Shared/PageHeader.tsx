import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  back?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, back }: PageHeaderProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      padding: "28px 32px 20px",
      borderBottom: "1px solid var(--border-subtle)",
      background: "var(--bg-surface)",
    }}>
      <div>
        {back && <div style={{ marginBottom: 8 }}>{back}</div>}
        <h1 style={{ marginBottom: subtitle ? 4 : 0 }}>{title}</h1>
        {subtitle && <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}
