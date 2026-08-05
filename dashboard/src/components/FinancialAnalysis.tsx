'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

import { InvoiceRecord } from '../types/invoice';
import { formatYen } from '../lib/urgency';
import {
  AnalysisGroupBy,
  DateRange,
  getCurrentQuarterRange,
  groupByCostDriver,
  trendOverTime,
  detectAnomalies,
  topNExpenses,
  correlationInsights,
} from '../lib/analytics';
import { IconAlert, IconCheck, IconAnalysis, IconInvoices } from './Icons';

// ─── Constants ────────────────────────────────────────────────────────────────

const BAR_COLORS = [
  '#00d2b4', '#38bdf8', '#f59e0b', '#10b981',
  '#ef4444', '#c084fc', '#6366f1', '#fb923c',
  '#34d399', '#818cf8',
];

const DRILL_PAGE_SIZE = 15;
const ANOMALY_PAGE_SIZE = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

type DateScope = 'quarter' | 'last_quarter' | '6months' | 'year' | 'all';

// ─── Props ────────────────────────────────────────────────────────────────────

interface FinancialAnalysisProps {
  invoices: InvoiceRecord[];
  onNavigateToInvoice: (invoice: InvoiceRecord) => void;
}

// ─── Helper: status pill colour ───────────────────────────────────────────────

function pillClass(status: string): string {
  switch (status) {
    case 'Paid':          return 'status-pill green';
    case 'Pending':       return 'status-pill yellow';
    case 'Archived':      return 'status-pill grey';
    case 'Auto-Deducted':
    case 'Auto-Debited':  return 'status-pill blue';
    default:              return 'status-pill grey';
  }
}

// ─── Helper: resolve DateRange from scope ─────────────────────────────────────

