import React, { useState } from 'react';
import { useLaundry } from '../../context/LaundryContext';
import { X, Lock, Calculator } from 'lucide-react';

interface ReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({ isOpen, onClose }) => {
  const { currentBranch, getBranchOrders, showToast } = useLaundry();
  const [batchNotes, setBatchNotes] = useState('');

  if (!isOpen) return null;

  const branchOrders = getBranchOrders(currentBranch);
  const posTotal = branchOrders
    .filter(o => o.paymentStatus === 'Paid (Counter)' || o.paymentMethod === 'Speed Point/Cash(Paid at Counter)')
    .reduce((sum, o) => sum + o.amount, 0);

  const eftPayShapTotal = branchOrders
    .filter(o => o.paymentStatus === 'Paid (EFT/PayShap Verified)')
    .reduce((sum, o) => sum + o.amount, 0);

  const pendingTotal = branchOrders
    .filter(o => !o.paymentStatus.startsWith('Paid'))
    .reduce((sum, o) => sum + o.amount, 0);

  const grandTotal = posTotal + eftPayShapTotal;

  const handleSubmitReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Shift for ${currentBranch} reconciled and locked! Total Verified: R${grandTotal.toFixed(2)}`);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={20} className="text-warning" /> Shift End-of-Day Reconciliation (7:00 PM)
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmitReconcile}>
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px' }}>Branch: <span style={{ color: 'var(--primary)' }}>{currentBranch}</span></h4>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Speed Point / Counter Cash:</span>
              <strong>R{posTotal.toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>EFT & PayShap (Nedbank Verified):</span>
              <strong style={{ color: 'var(--brand-accent)' }}>R{eftPayShapTotal.toFixed(2)}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
              <span>Pay Later (Pending / Unpaid):</span>
              <strong style={{ color: 'var(--warning)' }}>R{pendingTotal.toFixed(2)}</strong>
            </div>

            <hr style={{ borderColor: 'var(--border-color)', margin: '12px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800 }}>
              <span>Total Verified Shift Revenue:</span>
              <strong style={{ color: 'var(--success)' }}>R{grandTotal.toFixed(2)}</strong>
            </div>
          </div>

          <div className="form-group">
            <label>Speed Point Terminal Batch Slip # / Notes</label>
            <input 
              type="text" 
              className="custom-input" 
              placeholder="e.g. Batch Slip #9941 Verified by Staff"
              value={batchNotes}
              onChange={e => setBatchNotes(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-warning" style={{ width: '100%', padding: '14px', marginTop: '12px' }}>
            <Lock size={16} /> Lock Shift & Submit Cashless Reconciliation
          </button>
        </form>
      </div>
    </div>
  );
};
