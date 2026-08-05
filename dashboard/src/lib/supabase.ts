import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InvoiceRecord, InvoiceStatus, MasterlistRecord } from '../types/invoice';

// =============================================================================
// Environment-driven Supabase configuration
// All identifiers are configurable via .env.local — no code changes needed
// to switch databases.
// =============================================================================
const SUPABASE_URL = process.env.SUPA_URL || '';
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPA_ANON_KEY || '';

export const INVOICE_TABLE = process.env.SUPA_DATA_TABLE_NAME || 'Invoice Data';
export const MASTERLIST_TABLE = process.env.SUPA_MASTERLIST_TABLE_NAME || 'property_masterlist';

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('your-supabase-project-id') &&
  SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY !== 'your-anon-key-here'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// =============================================================================
// Masterlist — in-memory lookup built from live Supabase data
// Populated by fetchMasterlist() called once on page mount
// =============================================================================
export const masterlistByPropIdMap = new Map<string, any>();

export interface MasterlistOption {
  id: string;
  name: string;       // Building Name + Room, or Full Address
  bldg?: string;
  room?: string;
  address?: string;
}

export let MASTERLIST_OPTIONS: MasterlistOption[] = [];

/**
 * Fetches property masterlist from Supabase and populates lookup maps.
 * No JSON fallback — if Supabase is not configured, returns empty array.
 */
export async function fetchMasterlist(): Promise<MasterlistOption[]> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[Supabase] Masterlist not loaded: Supabase is not configured.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(MASTERLIST_TABLE)
      .select('"Property ID", "Building Name", "Room", "Full Address"')
      .order('"Building Name"', { ascending: true });

    if (error) {
      console.error('[Supabase] Masterlist fetch error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Build lookup map
    masterlistByPropIdMap.clear();
    const options: MasterlistOption[] = [];
    const seen = new Set<string>();

    (data as any[]).forEach((item) => {
      const propId = String(item['Property ID'] ?? '');
      if (!propId || seen.has(propId)) return;
      seen.add(propId);

      masterlistByPropIdMap.set(propId, item);

      const bldg = item['Building Name'] as string | undefined;
      const room = item['Room'] as string | undefined;
      const address = item['Full Address'] as string | undefined;

      const name = bldg
        ? `${bldg.trim()}${room ? ' #' + String(room).trim() : ''}`
        : address || propId;

      options.push({ id: propId, name, bldg, room: room ? String(room) : undefined, address });
    });

    MASTERLIST_OPTIONS = options;
    return options;
  } catch (e) {
    console.error('[Supabase] Masterlist fetch exception:', e);
    return [];
  }
}

// =============================================================================
// Invoice normalization
// RULE: NULL property_id → is_unassigned: true. No automatic fallback resolution.
// =============================================================================
export function normalizeInvoiceRecord(raw: any): InvoiceRecord {
  let parsedRawJson: Record<string, any> = {};
  if (typeof raw.raw_json === 'string') {
    try {
      parsedRawJson = JSON.parse(raw.raw_json);
    } catch {
      parsedRawJson = {};
    }
  } else if (typeof raw.raw_json === 'object' && raw.raw_json !== null) {
    parsedRawJson = raw.raw_json;
  }

  const rawPropId = raw.property_id;
  const fileId = raw.fileID || parsedRawJson.fileID;

  const isUnassigned = !rawPropId || rawPropId === 'null' || String(rawPropId).trim() === '';

  let bldgName: string | undefined;
  let roomNum: string | undefined;
  let fullAddr: string | undefined;
  let humanPropertyName = 'Unassigned Property';

  if (!isUnassigned) {
    const masterItem = masterlistByPropIdMap.get(String(rawPropId));
    if (masterItem) {
      bldgName = masterItem['Building Name'];
      roomNum = masterItem['Room'];
      fullAddr = masterItem['Full Address'];
      if (bldgName && bldgName.trim() !== '') {
        humanPropertyName = bldgName.trim();
        if (roomNum && String(roomNum).trim() !== '') {
          humanPropertyName += ` #${String(roomNum).trim()}`;
        }
      } else if (fullAddr) {
        humanPropertyName = fullAddr;
      }
    } else {
      humanPropertyName = `Property ${rawPropId}`;
    }
  }

  let rawStatus = (raw.status || parsedRawJson.status || 'PENDING').toUpperCase();
  let status: InvoiceStatus = 'Pending';
  if (rawStatus === 'PAID') status = 'Paid';
  else if (rawStatus === 'AUTO-DEDUCTED' || rawStatus === 'AUTO_DEDUCTED' || raw.payment_method === 'Auto-Deducted') {
    status = 'Auto-Deducted';
  } else if (rawStatus === 'ARCHIVED') status = 'Archived';

  const totalVal = Number(raw.total || parsedRawJson.total_figure_amount || 0);

  return {
    id: String(raw.id || raw.invoice_row_id || Math.random().toString(36).substring(2)),
    created_at: raw.created_at || new Date().toISOString(),
    property_id: isUnassigned ? 'Unassigned' : String(rawPropId),
    is_unassigned: isUnassigned,
    property_name: humanPropertyName,
    building_name: bldgName,
    room: roomNum,
    full_address: fullAddr,
    billing_purpose: raw.billing_purpose || parsedRawJson.billing_purpose || 'General Service',
    total: totalVal,
    deadline_due: raw.deadline_due || parsedRawJson.deadline_due || new Date().toISOString().split('T')[0],
    status: status,
    payment_method: raw.payment_method || parsedRawJson.payment_method || 'To Be Paid Manually',
    fileID: fileId,
    filename: raw.filename || parsedRawJson.filename,
    raw_json: parsedRawJson,
  };
}

// =============================================================================
// Invoice data fetch — Supabase only, no sample fallback
// =============================================================================
export async function fetchInvoices(): Promise<{ data: InvoiceRecord[]; error: string | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: [],
      error: 'Supabase is not configured. Please check your .env.local file.',
    };
  }

  try {
    const { data, error } = await supabase
      .from(INVOICE_TABLE)
      .select(
        'id, created_at, property_id, billing_purpose, total, deadline_due, status, payment_method, fileID, filename, raw_json'
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] Invoice fetch error:', error);
      return { data: [], error: `Failed to load invoices: ${error.message}` };
    }

    return {
      data: (data as any[]).map(normalizeInvoiceRecord),
      error: null,
    };
  } catch (e: any) {
    console.error('[Supabase] Invoice fetch exception:', e);
    return { data: [], error: `Connection error: ${e?.message || 'Unknown error'}` };
  }
}

// =============================================================================
// Status mutation
// =============================================================================
export async function updateInvoiceStatus(
  id: string,
  newStatus: 'Pending' | 'Paid' | 'Archived'
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[Supabase] Cannot update status: not configured.');
    return false;
  }

  try {
    const { error } = await supabase
      .from(INVOICE_TABLE)
      .update({ status: newStatus.toUpperCase() })
      .eq('id', id);

    if (error) {
      console.error('[Supabase] Status update error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Supabase] Status update exception:', e);
    return false;
  }
}

// =============================================================================
// Property ID mutation
// =============================================================================
export async function updateInvoicePropertyId(
  id: string,
  newPropertyId: string
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('[Supabase] Cannot update property_id: not configured.');
    return false;
  }

  try {
    const { error } = await supabase
      .from(INVOICE_TABLE)
      .update({ property_id: newPropertyId })
      .eq('id', id);

    if (error) {
      console.error('[Supabase] Property ID update error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[Supabase] Property ID update exception:', e);
    return false;
  }
}
