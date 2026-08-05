'use client';

import React from 'react';
import { DashboardTab } from './Sidebar';

interface HeaderProps {
  activeTab: DashboardTab;
}

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'summary':
        return {
          title: 'Dashboard',
          subtitle: "Welcome back. Here's your financial ledger overview.",
        };
      case 'invoices':
        return {
          title: 'Invoices',
          subtitle: 'Manage your billing, payment history, and document receipts.',
        };
      case 'unassigned':
        return {
          title: 'Unassigned Properties',
          subtitle: 'Batch assign masterlist property IDs to unlinked invoice records.',
        };
      case 'analysis':
        return {
          title: 'Financial Analysis',
          subtitle: 'Analyze expense distribution, billing purpose costs, and high-cost alerts.',
        };
      default:
        return {
          title: 'Dashboard',
          subtitle: "Welcome back. Here's your portal overview.",
        };
    }
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <header className="top-header">
      <div className="header-text-group">
        <h1>{title}</h1>
        <p className="header-subtitle">{subtitle}</p>
      </div>
    </header>
  );
};
