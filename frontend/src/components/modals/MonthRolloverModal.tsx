import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Building, 
  CreditCard, 
  Smartphone, 
  RotateCcw,
  FileText
} from 'lucide-react';
import { BRANCHES } from '../../context/LaundryContext';
import { BranchName, MonthlyRollover } from '../../types/laundry';

interface MonthRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthKey: string;     // e.g. "2026-10"
  monthName: string;    // e.g. "October 2026"
  totalIntake: number;
  counterTotal: number;
  eftTotal: number;
  ordersCount: number;
  branchBreakdown: Record<BranchName, {
    totalRevenue: number;
    counterRevenue: number;
    eftRevenue: number;
    ordersCount: number;
  }>;
  onConfirmRollover: (rolloverData: Omit<MonthlyRollover, 'id' | 'closedAt'>) => Promise<boolean>;
}

export const MonthRolloverModal: React.FC<MonthRolloverModalProps> = ({
  isOpen,
  onClose,
  monthKey,
  monthName,
  totalIntake,
  counterTotal,
  eftTotal,
  ordersCount,
  branchBreakdown,
  onConfirmRollover
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const success = await onConfirmRollover({
      monthKey,
      monthName,
      closedBy: 'Mpho (Owner)',
      totalIntake,
      counterTotal,
      eftTotal,
      ordersCount,
      branchBreakdown,
      notes: notes.trim() || undefined
    });
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RotateCcw size={22} className="text-primary" />
            <div>
              <h3 style={{ margin: 0 }}>End of Month Rollover & Reconciliation</h3>
              <span style={{ fontSize: '12px', color: 'var(--brand-accent)' }}>
                Finalize & Archive {monthName} — Start Next Month Afresh
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        {/* Warning / Explanation Banner */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px', marginBottom: '20px', fontSize: '13px', color: '#1e40af', lineHeight: '1.5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
            <Calendar size={16} /> Monthly Financial Audit & Statistics Rollover
          </div>
          Rolling over will snapshot and archive all financial records for <strong>{monthName}</strong>. Active daily stats will start afresh from Day 1 for the upcoming month at <strong>R0.00</strong>. You can switch back to view this archived month at any time using the Month Selector.
        </div>

        {/* Month Financial Summary Card */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Financial Period</span>
              <h3 style={{ margin: '2px 0 0 0', color: 'var(--brand-primary)' }}>{monthName}</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{ordersCount} total orders processed</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Month Intake</span>
              <h2 style={{ margin: '2px 0 0 0', color: 'var(--success)' }}>R{totalIntake.toFixed(2)}</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                <CreditCard size={14} /> Paid on Counter (POS/Cash)
              </div>
              <strong style={{ fontSize: '16px', display: 'block', marginTop: '4px', color: '#065f46' }}>
                R{counterTotal.toFixed(2)}
              </strong>
            </div>

            <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#1d4ed8', fontWeight: 600 }}>
                <Smartphone size={14} /> EFT & PayShap (Nedbank)
              </div>
              <strong style={{ fontSize: '16px', display: 'block', marginTop: '4px', color: '#1e3a8a' }}>
                R{eftTotal.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        {/* 6 Branch Breakdown Table */}
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', marginBottom: '10px' }}>
          <Building size={16} className="text-primary" /> Branch Breakdown for {monthName}
        </h4>
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', fontSize: '12.5px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '8px 10px' }}>Branch</th>
                <th style={{ padding: '8px 10px' }}>Orders</th>
                <th style={{ padding: '8px 10px' }}>Counter (POS/Cash)</th>
                <th style={{ padding: '8px 10px' }}>EFT / PayShap</th>
                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Intake</th>
              </tr>
            </thead>
            <tbody>
              {BRANCHES.map(b => {
                const stats = branchBreakdown[b.name] || { totalRevenue: 0, counterRevenue: 0, eftRevenue: 0, ordersCount: 0 };
                return (
                  <tr key={b.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600 }}>{b.name}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{stats.ordersCount}</td>
                    <td style={{ padding: '8px 10px', color: '#047857' }}>R{stats.counterRevenue.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', color: '#1d4ed8' }}>R{stats.eftRevenue.toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 700, textAlign: 'right', color: 'var(--text-main)' }}>
                      R{stats.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Owner Final Notes / Nedbank Statement Reference */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={14} /> Optional Owner Reconciliation Notes / Statement Ref
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="e.g. Nedbank statement reconciled with counter till float on Oct 31."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ padding: '10px 12px', fontSize: '13px' }}
          />
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-outline" 
            onClick={onClose}
            disabled={isSubmitting}
            style={{ minHeight: '44px', padding: '10px 16px', fontSize: '13.5px' }}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{ minHeight: '44px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle2 size={16} />
            {isSubmitting ? 'Archiving Month...' : `Confirm & Rollover ${monthName}`}
          </button>
        </div>
      </div>
    </div>
  );
};
