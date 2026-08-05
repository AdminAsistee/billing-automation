'use client';

import React from 'react';

interface AgentCapabilitiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AgentCapabilitiesPanel: React.FC<AgentCapabilitiesPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>
            🤖 Agent Template & Model Capabilities Definition
          </h2>
          <button className="btn btn-secondary" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Agent Identity */}
          <div className="glass-card" style={{ background: 'rgba(99, 102, 241, 0.08)', borderColor: 'var(--border-color-glow)' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
              Financial Invoice & Supabase Ledger Agent (`financial_invoice_agent_v1`)
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Autonomous pair-programming agent configured to handle property financial invoice ingestion, status updates, priority deadline evaluation, and Supabase ledger tracking.
            </p>
          </div>

          {/* Model Skills */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              ⚡ Registered Agent Skills
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--color-yellow)' }}>1. invoice_data_ingest</strong>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Parses raw OCR JSON and maps payload into Supabase <code style={{ color: '#fff' }}>invoice_data</code> table columns.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--color-red)' }}>2. urgency_priority_evaluator</strong>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Evaluates deadline difference and color-codes priority (Red, Yellow, Blue, Green, Grey).
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <strong style={{ color: 'var(--color-green)' }}>3. status_mutation_engine</strong>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Executes optimistic state mutations (<code style={{ color: '#fff' }}>PENDING</code> $\leftrightarrow$ <code style={{ color: '#fff' }}>PAID</code>) with audit timestamps.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.85rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <strong style={{ color: '#c084fc' }}>4. auto_debit_ledger_tracker</strong>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Tracks bank auto-deductions and calculates net cash flow obligations via Recharts.
                </p>
              </div>
            </div>
          </div>

          {/* Model Limits & Operational Rules */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: 'var(--color-red)' }}>
              🛡️ Model Limits & Operational Boundaries
            </h3>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Schema Strictness:</strong> Mandatory compliance with Supabase schema (<code style={{ color: '#fff' }}>id</code>, <code style={{ color: '#fff' }}>created_at</code>, <code style={{ color: '#fff' }}>property_id</code>, <code style={{ color: '#fff' }}>billing_purpose</code>, <code style={{ color: '#fff' }}>total</code>, <code style={{ color: '#fff' }}>deadline_due</code>, <code style={{ color: '#fff' }}>status</code>, <code style={{ color: '#fff' }}>payment_method</code>, <code style={{ color: '#fff' }}>fileID</code>, <code style={{ color: '#fff' }}>filename</code>, <code style={{ color: '#fff' }}>raw_json</code>).</li>
              <li><strong>Financial Precision:</strong> All currency totals are held as exact integer JPY amounts without floating point roundoff errors.</li>
              <li><strong>Manual Override:</strong> Status mutations require user checkbox authorization or verified payment gateway webhooks.</li>
              <li><strong>Offline Sandbox Mode:</strong> Automatic fallback to deterministic local mock store when Supabase network credentials are absent.</li>
            </ul>
          </div>

          {/* Tech Stack Compliance */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Company Policy Tech Stack Verification
            </h4>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="status-pill blue">Next.js 16.2.3</span>
              <span className="status-pill green">React 19</span>
              <span className="status-pill yellow">TypeScript</span>
              <span className="status-pill purple">Recharts</span>
              <span className="status-pill grey">Vanilla CSS</span>
              <span className="status-pill red">Supabase Client</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
