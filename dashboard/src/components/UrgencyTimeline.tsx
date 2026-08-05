'use client';

import React, { useMemo } from 'react';
import { InvoiceRecord, StatusFilterOption } from '../types/invoice';
import { calculateUrgency, formatYen } from '../lib/urgency';
import {
  IconCheck,
  IconClock,
  IconAlert,
  IconArrowUpRight,
  IconBank,
  IconFolder,
  IconInvoices,
} from './Icons';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface UrgencyTimelineProps {
  invoices: InvoiceRecord[];
  dateScope: 'quarter' | 'last_quarter' | '6months' | 'year' | 'all';
  onDateScopeChange: (scope: 'quarter' | 'last_quarter' | '6months' | 'year' | 'all') => void;
  onSelectFilter: (filter: StatusFilterOption) => void;
  onSelectReceipt: (invoice: InvoiceRecord) => void;
}

export const UrgencyTimeline: React.FC<UrgencyTimelineProps> = ({
  invoices,
  dateScope,
  onDateScopeChange,
  onSelectFilter,
  onSelectReceipt,
}) => {
  // Memoized calculations
  const {
    redCount, redSum, overdueInvoices,
    yellowCount, yellowSum,
    blueCount, blueSum,
    greenCount, greenSum,
    greyCount,
    autoDebitCount, autoDebitSum,
    chartData,
  } = useMemo(() => {
    let red = 0, rSum = 0;
    let yellow = 0, ySum = 0;
    let blue = 0, bSum = 0;
    let green = 0, gSum = 0;
    let grey = 0;
    let autoDebit = 0, adSum = 0;
    const overdueList: InvoiceRecord[] = [];

    invoices.forEach((inv) => {
      const { tier } = calculateUrgency(inv);
      const amt = Number(inv.total) || 0;
      const isAutoDebit =
        inv.status === 'Auto-Deducted' ||
        inv.status === 'Auto-Debited' ||
        inv.payment_method === 'Auto-Debit';

      if (isAutoDebit) {
        autoDebit++;
        adSum += amt;
      } else if (tier === 'GREEN') {
        green++;
        gSum += amt;
      } else if (tier === 'GREY') {
        grey++;
      } else {
        if (tier === 'RED') {
          red++;
          rSum += amt;
          overdueList.push(inv);
        } else if (tier === 'YELLOW') {
          yellow++;
          ySum += amt;
        } else if (tier === 'BLUE') {
          blue++;
          bSum += amt;
        }
      }
    });

    const data = [
      { name: 'Overdue', count: red, color: '#ef4444', filterKey: 'OVERDUE' as StatusFilterOption },
      { name: 'Upcoming', count: yellow, color: '#f59e0b', filterKey: 'PENDING' as StatusFilterOption },
      { name: 'Low Priority', count: blue, color: '#3b82f6', filterKey: 'PENDING' as StatusFilterOption },
      { name: 'Paid', count: green, color: '#00d2b4', filterKey: 'PAID' as StatusFilterOption },
      { name: 'Auto-Debit', count: autoDebit, color: '#c084fc', filterKey: 'AUTO_DEBITED' as StatusFilterOption },
      { name: 'Archived', count: grey, color: '#6b7280', filterKey: 'ARCHIVED' as StatusFilterOption },
    ];

    return {
      redCount: red, redSum: rSum, overdueInvoices: overdueList,
      yellowCount: yellow, yellowSum: ySum,
      blueCount: blue, blueSum: bSum,
      greenCount: green, greenSum: gSum,
      greyCount: grey,
      autoDebitCount: autoDebit, autoDebitSum: adSum,
      chartData: data,
    };
  }, [invoices]);

  const pendingTotalSum = yellowSum + blueSum;

  return (
    <div className="dashboard-grid-layout">
      {/* Date scope control bar matching Invoices/Analysis style */}
      <div className="filter-bar" style={{ marginBottom: '1.25rem' }}>
        <div className="filter-pills">
          <button
            className={`filter-pill ${dateScope === 'quarter' ? 'active' : ''}`}
            onClick={() => onDateScopeChange('quarter')}
          >
            This Quarter
          </button>
          <button
            className={`filter-pill ${dateScope === 'last_quarter' ? 'active' : ''}`}
            onClick={() => onDateScopeChange('last_quarter')}
          >
            Last Quarter
          </button>
          <button
            className={`filter-pill ${dateScope === '6months' ? 'active' : ''}`}
            onClick={() => onDateScopeChange('6months')}
          >
            Last 6 Months
          </button>
          <button
            className={`filter-pill ${dateScope === 'year' ? 'active' : ''}`}
            onClick={() => onDateScopeChange('year')}
          >
            This Year
          </button>
          <button
            className={`filter-pill ${dateScope === 'all' ? 'active' : ''}`}
            onClick={() => onDateScopeChange('all')}
          >
            All Time
          </button>
        </div>
      </div>

      {/* KPI Top Cards Row matching example-dashboard.png */}
      <div className="kpi-grid">
        {/* Paid Card */}
        <div
          className="kpi-card"
          onClick={() => onSelectFilter('PAID')}
          title="Filter Paid Invoices"
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-badge teal">
              <IconCheck size={20} color="#00d2b4" />
            </div>
            <span className="arrow-icon"><IconArrowUpRight size={16} /></span>
          </div>
          <div className="kpi-value">{formatYen(greenSum)}</div>
          <div className="kpi-title">{greenCount} Paid Invoices</div>
          <div className="kpi-sub positive">Settled transactions</div>
        </div>

        {/* Pending Card */}
        <div
          className="kpi-card"
          onClick={() => onSelectFilter('PENDING')}
          title="Filter Pending Invoices"
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-badge amber">
              <IconClock size={20} color="#f59e0b" />
            </div>
            <span className="arrow-icon"><IconArrowUpRight size={16} /></span>
          </div>
          <div className="kpi-value">{formatYen(pendingTotalSum)}</div>
          <div className="kpi-title">{yellowCount + blueCount} Pending Invoices</div>
          <div className="kpi-sub warning">Awaiting payment</div>
        </div>

        {/* Overdue Card */}
        <div
          className="kpi-card"
          onClick={() => onSelectFilter('OVERDUE')}
          title="Filter Overdue Invoices"
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-badge red">
              <IconAlert size={20} color="#ef4444" />
            </div>
            <span className="arrow-icon"><IconArrowUpRight size={16} /></span>
          </div>
          <div className="kpi-value">{formatYen(redSum)}</div>
          <div className="kpi-title">{redCount} Overdue Invoices</div>
          <div className="kpi-sub danger">Requires attention</div>
        </div>

        {/* Auto-Debit Card */}
        <div
          className="kpi-card"
          onClick={() => onSelectFilter('AUTO_DEBITED')}
          title="Filter Auto-Debited Invoices"
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-badge purple">
              <IconBank size={20} color="#c084fc" />
            </div>
            <span className="arrow-icon"><IconArrowUpRight size={16} /></span>
          </div>
          <div className="kpi-value">{formatYen(autoDebitSum)}</div>
          <div className="kpi-title">{autoDebitCount} Auto-Debited</div>
          <div className="kpi-sub positive" style={{ color: '#c084fc' }}>Automatic bank deductions</div>
        </div>

        {/* Archived Card */}
        <div
          className="kpi-card"
          onClick={() => onSelectFilter('ARCHIVED')}
          title="Filter Archived Invoices"
        >
          <div className="kpi-card-header">
            <div className="kpi-icon-badge grey">
              <IconFolder size={20} color="#6b7280" />
            </div>
            <span className="arrow-icon"><IconArrowUpRight size={16} /></span>
          </div>
          <div className="kpi-value">{greyCount}</div>
          <div className="kpi-title">Archived Records</div>
          <div className="kpi-sub muted">Paid &ge; 7 days ago</div>
        </div>
      </div>

      {/* Main Content & Side Panel Layout */}
      <div className="main-content-layout">
        {/* Left Primary Chart Panel */}
        <div className="panel-card main-panel">
          <div className="panel-header">
            <h3>Priority Timeline</h3>
            <span className="panel-badge">{invoices.length} total records</span>
          </div>

          <div style={{ height: 260, width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#87a9b0" fontSize={12} tickLine={false} />
                <YAxis stroke="#87a9b0" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0d1e2e',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fff',
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} onClick={(entry) => onSelectFilter(entry.filterKey)}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-bar-${index}`} fill={entry.color} cursor="pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side Panel matching example-dashboard.png */}
        <div className="side-panel">
          {/* Quick Stats Card */}
          <div className="panel-card side-card">
            <h3>Quick Stats</h3>
            <div className="quick-stats-list">
              <div className="stat-row">
                <span className="stat-label">
                  <IconInvoices size={16} color="#87a9b0" /> Total Invoices
                </span>
                <span className="stat-value">{invoices.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">
                  <IconCheck size={16} color="#00d2b4" /> Paid Invoices
                </span>
                <span className="stat-value">{greenCount}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">
                  <IconClock size={16} color="#f59e0b" /> In Review (Pending)
                </span>
                <span className="stat-value">{yellowCount + blueCount}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">
                  <IconAlert size={16} color="#ef4444" /> Overdue
                </span>
                <span className="stat-value" style={{ color: '#ef4444' }}>{redCount}</span>
              </div>
            </div>
          </div>

          {/* Attention Required Card */}
          <div className="panel-card side-card attention-card">
            <div className="attention-header">
              <IconAlert size={18} color="#ef4444" />
              <h3>Attention Required</h3>
            </div>

            {overdueInvoices.length === 0 ? (
              <p className="attention-empty">No overdue invoices requiring attention.</p>
            ) : (
              <div className="attention-list">
                {overdueInvoices.slice(0, 3).map((inv) => (
                  <div
                    key={inv.id}
                    className="attention-item"
                    onClick={() => onSelectReceipt(inv)}
                  >
                    <div className="attention-item-title">
                      {inv.property_name}
                    </div>
                    <div className="attention-item-sub">
                      {formatYen(Number(inv.total))} • Due {inv.deadline_due}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
