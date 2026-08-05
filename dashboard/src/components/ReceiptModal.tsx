'use client';

import React from 'react';
import { InvoiceRecord, getGoogleDriveFileUrl } from '../types/invoice';
import { formatYen } from '../lib/urgency';
import { IconDrive } from './Icons';

interface ReceiptModalProps {
  invoice: InvoiceRecord | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const driveUrl = getGoogleDriveFileUrl(invoice.fileID);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invoice Receipt</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="receipt-summary-box">
            <div className="summary-row">
              <span className="summary-label">Property</span>
              <span className="summary-val">{invoice.property_name}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Property Database ID</span>
              <span className="summary-val" style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#87a9b0' }}>
                {invoice.property_id}
              </span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Full Address</span>
              <span className="summary-val">{invoice.full_address || 'N/A'}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Billing Purpose</span>
              <span className="summary-val">{invoice.billing_purpose}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Total Amount</span>
              <span className="summary-val text-teal">{formatYen(Number(invoice.total))}</span>
            </div>
              <div className="summary-row">
              <span className="summary-label">Deadline Due</span>
              <span className="summary-val">{invoice.deadline_due}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Payment Method</span>
              <span className="summary-val">{invoice.payment_method}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Status</span>
              <span className="summary-val">{invoice.status}</span>
            </div>
          </div>

          {/* Drive Preview Link */}
          {invoice.fileID && (
            <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-drive-link-lg"
              >
                <IconDrive size={18} /> View Document on Google Drive
              </a>
            </div>
          )}

          {/* Gemini Results Payload */}
          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: '#87a9b0', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Gemini Results
            </h4>
            <pre className="json-viewer">
              {JSON.stringify(invoice.raw_json, null, 2)}
            </pre>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-action" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
