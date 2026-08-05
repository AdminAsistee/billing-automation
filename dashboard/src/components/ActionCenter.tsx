'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { InvoiceRecord, StatusFilterOption, getGoogleDriveFileUrl } from '../types/invoice';
import { calculateUrgency, formatYen } from '../lib/urgency';
import { IconCheck, IconClock, IconAlert, IconDrive, IconFolder, IconBank } from './Icons';

export type ExtendedDateRangeOption =
  | 'ALL'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | '3MONTHS'
  | '6MONTHS'
  | 'THIS_YEAR';

interface ActionCenterProps {
  invoices: InvoiceRecord[];
  onToggleStatus: (id: string, currentStatus: string) => void;
  onSelectReceipt: (invoice: InvoiceRecord) => void;
  activeFilter: StatusFilterOption;
  onFilterChange: (filter: StatusFilterOption) => void;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({
  invoices,
  onToggleStatus,
  onSelectReceipt,
  activeFilter,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<ExtendedDateRangeOption>('ALL');
  // Fix 6: rowsPerPage is always a number — no more 'ALL' union type
  const [rowsPerPage, setRowsPerPage] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Fix 8: sort state
  const [sortBy, setSortBy] = useState<'deadline' | 'amount_desc' | 'amount_asc' | 'property'>('deadline');

  // Fix 2: useEffect (not useMemo) for side-effect page reset
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, dateRange, searchTerm, rowsPerPage]);

  // Fix 3 + Fix 4: All pill counts computed inside the same useMemo as filteredInvoices,
  // scoped to the active date range (but not the active status filter).
  const {
    filteredInvoices,
    pendingCount,
    overdueCount,
    paidCount,
    archivedCount,
    autoDebitCount,
    dateScopedTotal,
  } = useMemo(() => {
    // Fix 1: Use live current date — no hardcoded refDate
    const refDate = new Date();

    /** Returns true when the invoice's date falls within the selected dateRange window */
    function matchesDateRange(inv: InvoiceRecord): boolean {
      const invDate = new Date(inv.deadline_due || inv.created_at);
      if (dateRange === 'THIS_WEEK') {
        const weekAgo = new Date(refDate);
        weekAgo.setDate(refDate.getDate() - 7);
        return invDate >= weekAgo && invDate <= refDate;
      } else if (dateRange === 'THIS_MONTH') {
        return (
          invDate.getMonth() === refDate.getMonth() &&
          invDate.getFullYear() === refDate.getFullYear()
        );
      } else if (dateRange === 'LAST_MONTH') {
        const lastMonth = refDate.getMonth() === 0 ? 11 : refDate.getMonth() - 1;
        const lastMonthYear =
          refDate.getMonth() === 0 ? refDate.getFullYear() - 1 : refDate.getFullYear();
        return invDate.getMonth() === lastMonth && invDate.getFullYear() === lastMonthYear;
      } else if (dateRange === '3MONTHS') {
        const threeMonthsAgo = new Date(refDate);
        threeMonthsAgo.setMonth(refDate.getMonth() - 3);
        return invDate >= threeMonthsAgo;
      } else if (dateRange === '6MONTHS') {
        const sixMonthsAgo = new Date(refDate);
        sixMonthsAgo.setMonth(refDate.getMonth() - 6);
        return invDate >= sixMonthsAgo;
      } else if (dateRange === 'THIS_YEAR') {
        return invDate.getFullYear() === refDate.getFullYear();
      }
      return true; // 'ALL'
    }

    // Date-scoped set (used for pill counts — not status-filtered)
    const dateScoped = invoices.filter(matchesDateRange);

    // Compute pill counts from date-scoped (not status-filtered) set
    let _pendingCount = 0;
    let _overdueCount = 0;
    let _paidCount = 0;
    let _archivedCount = 0;
    let _autoDebitCount = 0;

    dateScoped.forEach((inv) => {
      const { tier } = calculateUrgency(inv);
      const isAutoDebit =
        inv.status === 'Auto-Deducted' ||
        inv.status === 'Auto-Debited' ||
        inv.payment_method === 'Auto-Debit';

      if (isAutoDebit) {
        _autoDebitCount++;
      } else if (tier === 'GREEN') {
        _paidCount++;
      } else if (tier === 'GREY') {
        _archivedCount++;
      } else if (tier === 'RED') {
        _overdueCount++;
        _pendingCount++;
      } else {
        _pendingCount++;
      }
    });

    // Fix 7: Expanded search — also matches status, payment_method, total
    const term = searchTerm.toLowerCase().trim();

    function matchesSearch(inv: InvoiceRecord): boolean {
      if (term === '') return true;
      return (
        inv.property_name.toLowerCase().includes(term) ||
        (inv.full_address != null && inv.full_address.toLowerCase().includes(term)) ||
        inv.billing_purpose.toLowerCase().includes(term) ||
        (inv.filename != null && inv.filename.toLowerCase().includes(term)) ||
        inv.status.toLowerCase().includes(term) ||
        inv.payment_method.toLowerCase().includes(term) ||
        String(inv.total).includes(term)
      );
    }

    // Status-filtered + date-scoped + search-filtered set (displayed list)
    const filtered = dateScoped.filter((inv) => {
      const { tier } = calculateUrgency(inv);
      const isAutoDebit =
        inv.status === 'Auto-Deducted' ||
        inv.status === 'Auto-Debited' ||
        inv.payment_method === 'Auto-Debit';

      let matchesStatus = true;
      if (activeFilter === 'PENDING') {
        matchesStatus = inv.status === 'Pending';
      } else if (activeFilter === 'PAID') {
        matchesStatus = tier === 'GREEN';
      } else if (activeFilter === 'AUTO_DEBITED') {
        matchesStatus = isAutoDebit;
      } else if (activeFilter === 'OVERDUE') {
        matchesStatus = inv.status === 'Pending' && tier === 'RED';
      } else if (activeFilter === 'ARCHIVED') {
        matchesStatus = tier === 'GREY';
      }

      return matchesStatus && matchesSearch(inv);
    });

    return {
      filteredInvoices: filtered,
      pendingCount: _pendingCount,
      overdueCount: _overdueCount,
      paidCount: _paidCount,
      archivedCount: _archivedCount,
      autoDebitCount: _autoDebitCount,
      dateScopedTotal: dateScoped.length,
    };
  }, [invoices, activeFilter, dateRange, searchTerm]);

