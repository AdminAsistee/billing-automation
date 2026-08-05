'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InvoiceRecord, StatusFilterOption } from '../types/invoice';
import {
  fetchInvoices,
  fetchMasterlist,
  updateInvoiceStatus,
  MasterlistOption,
} from '../lib/supabase';
import { Sidebar, DashboardTab } from '../components/Sidebar';
import { Header } from '../components/Header';
import { UrgencyTimeline } from '../components/UrgencyTimeline';
import { AutoDebitLedger } from '../components/AutoDebitLedger';
import { ActionCenter } from '../components/ActionCenter';
import { UnassignedProperties } from '../components/UnassignedProperties';
import { FinancialAnalysis } from '../components/FinancialAnalysis';
import { ReceiptModal } from '../components/ReceiptModal';

export default function Home() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [masterlistOptions, setMasterlistOptions] = useState<MasterlistOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('summary');
  const [tableFilter, setTableFilter] = useState<StatusFilterOption>('ALL');
  const [summaryDateScope, setSummaryDateScope] = useState<'quarter' | 'last_quarter' | '6months' | 'year' | 'all'>('quarter');
  const [selectedReceiptInvoice, setSelectedReceiptInvoice] = useState<InvoiceRecord | null>(null);

  // Memoized date filtered invoices for the landing summary tab
  const summaryFilteredInvoices = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    let start: Date | null = null;
    let end: Date | null = null;

    if (summaryDateScope === 'quarter') {
      const q = Math.floor(month / 3);
      start = new Date(year, q * 3, 1);
      end = new Date(year, (q * 3) + 3, 0, 23, 59, 59, 999);
    } else if (summaryDateScope === 'last_quarter') {
      let q = Math.floor(month / 3) - 1;
      let y = year;
      if (q < 0) {
        q = 3;
        y -= 1;
      }
      start = new Date(y, q * 3, 1);
      end = new Date(y, (q * 3) + 3, 0, 23, 59, 59, 999);
    } else if (summaryDateScope === '6months') {
      start = new Date(now);
      start.setMonth(now.getMonth() - 6);
      end = now;
    } else if (summaryDateScope === 'year') {
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    if (!start || !end) return invoices;

    return invoices.filter((inv) => {
      const date = new Date(inv.deadline_due || inv.created_at);
      return date >= start! && date <= end!;
    });
  }, [invoices, summaryDateScope]);

  // Single-mount fetch: invoices + masterlist in parallel
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        // 1. Fetch masterlist first to populate the lookup map in memory
        const masterlist = await fetchMasterlist();
        
        // 2. Fetch and normalize invoices
        const invoiceResult = await fetchInvoices();

        if (!isMounted) return;

        if (invoiceResult.error) {
          setConnectionError(invoiceResult.error);
        } else {
          setConnectionError(null);
        }

        setInvoices(invoiceResult.data);
        setMasterlistOptions(masterlist);
      } catch (err: any) {
        console.error('[Page] Data load exception:', err);
        if (isMounted) {
          setConnectionError(`Unexpected error: ${err?.message || 'Unknown'}`);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Optimistic status toggle
  const handleToggleStatus = useCallback(async (id: string, currentStatus: string) => {
    const isCurrentlyPaid = currentStatus === 'Paid';
    const newStatus: 'Pending' | 'Paid' = isCurrentlyPaid ? 'Pending' : 'Paid';

    // Optimistic UI update
    setInvoices((prev) =>
      prev.map((inv) => inv.id === id ? { ...inv, status: newStatus as any } : inv)
    );

    const success = await updateInvoiceStatus(id, newStatus);
    if (!success) {
      // Revert on failure
      setInvoices((prev) =>
        prev.map((inv) => inv.id === id ? { ...inv, status: currentStatus as any } : inv)
      );
    }
  }, []);

  // Filter shortcut from urgency metric cards
  const handleTimelineFilterSelect = useCallback((filter: StatusFilterOption) => {
    setTableFilter(filter);
    setActiveTab('invoices');
  }, []);

  // Unassigned count memoized
  const unassignedCount = useMemo(() => {
    return invoices.filter(
      (inv) => inv.is_unassigned || inv.property_id === 'Unassigned' || !inv.property_id || inv.property_id === 'null'
    ).length;
  }, [invoices]);

  // Property assignment handler — optimistic local update
  const handlePropertyAssigned = useCallback((invoiceId: string, newPropertyId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, property_id: newPropertyId, is_unassigned: false }
          : inv
      )
    );
  }, []);

  return (
    <div className="layout-shell">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unassignedCount={unassignedCount}
      />

      <main className="content-area">
        <Header activeTab={activeTab} />

        {/* Supabase connection error banner */}
        {connectionError && !loading && (
          <div
            style={{
              margin: '1rem 1.5rem 0',
              padding: '0.85rem 1.25rem',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '8px',
              color: '#fca5a5',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ fontWeight: 600 }}>Connection Error:</span>
            <span>{connectionError}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.7 }}>
              Check your .env.local file and Supabase project settings.
            </span>
          </div>
        )}

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Connecting to Financial Ledger...</p>
          </div>
        ) : (
          <div className="tab-content">
            {activeTab === 'summary' && (
              <>
                <UrgencyTimeline
                  invoices={summaryFilteredInvoices}
                  dateScope={summaryDateScope}
                  onDateScopeChange={setSummaryDateScope}
                  onSelectFilter={handleTimelineFilterSelect}
                  onSelectReceipt={setSelectedReceiptInvoice}
                />
                <AutoDebitLedger invoices={summaryFilteredInvoices} />
              </>
            )}

            {activeTab === 'invoices' && (
              <ActionCenter
                invoices={invoices}
                onToggleStatus={handleToggleStatus}
                onSelectReceipt={setSelectedReceiptInvoice}
                activeFilter={tableFilter}
                onFilterChange={setTableFilter}
              />
            )}

            {activeTab === 'unassigned' && (
              <UnassignedProperties
                invoices={invoices}
                masterlistOptions={masterlistOptions}
                onPropertyAssigned={handlePropertyAssigned}
                onSelectReceipt={setSelectedReceiptInvoice}
              />
            )}

            {activeTab === 'analysis' && (
              <FinancialAnalysis
                invoices={invoices}
                onNavigateToInvoice={setSelectedReceiptInvoice}
              />
            )}
          </div>
        )}
      </main>

      <ReceiptModal
        invoice={selectedReceiptInvoice}
        onClose={() => setSelectedReceiptInvoice(null)}
      />
    </div>
  );
}
