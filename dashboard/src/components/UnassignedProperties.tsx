'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { InvoiceRecord, getGoogleDriveFileUrl } from '../types/invoice';
import { MasterlistOption, updateInvoicePropertyId } from '../lib/supabase';
import { calculateUrgency, formatYen } from '../lib/urgency';
import { IconDrive, IconAlert, IconCheck } from './Icons';

const ROWS_PER_PAGE = 15;

interface UnassignedPropertiesProps {
  invoices: InvoiceRecord[];
  masterlistOptions: MasterlistOption[]; // Passed from page.tsx via fetchMasterlist()
  onPropertyAssigned: (invoiceId: string, newPropertyId: string) => void;
  onSelectReceipt: (invoice: InvoiceRecord) => void;
}

export const UnassignedProperties: React.FC<UnassignedPropertiesProps> = ({
  invoices,
  masterlistOptions,
  onPropertyAssigned,
  onSelectReceipt,
}) => {
  // --- selection state ---
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  // --- assignment state ---
  const [batchPropertyId, setBatchPropertyId] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // --- searchable masterlist picker state ---
  const [masterSearch, setMasterSearch] = useState('');
  const [showMasterlist, setShowMasterlist] = useState(false);
  const [selectedMasterProperty, setSelectedMasterProperty] = useState<MasterlistOption | null>(null);

  // --- pagination state ---
  const [currentPage, setCurrentPage] = useState(1);

  // --- ref for click-outside ---
  const pickerRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Derived: unassigned invoices (memoized)
  // ---------------------------------------------------------------------------
  const unassignedInvoices = useMemo(() => {
    return invoices.filter(
      (inv) =>
        inv.is_unassigned ||
        inv.property_id === 'Unassigned' ||
        !inv.property_id ||
        inv.property_id === 'null'
    );
  }, [invoices]);

  // Reset page when list changes length
  useEffect(() => {
    setCurrentPage(1);
  }, [unassignedInvoices.length]);

  // ---------------------------------------------------------------------------
  // Pagination
  // ---------------------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(unassignedInvoices.length / ROWS_PER_PAGE));

  const paginatedUnassigned = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return unassignedInvoices.slice(start, start + ROWS_PER_PAGE);
  }, [unassignedInvoices, currentPage]);

  // ---------------------------------------------------------------------------
  // Filtered masterlist for picker (memoized)
  // ---------------------------------------------------------------------------
  const filteredMasterlist = useMemo(() => {
    const term = masterSearch.toLowerCase().trim();
    if (!term) return masterlistOptions.slice(0, 30);
    return masterlistOptions
      .filter(
        (opt) =>
          opt.name.toLowerCase().includes(term) ||
          (opt.bldg && opt.bldg.toLowerCase().includes(term)) ||
          (opt.room && String(opt.room).toLowerCase().includes(term)) ||
          (opt.address && opt.address.toLowerCase().includes(term)) ||
          opt.id.toLowerCase().includes(term)
      )
      .slice(0, 30);
  }, [masterlistOptions, masterSearch]);

  // ---------------------------------------------------------------------------
  // Click-outside handler to close the dropdown
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowMasterlist(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---------------------------------------------------------------------------
  // Selection helpers
  // ---------------------------------------------------------------------------
  const isAllSelected =
    unassignedInvoices.length > 0 && selectedInvoiceIds.size === unassignedInvoices.length;

  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(unassignedInvoices.map((inv) => inv.id)));
    }
  }, [isAllSelected, unassignedInvoices]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Batch assign handler
  // ---------------------------------------------------------------------------
  const handleBatchAssign = useCallback(async () => {
    if (selectedInvoiceIds.size === 0) {
      alert('Please select at least one row.');
      return;
    }
    if (!batchPropertyId) {
      alert('Please select a property from the masterlist.');
      return;
    }

    let successCount = 0;
    for (const id of Array.from(selectedInvoiceIds)) {
      const success = await updateInvoicePropertyId(id, batchPropertyId);
      if (success) {
        onPropertyAssigned(id, batchPropertyId);
        successCount++;
      }
    }

    setFeedbackMsg(
      `Assigned "${selectedMasterProperty?.name || batchPropertyId}" to ${successCount} invoice(s).`
    );
    setSelectedInvoiceIds(new Set());
    setSelectedMasterProperty(null);
    setBatchPropertyId('');
    setTimeout(() => setFeedbackMsg(null), 4000);
  }, [selectedInvoiceIds, batchPropertyId, selectedMasterProperty, onPropertyAssigned]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h3>Unassigned Properties</h3>
          <p className="panel-sub-text">
            {unassignedInvoices.length} invoices with unassigned Property IDs
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="alert-banner success">
          <IconCheck size={18} color="#00d2b4" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Assignment Control Bar                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="assignment-bar">
        <div className="assignment-inputs">
          {/* Searchable masterlist picker */}
          <div ref={pickerRef} style={{ position: 'relative', flex: 1, minWidth: 280 }}>
            {/* Selected property badge */}
            {selectedMasterProperty ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                }}
              >
                <span className="status-pill blue">{selectedMasterProperty.name}</span>
                <button
                  className="btn-nav"
                  onClick={() => {
                    setSelectedMasterProperty(null);
                    setBatchPropertyId('');
                    setMasterSearch('');
                  }}
                >
                  Clear
                </button>
              </div>
            ) : null}

            {/* Search input */}
            <input
              type="text"
              placeholder="Search by building, room, address..."
              className="input-control"
              value={masterSearch}
              onFocus={() => setShowMasterlist(true)}
              onChange={(e) => {
                setMasterSearch(e.target.value);
                setShowMasterlist(true);
              }}
            />

            {/* Dropdown results */}
            {showMasterlist && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 999,
                  background: '#0d1b27',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  marginTop: '4px',
                }}
              >
                {filteredMasterlist.length === 0 ? (
                  <div
                    style={{
                      padding: '1rem',
                      color: 'var(--text-muted)',
                      fontSize: '0.875rem',
                    }}
                  >
                    No properties found
                  </div>
                ) : (
                  filteredMasterlist.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => {
                        setSelectedMasterProperty(opt);
                        setBatchPropertyId(opt.id);
                        setMasterSearch('');
                        setShowMasterlist(false);
                      }}
                      style={{
                        padding: '0.6rem 1rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                      className="masterlist-option-row"
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {opt.name}
                      </div>
                      {opt.address && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {opt.address}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <button
          className="btn-primary-action"
          onClick={handleBatchAssign}
          disabled={unassignedInvoices.length === 0}
        >
          Assign Selected ({selectedInvoiceIds.size})
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Unassigned Invoice List                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="invoice-row-list">
        {unassignedInvoices.length === 0 ? (
          <div className="empty-state">
            All invoices are fully assigned to valid Property IDs.
          </div>
        ) : (
          <>
            {/* Select-all row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.5rem 1rem',
                gap: '0.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
              }}
            >
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleToggleSelectAll}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span>
                {isAllSelected
                  ? `All ${unassignedInvoices.length} selected`
                  : `Select all ${unassignedInvoices.length}`}
              </span>
            </div>

            {/* Invoice rows (paginated) */}
            {paginatedUnassigned.map((inv) => {
              const isSelected = selectedInvoiceIds.has(inv.id);
              const { badgeLabel, tier } = calculateUrgency(inv);
              const driveUrl = getGoogleDriveFileUrl(inv.fileID);
              const rawUnit =
                typeof inv.raw_json === 'object' ? inv.raw_json?.property_unit_id : '';

              let badgeClass = 'grey';
              if (tier === 'GREEN') badgeClass = 'green';
              else if (tier === 'RED') badgeClass = 'red';
              else if (tier === 'YELLOW') badgeClass = 'yellow';

              return (
                <div
                  key={inv.id}
                  className={`invoice-card-row ${isSelected ? 'selected-row' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', paddingRight: '0.75rem' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(inv.id)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </div>

                  <div className="invoice-status-circle red">
                    <IconAlert size={20} color="#ef4444" />
                  </div>

                  <div className="invoice-row-info">
                    <div className="invoice-row-title-bar">
                      <h4 className="invoice-title">{inv.filename || 'Invoice Document'}</h4>
                      <span className={`status-pill ${badgeClass}`}>{badgeLabel}</span>
                      <span className="unit-tag">Gemini Unit: {rawUnit || 'N/A'}</span>
                    </div>

                    <div className="invoice-row-meta">
                      <span>Invoice #{inv.id}</span>
                      <span className="dot-divider">•</span>
                      <span>Due: {inv.deadline_due}</span>
                    </div>
                  </div>

                  <div className="invoice-row-right">
                    <div className="invoice-amount">{formatYen(Number(inv.total))}</div>
                    <div className="invoice-actions">
                      <button className="btn-action" onClick={() => onSelectReceipt(inv)}>
                        Inspect Receipt
                      </button>
                      {inv.fileID && (
                        <a
                          href={driveUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-drive-link"
                        >
                          <IconDrive size={14} /> Drive
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination controls                                                 */}
      {/* ------------------------------------------------------------------ */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <span>
            Showing{' '}
            {Math.min((currentPage - 1) * ROWS_PER_PAGE + 1, unassignedInvoices.length)}–
            {Math.min(currentPage * ROWS_PER_PAGE, unassignedInvoices.length)} of{' '}
            {unassignedInvoices.length}
          </span>
          <div className="pagination-buttons">
            <button
              className="btn-nav"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn-nav"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
