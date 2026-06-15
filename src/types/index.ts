export interface Client {
  id: string;
  client_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  id_number?: string;
  date_of_birth?: string;
  occupation?: string;
  notes?: string;
  status: "active" | "inactive" | "closed";
  folder_path?: string;
  drive_folder_id?: string;
  synced: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClientPayload {
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  id_number?: string;
  date_of_birth?: string;
  occupation?: string;
  notes?: string;
}

export type CaseType = "cybersecurity" | "rental" | "general" | "corporate" | "litigation";

export interface Case {
  id: string;
  client_id: string;
  case_number: string;
  case_type: CaseType;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "pending" | "closed" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  opened_date: string;
  closed_date?: string;
  court_date?: string;
  next_action?: string;
  billing_rate: number;
  billed_hours: number;

  // Cybersecurity
  incident_date?: string;
  breach_type?: string;
  affected_systems?: string;
  regulatory_deadline?: string;
  regulatory_body?: string;
  data_compromised?: string;
  severity_level?: "low" | "medium" | "high" | "critical";
  containment_status?: string;
  forensic_report_url?: string;
  notification_sent?: number;
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

  drive_folder_id?: string;
  synced: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_clients: number;
  active_clients: number;
  total_cases: number;
  open_cases: number;
  cyber_cases: number;
  rental_cases: number;
  expiring_soon: number;
  unsynced_items: number;
}

export interface ActivityEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  created_at: string;
}

export interface SyncStatus {
  is_authenticated: boolean;
  last_sync?: string;
  unsynced_count: number;
  drive_folder_url?: string;
  sync_in_progress: boolean;
}

export interface Reminder {
  id: string;
  case_id: string;
  client_id: string;
  reminder_type: string;
  title: string;
  due_date: string;
  days_remaining: number;
  client_name?: string;
  case_title?: string;
}
