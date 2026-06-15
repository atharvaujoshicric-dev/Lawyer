import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Settings, CloudOff, Cloud, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useStore } from "../../store";
import { invoke } from "../../services/tauri";
import styles from "./Layout.module.css";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/clients", icon: Users, label: "Clients & Cases" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Layout() {
  const { sidebarOpen, toggleSidebar, syncStatus, loadSyncStatus, showToast } = useStore();

  const handleSync = async () => {
    try {
      await invoke("sync_now");
      await loadSyncStatus();
      showToast("Sync completed successfully", "success");
    } catch (e) {
      showToast("Sync failed — check connection", "error");
    }
  };

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? "" : styles.collapsed}`}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoMark}>⚖</div>
          {sidebarOpen && (
            <div className={styles.logoText}>
              <span className={styles.logoTitle}>LexTrack</span>
              <span className={styles.logoSub}>Practice Manager</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ""}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <Icon size={18} />
              {sidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sync status */}
        <div className={styles.syncPanel}>
          {syncStatus?.is_authenticated ? (
            <button
              className={`${styles.syncBtn} ${styles.synced}`}
              onClick={handleSync}
              title="Click to sync now"
            >
              <Cloud size={14} />
              {sidebarOpen && (
                <span>
                  {syncStatus.unsynced_count > 0
                    ? `${syncStatus.unsynced_count} pending`
                    : "Drive synced"}
                </span>
              )}
            </button>
          ) : (
            <div className={`${styles.syncBtn} ${styles.offline}`} title="Not connected to Drive">
              <CloudOff size={14} />
              {sidebarOpen && <span>Offline</span>}
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button className={styles.collapseBtn} onClick={toggleSidebar}>
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
