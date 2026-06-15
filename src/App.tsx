import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useStore } from "./store";
import { invoke } from "./services/tauri";
import { SetupScreen } from "./components/Settings/SetupScreen";
import { LoginScreen } from "./components/Settings/LoginScreen";
import { Layout } from "./components/Shared/Layout";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { ClientList } from "./components/Clients/ClientList";
import { ClientDetail } from "./components/Clients/ClientDetail";
import CaseDetail from "./components/Cases/CaseDetail";
import { SettingsPage } from "./components/Settings/SettingsPage";
import { Toast } from "./components/Shared/Toast";

export default function App() {
  const { isAuthenticated, isFirstRun, setIsFirstRun, loadSyncStatus } = useStore();

  useEffect(() => {
    invoke<boolean>("is_first_run").then(setIsFirstRun).catch(() => setIsFirstRun(false));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSyncStatus();
    }
  }, [isAuthenticated]);

  if (isFirstRun === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-base)" }}>
        <div className="pulse" style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          Initializing…
        </div>
      </div>
    );
  }

  if (isFirstRun) return <SetupScreen />;
  if (!isAuthenticated) return <LoginScreen />;

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="clients" element={<ClientList />} />
          <Route path="clients/:clientId" element={<ClientDetail />} />
          <Route path="clients/:clientId/cases/:caseId" element={<CaseDetail />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toast />
    </>
  );
}