function resolveDateRange(scope: DateScope): DateRange | undefined {
  if (scope === 'all') return undefined;

  const now = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  if (scope === 'quarter') return getCurrentQuarterRange();

  if (scope === 'last_quarter') {
    const qStart = Math.floor(month / 3) * 3;
    const prevQStart = qStart - 3;
    if (prevQStart < 0) {
      const from = new Date(year - 1, 9, 1);
      from.setHours(0, 0, 0, 0);
      const to = new Date(year - 1, 12, 0);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }
    const from = new Date(year, prevQStart, 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(year, prevQStart + 3, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  if (scope === '6months') {
    const from = new Date(year, month - 5, 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(year, month + 1, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  // year
  const from = new Date(year, 0, 1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(year, 11, 31);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface BarTooltipPayload {
  name: string;
  value: number;
  payload: { label: string; count: number; avgTotal: number };
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: BarTooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(6,19,25,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '0.65rem 0.9rem',
      fontSize: '0.82rem',
      color: '#fff',
      minWidth: 170,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#00d2b4' }}>{d.label}</div>
      <div>Total: <strong>{formatYen(payload[0].value)}</strong></div>
      <div>Invoices: <strong>{d.count}</strong></div>
      <div>Avg: <strong>{formatYen(d.avgTotal)}</strong></div>
    </div>
  );
}

interface AreaTooltipPayload {
  value: number;
  payload: { period: string; count: number };
}

function AreaTooltip({ active, payload }: { active?: boolean; payload?: AreaTooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'rgba(6,19,25,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8,
      padding: '0.65rem 0.9rem',
      fontSize: '0.82rem',
      color: '#fff',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#38bdf8' }}>{d.period}</div>
      <div>Total: <strong>{formatYen(payload[0].value)}</strong></div>
      <div>Invoices: <strong>{d.count}</strong></div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const FinancialAnalysis: React.FC<FinancialAnalysisProps> = ({
  invoices,
  onNavigateToInvoice,
}) => {
  // ── Control state ──────────────────────────────────────────────────────────
  const [dateScope, setDateScope]         = useState<DateScope>('quarter');
  const [groupBy, setGroupBy]             = useState<AnalysisGroupBy>('billing_purpose');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [anomalyMode, setAnomalyMode]     = useState<'statistical' | 'static'>('statistical');
  const [trendInterval, setTrendInterval] = useState<'month' | 'quarter'>('month');
  const [drillPage, setDrillPage]         = useState(0);
  const [anomalyPage, setAnomalyPage]     = useState(0);

  // ── Derived date range ─────────────────────────────────────────────────────
  const dateRange = useMemo(() => resolveDateRange(dateScope), [dateScope]);

  // ── Reset handlers ─────────────────────────────────────────────────────────
  const handleDateScopeChange = useCallback((scope: DateScope) => {
    setDateScope(scope);
    setSelectedCategory(null);
    setDrillPage(0);
    setAnomalyPage(0);
  }, []);

  const handleGroupByChange = useCallback((gb: AnalysisGroupBy) => {
    setGroupBy(gb);
    setSelectedCategory(null);
    setDrillPage(0);
    setAnomalyPage(0);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedCategory(null);
    setDrillPage(0);
  }, []);

  const handleBarClick = useCallback((data: { label: string }) => {
    if (!data?.label) return;
    setSelectedCategory((prev) => (prev === data.label ? null : data.label));
    setDrillPage(0);
  }, []);

  // ── Scope-filtered invoices ────────────────────────────────────────────────
  const scopedInvoices = useMemo(() => {
    if (!dateRange) return invoices;
    return invoices.filter((inv) => {
      if (!inv.deadline_due) return true;
      const d = new Date(inv.deadline_due);
      d.setHours(0, 0, 0, 0);
      return d >= dateRange.from && d <= dateRange.to;
    });
  }, [invoices, dateRange]);

  // ── Section 1 — KPI metrics ────────────────────────────────────────────────
  const kpi = useMemo(() => {
    if (scopedInvoices.length === 0) return { totalOut: 0, avgInv: 0, highest: 0, count: 0 };
    const totalOut = scopedInvoices.reduce((s, inv) => s + Number(inv.total), 0);
    const avgInv   = Math.round(totalOut / scopedInvoices.length);
    const highest  = Math.max(...scopedInvoices.map((inv) => Number(inv.total)));
    return { totalOut, avgInv, highest, count: scopedInvoices.length };
  }, [scopedInvoices]);

  // ── Section 2 — Cost driver chart data ────────────────────────────────────
  const chartData = useMemo(
    () => groupByCostDriver(scopedInvoices, groupBy, undefined, 10),
    [scopedInvoices, groupBy],
  );

  // ── Section 2 — Drill-down invoices (paginated) ───────────────────────────
  const drillInvoices = useMemo(() => {
    if (!selectedCategory) return [];
    const filterField = groupBy;
    return topNExpenses(scopedInvoices, 1500, {
      [filterField]: selectedCategory,
    } as Record<string, string>);
  }, [scopedInvoices, selectedCategory, groupBy]);

  const drillPageCount = Math.max(1, Math.ceil(drillInvoices.length / DRILL_PAGE_SIZE));
  const drillPageItems = useMemo(
    () => drillInvoices.slice(drillPage * DRILL_PAGE_SIZE, (drillPage + 1) * DRILL_PAGE_SIZE),
    [drillInvoices, drillPage],
  );

  // ── Section 3 — Trend data ─────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const purposeFilter  = groupBy === 'billing_purpose' ? selectedCategory : null;
    const propertyFilter = groupBy === 'property_name'   ? selectedCategory : null;
    return trendOverTime(scopedInvoices, trendInterval, purposeFilter, propertyFilter);
  }, [scopedInvoices, trendInterval, selectedCategory, groupBy]);

  // ── Section 4 — Anomalies ──────────────────────────────────────────────────
  const anomalies = useMemo(() => {
    if (anomalyMode === 'statistical') {
      return detectAnomalies(scopedInvoices, 1.5, 100_000, undefined);
    }
    // Static mode: ≥ ¥100,000
    return scopedInvoices
      .filter((inv) => Number(inv.total) >= 100_000)
      .map((invoice) => ({
        invoice,
        groupMean: 0,
        stdDev: 0,
        deviations: 0,
        explanation: `${formatYen(Number(invoice.total))} meets or exceeds the ¥100,000 threshold`,
      }))
      .sort((a, b) => Number(b.invoice.total) - Number(a.invoice.total));
  }, [scopedInvoices, anomalyMode]);

  const anomalyPageCount = Math.max(1, Math.ceil(anomalies.length / ANOMALY_PAGE_SIZE));
  const anomalyPageItems = useMemo(
    () => anomalies.slice(anomalyPage * ANOMALY_PAGE_SIZE, (anomalyPage + 1) * ANOMALY_PAGE_SIZE),
    [anomalies, anomalyPage],
  );

  // ── Section 5 — Correlation insights ──────────────────────────────────────
  const correlations = useMemo(() => {
    if (!selectedCategory || groupBy !== 'billing_purpose') return [];
    return correlationInsights(scopedInvoices, selectedCategory, undefined);
  }, [scopedInvoices, selectedCategory, groupBy]);

  // ── Scope label helper ─────────────────────────────────────────────────────
  const scopeLabel: Record<DateScope, string> = {
    quarter:      'This Quarter',
    last_quarter: 'Last Quarter',
    '6months':    'Last 6 Months',
    year:         'This Year',
    all:          'All Time',
  };

  // ── GroupBy label helper ───────────────────────────────────────────────────
  const groupByLabel: Record<AnalysisGroupBy, string> = {
    billing_purpose: 'Billing Purpose',
    property_name:   'Property',
    payment_method:  'Payment Method',
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-grid-layout">

      {/* ──────────────────── CONTROL BAR ──────────────────────────────── */}
      <div className="filter-bar" style={{ marginBottom: 0 }}>
        {/* Date scope pills */}
        <div className="filter-pills">
          {(['quarter', 'last_quarter', '6months', 'year', 'all'] as DateScope[]).map((s) => (
            <button
              key={s}
              className={`filter-pill${dateScope === s ? ' active' : ''}`}
              onClick={() => handleDateScopeChange(s)}
            >
              {scopeLabel[s]}
            </button>
          ))}
        </div>

        {/* Group-by select */}
        <div className="controls-group">
          <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Group by:</label>
          <select
            className="select-control"
            value={groupBy}
            onChange={(e) => handleGroupByChange(e.target.value as AnalysisGroupBy)}
          >
            <option value="billing_purpose">Billing Purpose</option>
            <option value="property_name">Property</option>
            <option value="payment_method">Payment Method</option>
          </select>
        </div>
      </div>

      {/* ──────────────────── SECTION 1 — KPI CARDS ────────────────────── */}
      <div className="kpi-grid">
        {/* Total Outflow */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-icon-badge teal">
              <IconAnalysis size={20} color="var(--accent-teal)" />
            </div>
          </div>
          <div className="kpi-label">Total Outflow</div>
          <div className="kpi-value">{formatYen(kpi.totalOut)}</div>
          <div className="kpi-sub muted">{scopeLabel[dateScope]}</div>
        </div>

        {/* Average Invoice */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-icon-badge amber">
              <IconInvoices size={20} color="var(--color-yellow)" />
            </div>
          </div>
          <div className="kpi-label">Average Invoice</div>
          <div className="kpi-value">{formatYen(kpi.avgInv)}</div>
          <div className="kpi-sub muted">Mean cost per document</div>
        </div>

        {/* Highest Expense */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-icon-badge red">
              <IconAlert size={20} color="var(--color-red)" />
            </div>
          </div>
          <div className="kpi-label">Highest Expense</div>
          <div className="kpi-value">{formatYen(kpi.highest)}</div>
          <div className="kpi-sub warning">Max single invoice</div>
        </div>

        {/* Invoice Count */}
        <div className="kpi-card">
          <div className="kpi-card-header">
            <div className="kpi-icon-badge grey">
              <IconCheck size={20} color="var(--color-grey)" />
            </div>
          </div>
          <div className="kpi-label">Invoice Count</div>
          <div className="kpi-value">{kpi.count}</div>
          <div className="kpi-sub positive">Records in scope</div>
        </div>
      </div>

      {/* ──────────────────── SECTION 2 — COST DRIVER CHART ─────────────── */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Cost Drivers — {groupByLabel[groupBy]}</h3>
            <p className="panel-sub-text">
              Click a bar to drill into individual invoices
              {selectedCategory ? ` · Viewing: ${selectedCategory}` : ''}
            </p>
          </div>
          {selectedCategory && (
            <button className="btn-action" onClick={handleClearSelection}>
              Clear Selection
            </button>
          )}
        </div>

        {chartData.length === 0 ? (
          <div className="empty-state">No data for this scope.</div>
        ) : (
          <div style={{ height: 320, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#87a9b0"
                  fontSize={11}
                  tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke="#87a9b0"
                  fontSize={11}
                  width={130}
                  tick={{ fill: '#87a9b0' }}
                  tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + '…' : v}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BAR_COLORS[index % BAR_COLORS.length]}
                      opacity={selectedCategory && selectedCategory !== entry.label ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Drill-Down Panel */}
        {selectedCategory && drillInvoices.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff' }}>
                {selectedCategory} — Top Invoices
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                  ({drillInvoices.length} total)
                </span>
              </h4>
            </div>

            <div className="invoice-row-list">
              {drillPageItems.map((inv) => (
                <div key={inv.id} className="invoice-card-row">
                  <div className="invoice-status-circle amber">
                    <IconInvoices size={18} color="var(--color-yellow)" />
                  </div>
                  <div className="invoice-row-info">
                    <div className="invoice-row-title-bar">
                      <h4 className="invoice-title">{inv.property_name || 'Unassigned'}</h4>
                      <span className={pillClass(inv.status)}>{inv.status}</span>
                    </div>
                    <div className="invoice-row-meta">
                      <span>{inv.billing_purpose}</span>
                      <span className="dot-divider">•</span>
                      <span>Due: {inv.deadline_due}</span>
                      {inv.payment_method && (
                        <>
                          <span className="dot-divider">•</span>
                          <span>{inv.payment_method}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="invoice-row-right">
                    <div className="invoice-amount text-amber">{formatYen(Number(inv.total))}</div>
                  </div>
                </div>
              ))}
            </div>

            {drillPageCount > 1 && (
              <div className="pagination-bar">
                <span>{drillInvoices.length} invoices</span>
                <div className="pagination-buttons">
                  <button
                    className="btn-nav"
                    disabled={drillPage === 0}
                    onClick={() => setDrillPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span className="page-indicator">
                    {drillPage + 1} / {drillPageCount}
                  </span>
                  <button
                    className="btn-nav"
                    disabled={drillPage >= drillPageCount - 1}
                    onClick={() => setDrillPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ──────────────────── SECTION 3 — TREND OVER TIME ───────────────── */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Spend Trend{selectedCategory ? ` — ${selectedCategory}` : ''}</h3>
            <p className="panel-sub-text">Invoice totals over time by due date</p>
          </div>
          <div className="controls-group">
            <button
              className={`filter-pill${trendInterval === 'month' ? ' active' : ''}`}
              onClick={() => setTrendInterval('month')}
            >
              Monthly
            </button>
            <button
              className={`filter-pill${trendInterval === 'quarter' ? ' active' : ''}`}
              onClick={() => setTrendInterval('quarter')}
            >
              Quarterly
            </button>
          </div>
        </div>

        {trendData.length === 0 ? (
          <div className="empty-state">No trend data for this scope.</div>
        ) : (
          <div style={{ height: 280, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d2b4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00d2b4" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="period"
                  stroke="#87a9b0"
                  fontSize={11}
                  tick={{ fill: '#87a9b0' }}
                />
                <YAxis
                  stroke="#87a9b0"
                  fontSize={11}
                  tickFormatter={(v: number) => `¥${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<AreaTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#00d2b4"
                  strokeWidth={2}
                  fill="url(#tealGrad)"
                  dot={{ r: 3, fill: '#00d2b4', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#00d2b4' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ──────────────────── SECTION 4 — ANOMALY DETECTION ─────────────── */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Anomaly Detection</h3>
            <p className="panel-sub-text">
              {anomalyMode === 'statistical'
                ? 'Invoices ≥ 1.5σ above their category mean and ≥ ¥100,000'
                : 'All invoices meeting or exceeding ¥100,000'}
            </p>
          </div>
          <div className="controls-group">
            <button
              className={`filter-pill${anomalyMode === 'statistical' ? ' active' : ''}`}
              onClick={() => { setAnomalyMode('statistical'); setAnomalyPage(0); }}
            >
              Statistical (1.5σ)
            </button>
            <button
              className={`filter-pill${anomalyMode === 'static' ? ' active' : ''}`}
              onClick={() => { setAnomalyMode('static'); setAnomalyPage(0); }}
            >
              Static (≥¥100k)
            </button>
          </div>
        </div>

        {anomalies.length === 0 ? (
          <div className="empty-state">No anomalies detected in this scope.</div>
        ) : (
          <>
            <div className="invoice-row-list">
              {anomalyPageItems.map(({ invoice: inv, deviations, explanation }) => (
                <div key={inv.id} className="invoice-card-row">
                  <div className="invoice-status-circle red">
                    <IconAlert size={18} color="var(--color-red)" />
                  </div>
                  <div className="invoice-row-info">
                    <div className="invoice-row-title-bar">
                      <h4 className="invoice-title">{inv.property_name || 'Unassigned'}</h4>
                      <span className={pillClass(inv.status)}>{inv.status}</span>
                    </div>
                    <div className="invoice-row-meta">
                      <span>{inv.billing_purpose}</span>
                      <span className="dot-divider">•</span>
                      <span>Due: {inv.deadline_due}</span>
                      {anomalyMode === 'statistical' && deviations > 0 && (
                        <>
                          <span className="dot-divider">•</span>
                          <span style={{ color: 'var(--color-red)' }}>
                            {deviations.toFixed(1)}σ above mean
                          </span>
                        </>
                      )}
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--color-yellow)',
                      marginTop: '0.3rem',
                      fontStyle: 'italic',
                    }}>
                      {explanation}
                    </div>
                  </div>
                  <div className="invoice-row-right">
                    <div className="invoice-amount" style={{ color: 'var(--color-red)' }}>
                      {formatYen(Number(inv.total))}
                    </div>
                    <div className="invoice-actions">
                      <button
                        className="btn-action"
                        onClick={() => onNavigateToInvoice(inv)}
                      >
                        Inspect Receipt
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {anomalyPageCount > 1 && (
              <div className="pagination-bar">
                <span>{anomalies.length} anomalies</span>
                <div className="pagination-buttons">
                  <button
                    className="btn-nav"
                    disabled={anomalyPage === 0}
                    onClick={() => setAnomalyPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span className="page-indicator">
                    {anomalyPage + 1} / {anomalyPageCount}
                  </span>
                  <button
                    className="btn-nav"
                    disabled={anomalyPage >= anomalyPageCount - 1}
                    onClick={() => setAnomalyPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ──────────────────── SECTION 5 — CORRELATION INSIGHTS ──────────── */}
      {selectedCategory && groupBy === 'billing_purpose' && correlations.length > 0 && (
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <h3>Cost Concentration: {selectedCategory}</h3>
              <p className="panel-sub-text">
                Property breakdown within this billing category (top 10)
              </p>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Property</th>
                <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Invoices</th>
                <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>Total</th>
                <th style={{ padding: '0.6rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'right' }}>% of Category</th>
              </tr>
            </thead>
            <tbody>
              {correlations.map((row, idx) => (
                <tr
                  key={row.property_name}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}
                >
                  <td style={{ padding: '0.65rem 0.75rem', color: '#fff', fontWeight: 500 }}>
                    {row.property_name}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {row.count}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', color: 'var(--accent-teal)', fontWeight: 600 }}>
                    {formatYen(row.total)}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <div style={{
                        height: 6,
                        width: Math.max(4, row.percentageOfCategory * 0.8),
                        background: BAR_COLORS[idx % BAR_COLORS.length],
                        borderRadius: 3,
                        display: 'inline-block',
                      }} />
                      <span style={{ color: '#fff', fontWeight: 600, minWidth: 42, textAlign: 'right' }}>
                        {row.percentageOfCategory.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
