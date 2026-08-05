'use client';

import React from 'react';
import { InvoiceRecord } from '../types/invoice';
import { formatYen } from '../lib/urgency';
import { IconBank, IconDrive } from './Icons';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface AutoDebitLedgerProps {
  invoices: InvoiceRecord[];
}

export const AutoDebitLedger: React.FC<AutoDebitLedgerProps> = ({ invoices }) => {
  const autoDebitInvoices = invoices.filter(
    (inv) =>
      inv.status === 'Auto-Deducted' ||
      inv.status === 'Auto-Debited' ||
      inv.payment_method === 'Auto-Debit'
  );

  const totalAutoDebited = autoDebitInvoices.reduce(
    (sum, inv) => sum + (Number(inv.total) || 0),
    0
  );

  const totalManualPending = invoices
    .filter((inv) => inv.status === 'Pending')
    .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

  const totalPaidManual = invoices
    .filter((inv) => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

  const cashFlowChartData = [
    { name: 'Auto-Debit Deductions', amount: totalAutoDebited },
    { name: 'Manual Pending', amount: totalManualPending },
    { name: 'Settled Paid', amount: totalPaidManual },
  ];

  return (
    <div className="panel-card" style={{ marginTop: '1.5rem' }}>
      <div className="panel-header">
        <div>
          <h3>Auto-Debit Cash Flow Ledger</h3>
          <p className="panel-sub-text">Automated bank deductions vs manual outflow</p>
        </div>
      </div>

      <div className="kpi-grid3">
        <div className="kpi-card-sm border-purple">
          <div className="kpi-label">Bank Auto-Debits Total</div>
          <div className="kpi-num text-purple">{formatYen(totalAutoDebited)}</div>
          <div className="kpi-desc">{autoDebitInvoices.length} Auto Transactions</div>
        </div>

        <div className="kpi-card-sm border-amber">
          <div className="kpi-label">Pending Manual Outflow</div>
          <div className="kpi-num text-amber">{formatYen(totalManualPending)}</div>
          <div className="kpi-desc">Awaiting Checkbox Authorization</div>
        </div>

        <div className="kpi-card-sm border-teal">
          <div className="kpi-label">Total Settled Outflow</div>
          <div className="kpi-num text-teal">{formatYen(totalAutoDebited + totalPaidManual)}</div>
          <div className="kpi-desc">Auto-Debited + Paid Invoices</div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <h4 style={{ fontSize: '0.9rem', color: '#87a9b0', marginBottom: '0.85rem' }}>
          Automated Bank Deduction Transactions
        </h4>

        {autoDebitInvoices.length === 0 ? (
          <div className="empty-state">No auto-debit transactions recorded.</div>
        ) : (
          <div className="invoice-row-list">
            {autoDebitInvoices.map((inv) => (
              <div key={inv.id} className="invoice-card-row">
                <div className="invoice-status-circle purple">
                  <IconBank size={20} color="#c084fc" />
                </div>
                <div className="invoice-row-info">
                  <div className="invoice-row-title-bar">
                    <h4 className="invoice-title">{inv.property_name}</h4>
                    <span className="status-pill purple">Bank Auto-Deducted</span>
                  </div>
                  <div className="invoice-row-meta">
                    <span>{inv.billing_purpose}</span>
                    <span className="dot-divider">•</span>
                    <span>Date: {inv.deadline_due}</span>
                  </div>
                </div>
                <div className="invoice-row-right">
                  <div className="invoice-amount text-purple">{formatYen(Number(inv.total))}</div>
                  <div className="invoice-actions">
                    <span className="file-tag">{inv.filename || 'Direct Debit'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 180, width: '100%', marginTop: '1.75rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cashFlowChartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
            <XAxis dataKey="name" stroke="#87a9b0" fontSize={12} />
            <YAxis stroke="#87a9b0" fontSize={12} tickFormatter={(val) => `¥${val / 1000}k`} />
            <Tooltip
              formatter={(value: any) => [formatYen(Number(value)), 'Amount']}
              contentStyle={{
                backgroundColor: '#0d1e2e',
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: 6,
              }}
            />
            <Area type="monotone" dataKey="amount" stroke="#00d2b4" fill="rgba(0, 210, 180, 0.15)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
