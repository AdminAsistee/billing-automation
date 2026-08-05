export type InvoiceStatus = 'Pending' | 'Paid' | 'Archived' | 'Auto-Deducted' | 'Auto-Debited';

export type UrgencyTier = 'RED' | 'YELLOW' | 'BLUE' | 'GREEN' | 'GREY';

export interface InvoiceRecord {
  id: string;
  created_at: string;
  property_id: string;
  is_unassigned: boolean; // Flag if property_id is null/unassigned
  // Human-Readable Property details
  property_name: string;      // e.g. "Park City Chuo Minato The Tower #2210" or "Noa Dogenzaka #1209"
  building_name?: string;     // e.g. "Park City Chuo Minato The Tower"
  room?: string;              // e.g. "2210"
  full_address?: string;      // e.g. "2-15-14 Minato Chuo-ku Tokyo 104-0043"
  
  billing_purpose: string;
  total: number;
  deadline_due: string;
  status: InvoiceStatus;
  payment_method: string;
  fileID?: string;
  filename?: string;
  raw_json?: Record<string, any> | string;
  
  // Computed fields
  urgencyTier?: UrgencyTier;
  daysRemaining?: number;
}

export type StatusFilterOption = 'ALL' | 'PENDING' | 'PAID' | 'AUTO_DEBITED' | 'OVERDUE' | 'ARCHIVED';

export interface UrgencySummary {
  overdueCount: number; // RED
  upcomingCount: number; // YELLOW
  lowPriorityCount: number; // BLUE
  paidCount: number; // GREEN
  archivedCount: number; // GREY
  totalAmountPending: number;
  totalAmountPaid: number;
  totalAmountAutoDebited: number;
}

export interface MasterlistRecord {
  invoice_row_id: number;
  invoice_property_id: string;
  masterlist_property_id: string;
  invoice_json: Record<string, any>;
  masterlist_address: string;
  "Building Name": string;
  "Room": string;
}

export function getGoogleDriveFileUrl(fileID?: string): string {
  if (!fileID || fileID.trim() === '') return '#';
  return `https://drive.google.com/file/d/${fileID.trim()}/view`;
}
