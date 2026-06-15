// Tauri IPC bridge — works in both Tauri runtime and browser dev mode
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/tauri");
    return tauriInvoke<T>(cmd, args);
  }
  // Mock for browser development
  return mockInvoke<T>(cmd, args);
}

// ---- Dev mocks ----
let mockClients: Record<string, unknown>[] = [];
let mockCases: Record<string, unknown>[] = [];
let clientCounter = 1024;

async function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  await delay(80);

  switch (cmd) {
    case "is_first_run": return (localStorage.getItem("lpm_setup") === null) as unknown as T;
    case "setup_master_password":
      localStorage.setItem("lpm_setup", "1");
      localStorage.setItem("lpm_pw", String(args?.password));
      return undefined as unknown as T;
    case "verify_master_password":
      return (localStorage.getItem("lpm_pw") === String(args?.password)) as unknown as T;

    case "create_client": {
      const p = args?.payload as Record<string, unknown>;
      const id = crypto.randomUUID();
      const cn = `CL-${clientCounter++}`;
      const client = { id, client_number: cn, ...p, status: "active", synced: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      mockClients.push(client);
      return client as unknown as T;
    }
    case "get_all_clients": return [...mockClients].reverse() as unknown as T;
    case "search_clients": {
      const q = String(args?.query || "").toLowerCase();
      return mockClients.filter((c: Record<string, unknown>) =>
        String(c.full_name || "").toLowerCase().includes(q) ||
        String(c.client_number || "").toLowerCase().includes(q)
      ) as unknown as T;
    }
    case "get_client_by_id":
      return mockClients.find((c: Record<string, unknown>) => c.id === args?.id) as unknown as T;
    case "update_client": {
      const idx = mockClients.findIndex((c: Record<string, unknown>) => c.id === args?.id);
      if (idx >= 0) {
        mockClients[idx] = { ...mockClients[idx], ...(args?.payload as Record<string, unknown>),
          updated_at: new Date().toISOString(), synced: 0 };
        return mockClients[idx] as unknown as T;
      }
      throw new Error("Client not found");
    }
    case "delete_client":
      mockClients = mockClients.filter((c: Record<string, unknown>) => c.id !== args?.id);
      return undefined as unknown as T;

    case "create_case": {
      const p = args?.payload as Record<string, unknown>;
      const id = crypto.randomUUID();
      const caseObj = { id, case_number: `CASE-${String(mockCases.length + 1).padStart(5,"0")}`,
        ...p, status: p.status || "open", priority: p.priority || "medium", synced: 0,
        billed_hours: 0, opened_date: new Date().toISOString().split("T")[0],
        created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      mockCases.push(caseObj);
      return caseObj as unknown as T;
    }
    case "get_cases_by_client":
      return mockCases.filter((c: Record<string, unknown>) => c.client_id === args?.client_id) as unknown as T;
    case "get_case_by_id":
      return mockCases.find((c: Record<string, unknown>) => c.id === args?.id) as unknown as T;
    case "update_case": {
      const idx = mockCases.findIndex((c: Record<string, unknown>) => c.id === args?.id);
      if (idx >= 0) {
        mockCases[idx] = { ...mockCases[idx], ...(args?.payload as Record<string, unknown>),
          updated_at: new Date().toISOString(), synced: 0 };
        return mockCases[idx] as unknown as T;
      }
      throw new Error("Case not found");
    }
    case "delete_case":
      mockCases = mockCases.filter((c: Record<string, unknown>) => c.id !== args?.id);
      return undefined as unknown as T;

    case "get_expiring_soon":
      return [] as unknown as T;

    case "get_dashboard_stats":
      return {
        total_clients: mockClients.length,
        active_clients: mockClients.filter((c: Record<string, unknown>) => c.status === "active").length,
        total_cases: mockCases.length,
        open_cases: mockCases.filter((c: Record<string, unknown>) => c.status === "open").length,
        cyber_cases: mockCases.filter((c: Record<string, unknown>) => c.case_type === "cybersecurity").length,
        rental_cases: mockCases.filter((c: Record<string, unknown>) => c.case_type === "rental").length,
        expiring_soon: 0,
        unsynced_items: 0,
      } as unknown as T;

    case "get_recent_activity":
      return [] as unknown as T;

    case "get_drive_sync_status":
      return {
        is_authenticated: false,
        last_sync: null,
        unsynced_count: 0,
        drive_folder_url: null,
        sync_in_progress: false,
      } as unknown as T;

    case "initiate_google_auth":
      return "https://accounts.google.com/o/oauth2/v2/auth?mock=1" as unknown as T;

    case "exchange_auth_code":
      return "https://drive.google.com/drive/folders/mock" as unknown as T;

    case "sync_now":
      return "Sync completed" as unknown as T;

    case "get_drive_folder_url":
      return null as unknown as T;

    case "open_client_folder":
    case "get_client_files":
      return [] as unknown as T;

    default:
      console.warn("Unhandled mock command:", cmd);
      return undefined as unknown as T;
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Convenience service object for components that prefer method-style calls
export const tauriService = {
  getCaseById: (id: string) => invoke<import('../types').Case>('get_case_by_id', { id }),
  updateCase: (payload: import('../types').Case) => invoke<import('../types').Case>('update_case', { id: payload.id, payload }),
  deleteCase: (id: string) => invoke<void>('delete_case', { id }),
  getClientById: (id: string) => invoke<import('../types').Client>('get_client_by_id', { id }),
  updateClient: (id: string, payload: Partial<import('../types').Client>) => invoke<import('../types').Client>('update_client', { id, payload }),
  deleteClient: (id: string) => invoke<void>('delete_client', { id }),
};
