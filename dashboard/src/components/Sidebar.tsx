'use client';

import React, { useState } from 'react';
import {
  IconDashboard,
  IconInvoices,
  IconUnassigned,
  IconAnalysis,
  IconCollapse,
  IconExpand,
} from './Icons';

export type DashboardTab = 'summary' | 'invoices' | 'unassigned' | 'analysis';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  unassignedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  unassignedCount,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d2b4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        {!isCollapsed && (
          <div className="brand-text">
            <h2>InvoiceLedger</h2>
            <span>Financial Portal</span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <button
          className={`sidebar-link ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => onTabChange('summary')}
          title="Dashboard Overview"
        >
          <span className="sidebar-icon">
            <IconDashboard color={activeTab === 'summary' ? '#00d2b4' : 'currentColor'} />
          </span>
          {!isCollapsed && <span className="sidebar-label">Dashboard</span>}
        </button>

        <button
          className={`sidebar-link ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => onTabChange('invoices')}
          title="Invoices & Billing History"
        >
          <span className="sidebar-icon">
            <IconInvoices color={activeTab === 'invoices' ? '#00d2b4' : 'currentColor'} />
          </span>
          {!isCollapsed && <span className="sidebar-label">Invoices</span>}
        </button>

        <button
          className={`sidebar-link ${activeTab === 'unassigned' ? 'active' : ''}`}
          onClick={() => onTabChange('unassigned')}
          title="Unassigned Properties"
        >
          <span className="sidebar-icon">
            <IconUnassigned color={activeTab === 'unassigned' ? '#ef4444' : 'currentColor'} />
          </span>
          {!isCollapsed && (
            <>
              <span className="sidebar-label">Unassigned</span>
              {unassignedCount > 0 && (
                <span className="sidebar-badge">{unassignedCount}</span>
              )}
            </>
          )}
        </button>

        <button
          className={`sidebar-link ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => onTabChange('analysis')}
          title="Financial Analysis"
        >
          <span className="sidebar-icon">
            <IconAnalysis color={activeTab === 'analysis' ? '#00d2b4' : 'currentColor'} />
          </span>
          {!isCollapsed && <span className="sidebar-label">Analysis</span>}
        </button>
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="sidebar-footer">
        <button
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <span className="sidebar-icon">
            {isCollapsed ? <IconExpand /> : <IconCollapse />}
          </span>
          {!isCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
};
