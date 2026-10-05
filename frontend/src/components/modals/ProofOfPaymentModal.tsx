import React, { useState } from 'react';
import { useLaundry, BANK_ACCOUNT_DETAILS } from '../../context/LaundryContext';
import { Order } from '../../types/laundry';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  FileCheck, 
  ExternalLink, 
  CreditCard, 
  Clock, 
  User, 
  Hash, 
  ShieldCheck,
  Building,
  RotateCcw,
  Lock,
  Info
} from 'lucide-react';

interface ProofOfPaymentModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  staffName?: string;
  canVerify?: boolean; // True ONLY for Owner / Admin
}

export const ProofOfPaymentModal: React.FC<ProofOfPaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  staffName = 'Mpho (Owner)',
  canVerify = false
}) => {
  const { verifyProofOfPayment, rejectProofOfPayment, updatePaymentStatus, showToast } = useLaundry();
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  if (!isOpen || !order) return null;

  const pop = order.proofOfPayment;
  const isPaid = order.paymentStatus.startsWith('Paid');
  const isPopPending = order.paymentStatus === 'POP Uploaded (Pending Verification)';

  const handleApprove = () => {
    verifyProofOfPayment(order.id, staffName);
    onClose();
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please enter a brief reason for requesting re-upload.');
      return;
    }
    const reasonText = rejectReason.trim();
    rejectProofOfPayment(order.id, reasonText, staffName);

    // Auto-launch WhatsApp re-upload alert to customer with rejection reason
    const digits = order.customerPhone.replace(/\D/g, '');
    const formattedPhone = digits.startsWith('0') && digits.length === 10 ? '27' + digits.substring(1) : digits;
    const origin = window.location.origin;
    const messageText = `LaundryLab Alert: Your Proof of Payment for Order #${order.id} was not approved by management.\n⚠️ Reason: ${reasonText}\n📱 Please review the note and re-upload your receipt here: ${origin}/track/${order.id}`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;

    try {
      window.open(waUrl, '_blank');
    } catch (err) {
      console.error("Popup blocked", err);
    }

    setShowRejectInput(false);
    setRejectReason('');
    onClose();
  };

  const handleMarkCashOrPOS = (method: 'Speed Point/Cash(Paid at Counter)') => {
    updatePaymentStatus(order.id, 'Paid (Counter)', method);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCheck size={22} className="text-primary" />
            <div>
              <h3 style={{ margin: 0 }}>Proof of Payment (POP) Details</h3>
              <span style={{ fontSize: '12px', color: canVerify ? 'var(--brand-accent)' : 'var(--text-muted)' }}>
                {canVerify ? 'Review & Verification Mode' : 'Staff View (Verification by Management)'}
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Role Notice for Staff */}
        {!canVerify && isPopPending && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} />
            <span>
              <strong>Owner Action Required:</strong> Only the Business Owner can verify and approve EFT/PayShap POPs. This will automatically update here once approved.
            </span>
          </div>
        )}

        {/* Order Details Header */}
        <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', marginBottom: '18px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Order Reference</span>
              <h3 style={{ color: 'var(--brand-primary)', margin: '2px 0 0 0' }}>#{order.id} — {order.customerName}</h3>
              {order.unitNumber && (
                <span style={{ fontSize: '13px', color: 'var(--brand-accent)', fontWeight: 600 }}>
                  🏢 {order.unitNumber}
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Amount</span>
              <h2 style={{ color: 'var(--success)', margin: '2px 0 0 0' }}>R{order.amount.toFixed(2)}</h2>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Branch:</span> <strong>{order.branch}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Mobile:</span> <strong>{order.customerPhone}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Service:</span> <strong>{order.serviceName} ({order.weightOrQty} {order.unit})</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Payment Status:</span> 
              <span className={`badge ${isPaid ? 'badge-available' : isPopPending ? 'badge-in-use' : 'badge-completed'}`} style={{ marginLeft: '6px' }}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Submitted Proof of Payment Section */}
        {pop ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-main)' }}>
              <ShieldCheck size={18} className="text-primary" /> Submitted POP Details
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '14px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Payment Channel:</span>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                  {pop.paymentChannel}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Transaction Reference / Note:</span>
                <div style={{ fontWeight: 700, color: 'var(--brand-accent)', marginTop: '2px' }}>
                  {pop.reference || 'None provided'}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Uploaded At:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {pop.uploadedAt}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Target Account:</span>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Nedbank (1338934171)
                </div>
              </div>
            </div>

            {/* Receipt Image / File Preview */}
            {pop.fileData ? (
              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Uploaded Receipt Document / Screenshot:
                </span>
                <div style={{ 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '280px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-input)'
                }}>
                  <img 
                    src={pop.fileData} 
                    alt="Proof of payment" 
                    style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain' }} 
                  />
                </div>
                {pop.fileName && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                    File: {pop.fileName}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                No image file uploaded (Transaction reference: <strong>{pop.reference}</strong>).
              </div>
            )}

            {pop.verified && (
              <div style={{ marginTop: '14px', padding: '10px 14px', background: 'var(--success-light)', color: '#047857', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> Verified by <strong>{pop.verifiedBy || 'Owner'}</strong> at {pop.verifiedAt || 'Earlier'}
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '20px', background: 'var(--warning-light)', color: '#b45309', borderRadius: '12px', textAlign: 'center', marginBottom: '20px', fontSize: '14px' }}>
            <AlertTriangle size={24} style={{ display: 'block', margin: '0 auto 8px auto' }} />
            <strong>No Proof of Payment Uploaded Yet</strong>
            <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-secondary)' }}>
              The customer dropped off clothes with "Pay Later" and has not uploaded proof of payment via their SMS/web link yet.
            </p>
          </div>
        )}

        {/* Reject reason input (Owner Only) */}
        {canVerify && showRejectInput && (
          <div style={{ background: 'var(--danger-light)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <label style={{ fontSize: '13px', color: '#b91c1c', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Reason for rejecting POP (customer and staff will see update):
            </label>
            <input 
              type="text" 
              className="custom-input" 
              placeholder="e.g. Reference number not showing on statement / Incorrect amount" 
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ background: '#ffffff', borderColor: '#fca5a5' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => setShowRejectInput(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" style={{ padding: '6px 14px', fontSize: '12px' }} onClick={handleReject}>
                Confirm Reject
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Verification Buttons */}
          {canVerify && isPopPending && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                className="btn btn-success" 
                style={{ minHeight: '48px', padding: '12px', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '10px' }}
                onClick={handleApprove}
              >
                <CheckCircle2 size={18} /> Approve & Verify
              </button>
              <button 
                className="btn btn-outline" 
                style={{ minHeight: '48px', padding: '12px', fontSize: '14px', color: 'var(--danger)', borderColor: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '10px' }}
                onClick={() => setShowRejectInput(true)}
              >
                <RotateCcw size={16} /> Reject / Request Re-upload
              </button>
            </div>
          )}

          {/* If unverified and staff/counter is taking physical cash/card POS */}
          {!isPaid && (
            <button 
              className="btn btn-outline" 
              style={{ width: '100%', minHeight: '46px', padding: '12px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '10px' }}
              onClick={() => handleMarkCashOrPOS('Speed Point/Cash(Paid at Counter)')}
            >
              <CreditCard size={16} /> Customer Paid Cash / Speed Point POS at Counter
            </button>
          )}

          <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '10px', marginTop: '4px' }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProofOfPaymentModal;
