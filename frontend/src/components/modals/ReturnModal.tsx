import React, { useState } from 'react';
import { useLaundry } from '../../context/LaundryContext';
import { Order } from '../../types/laundry';
import { CheckCircle2, X, ShieldCheck } from 'lucide-react';

interface ReturnModalProps {
  order: Order | null;
  onClose: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({ order, onClose }) => {
  const { customerSignoffGarments } = useLaundry();
  const [checkedShirts, setCheckedShirts] = useState(true);
  const [checkedPants, setCheckedPants] = useState(true);
  const [checkedJackets, setCheckedJackets] = useState(true);
  const [checkedTowels, setCheckedTowels] = useState(true);

  if (!order) return null;

  const allChecked = checkedShirts && checkedPants && checkedJackets && checkedTowels;

  const handleConfirmHandover = () => {
    customerSignoffGarments(order.id, true);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} className="text-success" /> Customer Garment Verification Checklist
          </h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h4 style={{ margin: 0 }}>Order #{order.id} — {order.customerName}</h4>
            <span className={`badge ${order.paymentStatus.startsWith('Paid') ? 'badge-available' : 'badge-completed'}`}>
              Payment: {order.paymentStatus}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Branch: {order.branch} | Service: {order.serviceName} | Total: <strong style={{ color: 'var(--success)' }}>R{order.amount.toFixed(2)}</strong>
          </p>
        </div>

        <p style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>
          Verify each garment category received back by customer:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {order.itemsBreakdown.shirts > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={checkedShirts} onChange={e => setCheckedShirts(e.target.checked)} />
              <span>Shirts / Tops ({order.itemsBreakdown.shirts} items)</span>
            </label>
          )}

          {order.itemsBreakdown.pants > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={checkedPants} onChange={e => setCheckedPants(e.target.checked)} />
              <span>Pants / Shorts ({order.itemsBreakdown.pants} items)</span>
            </label>
          )}

          {order.itemsBreakdown.jackets > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={checkedJackets} onChange={e => setCheckedJackets(e.target.checked)} />
              <span>Jackets / Outerwear ({order.itemsBreakdown.jackets} items)</span>
            </label>
          )}

          {order.itemsBreakdown.towels > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={checkedTowels} onChange={e => setCheckedTowels(e.target.checked)} />
              <span>Towels / Bedding ({order.itemsBreakdown.towels} items)</span>
            </label>
          )}
        </div>

        <div style={{ textAlign: 'center', margin: '16px 0', padding: '10px', background: allChecked ? 'var(--success-light)' : 'var(--warning-light)', borderRadius: '8px', color: allChecked ? '#047857' : '#b45309', fontWeight: 700 }}>
          {allChecked ? '100% Item Count Match Verified' : 'Please check all items before handover'}
        </div>

        <button 
          className="btn btn-success" 
          disabled={!allChecked}
          onClick={handleConfirmHandover}
          style={{ width: '100%', padding: '14px', opacity: allChecked ? 1 : 0.6 }}
        >
          <CheckCircle2 size={18} /> Confirm 100% Garment Match & Hand Over
        </button>
      </div>
    </div>
  );
};
