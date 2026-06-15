import { create } from "zustand";
import { Client, Case, DashboardStats, SyncStatus } from "../types";
import { invoke } from "../services/tauri";

interface AppStore {
  // Auth
  isAuthenticated: boolean;
  isFirstRun: boolean | null;
  setAuthenticated: (v: boolean) => void;
  setIsFirstRun: (v: boolean) => void;

  // Clients
  clients: Client[];
  selectedClient: Client | null;
  loadClients: () => Promise<void>;
  setSelectedClient: (c: Client | null) => void;

  // Cases
  cases: Case[];
  selectedCase: Case | null;
  loadCasesByClient: (clientId: string) => Promise<void>;
  setSelectedCase: (c: Case | null) => void;

  // Dashboard
  stats: DashboardStats | null;
  loadStats: () => Promise<void>;

  // Sync
  syncStatus: SyncStatus | null;
  loadSyncStatus: () => Promise<void>;

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  toast: { message: string; type: "success" | "error" | "info" | "warning" } | null;
  showToast: (message: string, type?: "success" | "error" | "info" | "warning") => void;
  clearToast: () => void;
}

export const useStore = create<AppStore>((set, get) => ({
  isAuthenticated: false,
  isFirstRun: null,
  setAuthenticated: (v) => set({ isAuthenticated: v }),
  setIsFirstRun: (v) => set({ isFirstRun: v }),

  clients: [],
  selectedClient: null,
  loadClients: async () => {
    try {
      const clients = await invoke<Client[]>("get_all_clients");
      set({ clients });
    } catch (e) {
      console.error(e);
    }
  },
  setSelectedClient: (c) => set({ selectedClient: c, cases: [], selectedCase: null }),

  cases: [],
  selectedCase: null,
  loadCasesByClient: async (clientId) => {
    try {
      const cases = await invoke<Case[]>("get_cases_by_client", { client_id: clientId });
      set({ cases });
    } catch (e) {
      console.error(e);
    }
  },
  setSelectedCase: (c) => set({ selectedCase: c }),

  stats: null,
  loadStats: async () => {
    try {
      const stats = await invoke<DashboardStats>("get_dashboard_stats");
      set({ stats });
    } catch (e) {
      console.error(e);
    }
  },

  syncStatus: null,
  loadSyncStatus: async () => {
    try {
      const syncStatus = await invoke<SyncStatus>("get_drive_sync_status");
      set({ syncStatus });
    } catch (e) {
      console.error(e);
    }
  },

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toast: null,
  showToast: (message, type = "info") => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3500);
  },
  clearToast: () => set({ toast: null }),
}));
