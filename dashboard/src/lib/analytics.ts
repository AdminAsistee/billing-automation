import { InvoiceRecord } from '../types/invoice';

// ─── Public Types ────────────────────────────────────────────────────────────

export type AnalysisGroupBy = 'billing_purpose' | 'property_name' | 'payment_method';
export type TimeInterval = 'month' | 'quarter';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface GroupedCostResult {
  label: string;
  total: number;
  count: number;
  avgTotal: number;
}

export interface TrendPoint {
  /** e.g. "2026-07" for monthly or "Q3 2026" for quarterly */
  period: string;
  total: number;
  count: number;
}

export interface AnomalyResult {
  invoice: InvoiceRecord;
  groupMean: number;
  stdDev: number;
  deviations: number;
  explanation: string;
}

export interface CorrelationInsight {
  property_name: string;
  total: number;
  count: number;
  percentageOfCategory: number;
}

export interface TopNFilters {
  billing_purpose?: string;
  property_name?: string;
  dateRange?: DateRange;
  status?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true if invoice.deadline_due falls within [from, to] inclusive. */
function inRange(invoice: InvoiceRecord, range: DateRange): boolean {
  if (!invoice.deadline_due) return true;
  const d = new Date(invoice.deadline_due);
  d.setHours(0, 0, 0, 0);
  return d >= range.from && d <= range.to;
}

/** Formats a JPY integer as ¥XX,XXX for use in explanation strings. */
function fmtYen(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── getCurrentQuarterRange ───────────────────────────────────────────────────

/**
 * Returns a DateRange for the CURRENT calendar quarter.
 * Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec
 */
export function getCurrentQuarterRange(): DateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based

  const quarterStartMonth = Math.floor(month / 3) * 3; // 0, 3, 6, or 9
  const from = new Date(year, quarterStartMonth, 1);
  from.setHours(0, 0, 0, 0);

  const to = new Date(year, quarterStartMonth + 3, 0); // last day of quarter
  to.setHours(23, 59, 59, 999);

  return { from, to };
}

// ─── groupByCostDriver ────────────────────────────────────────────────────────

/**
 * Groups invoices by a specified field, sorts descending by total, and returns
 * the top N results.  If there are more than topN groups the remainder is
 * collapsed into a single "Other" entry.
 */
export function groupByCostDriver(
  invoices: InvoiceRecord[],
  groupBy: AnalysisGroupBy,
  dateRange?: DateRange,
  topN = 10,
): GroupedCostResult[] {
  const filtered = dateRange ? invoices.filter((inv) => inRange(inv, dateRange)) : invoices;

  const map = new Map<string, { total: number; count: number }>();

  for (const inv of filtered) {
    const raw = inv[groupBy];
    const label: string =
      raw != null && String(raw).trim() !== '' ? String(raw) : 'Unknown';
    const existing = map.get(label) ?? { total: 0, count: 0 };
    map.set(label, {
      total: existing.total + Number(inv.total),
      count: existing.count + 1,
    });
  }

  const sorted: GroupedCostResult[] = Array.from(map.entries())
    .map(([label, { total, count }]) => ({
      label,
      total,
      count,
      avgTotal: count > 0 ? Math.round(total / count) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  if (sorted.length <= topN) return sorted;

  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const restTotal = rest.reduce((s, r) => s + r.total, 0);
  const restCount = rest.reduce((s, r) => s + r.count, 0);

  top.push({
    label: 'Other',
    total: restTotal,
    count: restCount,
    avgTotal: restCount > 0 ? Math.round(restTotal / restCount) : 0,
  });

  return top;
}

// ─── trendOverTime ────────────────────────────────────────────────────────────

/**
 * Groups invoices by calendar month or quarter and returns chronologically-sorted
 * TrendPoint[].  Optional filters narrow the dataset before grouping.
 */
export function trendOverTime(
  invoices: InvoiceRecord[],
  interval: TimeInterval,
  filterByPurpose?: string | null,
  filterByProperty?: string | null,
  dateRange?: DateRange,
): TrendPoint[] {
  let filtered = invoices;

  if (dateRange) filtered = filtered.filter((inv) => inRange(inv, dateRange));
  if (filterByPurpose)
    filtered = filtered.filter((inv) => inv.billing_purpose === filterByPurpose);
  if (filterByProperty)
    filtered = filtered.filter((inv) => inv.property_name === filterByProperty);

  const map = new Map<string, { total: number; count: number; sortKey: string }>();

  for (const inv of filtered) {
    if (!inv.deadline_due) continue;
    const d = new Date(inv.deadline_due);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-based

    let period: string;
    let sortKey: string;

    if (interval === 'month') {
      const mm = String(month + 1).padStart(2, '0');
      period = `${year}-${mm}`;
      sortKey = period;
    } else {
      const q = Math.floor(month / 3) + 1;
      period = `Q${q} ${year}`;
      sortKey = `${year}-Q${q}`;
    }

    const existing = map.get(period) ?? { total: 0, count: 0, sortKey };
    map.set(period, {
      total: existing.total + Number(inv.total),
      count: existing.count + 1,
      sortKey,
    });
  }

  return Array.from(map.entries())
    .map(([period, { total, count, sortKey }]) => ({ period, total, count, sortKey }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ period, total, count }) => ({ period, total, count }));
}

// ─── detectAnomalies ─────────────────────────────────────────────────────────

/**
 * Flags invoices that are statistical outliers within their billing_purpose group.
 * An invoice is anomalous when:
 *   (total - groupMean) / groupStdDev >= thresholdStdDev
 *   AND total >= staticFloor
 *
 * Results are sorted by deviations descending.
 */
export function detectAnomalies(
  invoices: InvoiceRecord[],
  thresholdStdDev = 1.5,
  staticFloor = 100_000,
  dateRange?: DateRange,
): AnomalyResult[] {
  const filtered = dateRange ? invoices.filter((inv) => inRange(inv, dateRange)) : invoices;

  // Build per-purpose group statistics
  const groups = new Map<string, number[]>();
  for (const inv of filtered) {
    const key = inv.billing_purpose || 'Unknown';
    const arr = groups.get(key) ?? [];
    arr.push(Number(inv.total));
    groups.set(key, arr);
  }

  const stats = new Map<string, { mean: number; stdDev: number }>();
  for (const [key, values] of groups.entries()) {
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const variance =
      values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
    stats.set(key, { mean, stdDev: Math.sqrt(variance) });
  }

  const results: AnomalyResult[] = [];

  for (const inv of filtered) {
    const key = inv.billing_purpose || 'Unknown';
    const groupStats = stats.get(key);
    if (!groupStats) continue;
    const { mean, stdDev } = groupStats;
    const total = Number(inv.total);

    if (stdDev === 0) continue; // All invoices in group are identical — no anomaly

    const deviations = (total - mean) / stdDev;

    if (deviations >= thresholdStdDev && total >= staticFloor) {
      const multiplier = mean > 0 ? (total / mean).toFixed(1) : '∞';
      const explanation = `${fmtYen(total)} is ${multiplier}× above the mean ${key} cost of ${fmtYen(Math.round(mean))}`;
      results.push({ invoice: inv, groupMean: mean, stdDev, deviations, explanation });
    }
  }

  return results.sort((a, b) => b.deviations - a.deviations);
}

// ─── topNExpenses ─────────────────────────────────────────────────────────────

/**
 * Returns the top N invoices by total, after applying optional filters.
 */
export function topNExpenses(
  invoices: InvoiceRecord[],
  n: number,
  filters?: TopNFilters,
): InvoiceRecord[] {
  let filtered = invoices;

  if (filters?.dateRange) filtered = filtered.filter((inv) => inRange(inv, filters.dateRange!));
  if (filters?.billing_purpose)
    filtered = filtered.filter((inv) => inv.billing_purpose === filters.billing_purpose);
  if (filters?.property_name)
    filtered = filtered.filter((inv) => inv.property_name === filters.property_name);
  if (filters?.status)
    filtered = filtered.filter((inv) => inv.status === filters.status);

  return filtered
    .slice()
    .sort((a, b) => Number(b.total) - Number(a.total))
    .slice(0, n);
}

// ─── correlationInsights ──────────────────────────────────────────────────────

/**
 * For a given billing_purpose, groups invoices by property_name and returns
 * each property's total, count, and share of the category total.
 * Sorted by total descending.  Max 10 rows returned.
 */
export function correlationInsights(
  invoices: InvoiceRecord[],
  billing_purpose: string,
  dateRange?: DateRange,
): CorrelationInsight[] {
  let filtered = invoices.filter((inv) => inv.billing_purpose === billing_purpose);
  if (dateRange) filtered = filtered.filter((inv) => inRange(inv, dateRange));

  const categoryTotal = filtered.reduce((s, inv) => s + Number(inv.total), 0);

  const map = new Map<string, { total: number; count: number }>();
  for (const inv of filtered) {
    const key = inv.property_name || 'Unassigned';
    const existing = map.get(key) ?? { total: 0, count: 0 };
    map.set(key, {
      total: existing.total + Number(inv.total),
      count: existing.count + 1,
    });
  }

  return Array.from(map.entries())
    .map(([property_name, { total, count }]) => ({
      property_name,
      total,
      count,
      percentageOfCategory:
        categoryTotal > 0 ? Math.round((total / categoryTotal) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}