  // Fix 8: Apply sort to filteredInvoices before pagination
  const sortedInvoices = useMemo(() => {
    const copy = [...filteredInvoices];
    if (sortBy === 'deadline') {
      copy.sort(
        (a, b) =>
          new Date(a.deadline_due).getTime() - new Date(b.deadline_due).getTime()
      );
    } else if (sortBy === 'amount_desc') {
      copy.sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
    } else if (sortBy === 'amount_asc') {
      copy.sort((a, b) => (Number(a.total) || 0) - (Number(b.total) || 0));
    } else if (sortBy === 'property') {
      copy.sort((a, b) => a.property_name.localeCompare(b.property_name));
    }
    return copy;
  }, [filteredInvoices, sortBy]);

  const currentTotalAmount = useMemo(() => {
    return sortedInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  }, [sortedInvoices]);

  const totalRows = sortedInvoices.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedInvoices.slice(start, start + rowsPerPage);
  }, [sortedInvoices, currentPage, rowsPerPage]);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h3>Invoices</h3>
          <p className="panel-sub-text">
            {filteredInvoices.length} invoices found &bull; Total: {formatYen(currentTotalAmount)}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar">
        <div className="filter-pills">
          {/* Fix 3: 'All' pill shows date-scoped count (not total unscoped) */}
          <button
            className={`filter-pill ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => onFilterChange('ALL')}
          >
            All ({dateScopedTotal})
          </button>
          <button
            className={`filter-pill ${activeFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => onFilterChange('PENDING')}
          >
            Pending ({pendingCount})
          </button>
          {/* Fix 4: No inline calculateUrgency calls — counts come from memoized values */}
          <button
            className={`filter-pill ${activeFilter === 'OVERDUE' ? 'active' : ''}`}
            onClick={() => onFilterChange('OVERDUE')}
          >
            Overdue ({overdueCount})
          </button>
          <button
            className={`filter-pill ${activeFilter === 'PAID' ? 'active' : ''}`}
            onClick={() => onFilterChange('PAID')}
          >
            Paid ({paidCount})
          </button>
          <button
            className={`filter-pill ${activeFilter === 'AUTO_DEBITED' ? 'active' : ''}`}
            onClick={() => onFilterChange('AUTO_DEBITED')}
          >
            Auto-Debited ({autoDebitCount})
          </button>
          <button
            className={`filter-pill ${activeFilter === 'ARCHIVED' ? 'active' : ''}`}
            onClick={() => onFilterChange('ARCHIVED')}
          >
            Archived ({archivedCount})
          </button>
        </div>

        {/* Date Range, Sort & Search Controls */}
        <div className="controls-group">
          <select
            className="select-control"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as ExtendedDateRangeOption)}
          >
            <option value="ALL">All Time</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="3MONTHS">Last 3 Months</option>
            <option value="6MONTHS">Last 6 Months</option>
            <option value="THIS_YEAR">This Year</option>
          </select>

          {/* Fix 8: Sort control */}
          <select
            className="select-control"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'deadline' | 'amount_desc' | 'amount_asc' | 'property')}
          >
            <option value="deadline">Nearest Deadline</option>
            <option value="amount_desc">Amount (High to Low)</option>
            <option value="amount_asc">Amount (Low to High)</option>
            <option value="property">Property A-Z</option>
          </select>

          {/* Fix 6: No 'Show All' option — max 50 */}
          <select
            className="select-control"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={15}>15 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>

          <input
            type="text"
            placeholder="Search property, status, amount..."
            className="input-control"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Invoice Row Cards List */}
      <div className="invoice-row-list">
        {paginatedInvoices.length === 0 ? (
          <div className="empty-state">No matching invoice records found.</div>
        ) : (
          paginatedInvoices.map((inv) => {
            const { tier, badgeLabel } = calculateUrgency(inv);
            const isPaid = inv.status === 'Paid';
            const isAutoDebit =
              inv.status === 'Auto-Deducted' ||
              inv.status === 'Auto-Debited' ||
              inv.payment_method === 'Auto-Debit';

            let badgeClass = 'grey';
            let IconComponent = IconClock;
            let iconColor = '#87a9b0';

            if (tier === 'GREEN') {
              badgeClass = 'green';
              IconComponent = IconCheck;
              iconColor = '#00d2b4';
            } else if (isAutoDebit) {
              badgeClass = 'purple';
              IconComponent = IconBank;
              iconColor = '#c084fc';
            } else if (tier === 'RED') {
              badgeClass = 'red';
              IconComponent = IconAlert;
              iconColor = '#ef4444';
            } else if (tier === 'YELLOW') {
              badgeClass = 'yellow';
              IconComponent = IconClock;
              iconColor = '#f59e0b';
            } else if (tier === 'BLUE') {
              badgeClass = 'blue';
              IconComponent = IconClock;
              iconColor = '#3b82f6';
            }

            const driveUrl = getGoogleDriveFileUrl(inv.fileID);

            return (
              <div key={inv.id} className="invoice-card-row">
                {/* Left Circle Icon Badge */}
                <div className={`invoice-status-circle ${badgeClass}`}>
                  <IconComponent size={20} color={iconColor} />
                </div>

                {/* Main Row Info */}
                <div className="invoice-row-info">
                  <div className="invoice-row-title-bar">
                    <h4 className="invoice-title">{inv.property_name}</h4>
                    <span className={`status-pill ${badgeClass}`}>{badgeLabel}</span>

                    {!isAutoDebit && inv.status !== 'Archived' && (
                      <label className="paid-checkbox-label" title="Toggle Paid Status">
                        <input
                          type="checkbox"
                          checked={isPaid}
                          onChange={() => onToggleStatus(inv.id, inv.status)}
                        />
                        <span>{isPaid ? 'Paid' : 'Mark Paid'}</span>
                      </label>
                    )}
                  </div>

                  {/* Fix 5: Show billing_purpose AND full_address (both) */}
                  <div className="invoice-row-meta">
                    <span>{inv.billing_purpose}</span>
                    {inv.full_address && (
                      <>
                        <span className="dot-divider">&bull;</span>
                        <span>{inv.full_address}</span>
                      </>
                    )}
                    <span className="dot-divider">&bull;</span>
                    <span>Due: {inv.deadline_due}</span>
                  </div>
                </div>

                {/* Right Amount & Link */}
                <div className="invoice-row-right">
                  <div className="invoice-amount">{formatYen(Number(inv.total))}</div>
                  <div className="invoice-actions">
                    <button
                      className="btn-action"
                      onClick={() => onSelectReceipt(inv)}
                    >
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
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <span>
            Showing {Math.min((currentPage - 1) * rowsPerPage + 1, totalRows)} to{' '}
            {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows} records
          </span>

          <div className="pagination-buttons">
            <button
              className="btn-nav"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn-nav"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
