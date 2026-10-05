import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useLaundry, BANK_ACCOUNT_DETAILS } from '../context/LaundryContext';
import { 
  MessageSquare, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  Smartphone,
  Receipt,
  FileCheck,
  Copy,
  Upload,
  AlertCircle,
  FileImage,
  Check,
  Building,
  HelpCircle,
  XCircle,
  ArrowRight,
  Search
} from 'lucide-react';
import { Order, PaymentMethod, ProofOfPayment } from '../types/laundry';

export const CustomerPortal: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const { orders, submitProofOfPayment, updatePaymentStatus, customerSignoffGarments, showToast } = useLaundry();

  const getInitialTab = (): 'pay' | 'track' | 'signoff' => {
    if (location.pathname.startsWith('/track')) return 'track';
    if (location.pathname.startsWith('/signoff')) return 'signoff';
    return 'pay';
  };

  const [activeSubTab, setActiveSubTab] = useState<'pay' | 'track' | 'signoff'>(getInitialTab);

  useEffect(() => {
    if (location.pathname.startsWith('/track')) {
      setActiveSubTab('track');
    } else if (location.pathname.startsWith('/pay')) {
      setActiveSubTab('pay');
    }
  }, [location.pathname]);

  const [directOrder, setDirectOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!orderId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchError, setSearchError] = useState<string | null>(null);

  const matchedOrder = orders.find(o => o.id === (orderId || ''));
  const order = directOrder || matchedOrder;

  useEffect(() => {
    if (orderId) {
      const fetchOrder = () => {
        fetch(`/api/orders/${orderId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setDirectOrder(data);
              setIsLoading(false);
            }
          })
          .catch(() => {
            setIsLoading(false);
          });
      };

      if (!matchedOrder && !directOrder) {
        setIsLoading(true);
      }
      fetchOrder();
      const interval = setInterval(fetchOrder, 3000);
      return () => clearInterval(interval);
    } else {
      setIsLoading(false);
    }
  }, [orderId]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setIsLoading(true);
    setSearchError(null);
    fetch(`/api/orders/${query}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setDirectOrder(data);
          setSearchError(null);
        } else {
          setSearchError(`No order found matching "${query}". Please check your receipt or contact counter staff.`);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setSearchError('Unable to connect to server. Please try again.');
        setIsLoading(false);
      });
  };

  // Upload Form State
  const [popFile, setPopFile] = useState<File | null>(null);
  const [popPreview, setPopPreview] = useState<string | null>(null);
  const [popChannel, setPopChannel] = useState<'PayShap' | 'Nedbank EFT' | 'Cash at Counter'>('PayShap');
  const [popReference, setPopReference] = useState('');
  const [isSubmittingPop, setIsSubmittingPop] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState('00:00');

  useEffect(() => {
    if (!order || order.status !== 'In Progress' || !order.startedAt || !order.durationMinutes) {
      return;
    }

    const calculateTime = () => {
      const startMs = new Date(order.startedAt!).getTime();
      const durationMs = order.durationMinutes! * 60 * 1000;
      const targetMs = startMs + durationMs;
      const nowMs = Date.now();
      const diffMs = targetMs - nowMs;

      if (diffMs <= 0) {
        setTimeLeft('00:00');
        return;
      }

      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setTimeLeft(formatted);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [order?.status, order?.startedAt, order?.durationMinutes]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Copied "${text}" to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPopFile(file);

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 1200;
            if (width > height && width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedData = canvas.toDataURL('image/jpeg', 0.82);
              setPopPreview(compressedData);
            } else {
              setPopPreview(event.target?.result as string);
            }
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPopPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handlePopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (!popPreview && !popReference.trim()) {
      alert('Please upload a receipt screenshot or enter a payment reference number.');
      return;
    }

    setIsSubmittingPop(true);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const popData = {
      fileData: popPreview || undefined,
      fileName: popFile?.name || 'receipt_screenshot.png',
      uploadedAt: nowStr,
      reference: popReference.trim() || `${order.customerName} ${order.unitNumber || ''}`.trim(),
      paymentChannel: popChannel,
      verified: false
    };

    // 1. Instantly transition local state so the customer sees "Under Review" immediately!
    setDirectOrder((prev: Order | null) => prev ? {
      ...prev,
      paymentStatus: 'POP Uploaded (Pending Verification)',
      paymentMethod: 'Pay Later (EFT / PayShap / Proof of Payment)',
      proofOfPayment: popData
    } : null);

    // 2. Clear upload inputs
    setPopFile(null);
    setPopPreview(null);
    setPopReference('');

    // 3. Persist directly to backend
    try {
      const res = await fetch(`/api/orders/${order.id}/pop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(popData)
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.order) {
          setDirectOrder(data.order);
        }
      }
    } catch (err) {
      // Background sync will retry
    }

    // 4. Update LaundryContext
    submitProofOfPayment(order.id, popData);
    showToast('Proof of payment received! Management has been notified for verification.');
    setIsSubmittingPop(false);
  };

  const handleCustomerSignoff = () => {
    if (!order) return;
    customerSignoffGarments(order.id, true);
    showToast(`Order #${order.id} digital sign-off completed by customer!`);
  };

  if (isLoading) {
    return (
      <div className="app-container" style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '60px 20px' }}>
        <Clock size={48} style={{ color: 'var(--brand-primary)', margin: '0 auto 16px auto', animation: 'spin 3s linear infinite' }} />
        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          {orderId ? `Loading Order #${orderId}...` : 'Searching LaundryLab...'}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Retrieving live wash cycle status and receipt details from LaundryLab server...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="app-container" style={{ maxWidth: '540px', margin: '40px auto', padding: '16px' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 24px', borderRadius: '16px' }}>
          <div style={{ width: '64px', height: '64px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--brand-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
            <Search size={32} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>Track Your Laundry</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14.5px', marginBottom: '28px', lineHeight: 1.5 }}>
            Enter your 4-digit Order Number or Phone Number to view live washing machine status, payment approval, and garment sign-off.
          </p>

          <form onSubmit={handleManualSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 1081 or 070 371 4689"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ padding: '14px 16px', fontSize: '15px', borderRadius: '10px', width: '100%', textAlign: 'center' }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '14px', fontSize: '15px', fontWeight: 700, borderRadius: '10px' }}>
              🔍 Track Order
            </button>
          </form>

          {searchError && (
            <div style={{ marginTop: '20px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '13.5px' }}>
              {searchError}
            </div>
          )}

          {orderId && !searchError && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px' }}>
              Order #{orderId} was not found. Please check your SMS / WhatsApp receipt or search with your mobile number above.
            </div>
          )}
        </div>
      </div>
    );
  }

  const generatedRef = `${order.customerName} ${order.unitNumber || ''}`.trim();
  const isPaid = order.paymentStatus.startsWith('Paid');
  const isPopRejected = order.paymentStatus === 'POP Rejected (Re-upload Required)' || !!order.proofOfPayment?.rejected;
  const isPopPending = order.paymentStatus === 'POP Uploaded (Pending Verification)' && !isPopRejected;

  return (
    <div className="app-container" style={{ maxWidth: '780px' }}>
      {/* SMS Simulation Banner */}
      <div className="glass-card" style={{ marginBottom: '20px', borderColor: 'var(--brand-accent)', background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.05), rgba(15, 118, 110, 0.05))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-accent)', fontWeight: 700, marginBottom: '8px' }}>
          <MessageSquare size={18} /> SMS Link Received on Smartphone ({order.customerPhone})
        </div>
        <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '8px', fontSize: '13px', lineHeight: '1.6' }}>
          <strong>LaundryLab Alert:</strong> Counter intake receipt for Order #{order.id} (R{order.amount.toFixed(2)}).<br />
          🏢 Ref: <strong>{generatedRef || `Order #${order.id}`}</strong> | Branch: <strong>{order.branch}</strong><br />
          📱 Order Hub (Pay, Track & Sign-off): <span style={{ color: 'var(--brand-accent)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }} onClick={() => setActiveSubTab(isPaid ? 'track' : 'pay')}>https://laundrylab.app/track/{order.id}</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button 
          className={`nav-btn ${activeSubTab === 'pay' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('pay')}
        >
          <CreditCard size={16} /> 1. Payments & Proof of Payment (POP)
          {isPaid ? (
            <span className="badge badge-available" style={{ marginLeft: '4px' }}>Paid</span>
          ) : isPopRejected ? (
            <span className="badge" style={{ marginLeft: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>POP Rejected</span>
          ) : isPopPending ? (
            <span className="badge badge-in-use" style={{ marginLeft: '4px' }}>POP Uploaded</span>
          ) : (
            <span className="badge badge-completed" style={{ marginLeft: '4px' }}>Pay Later</span>
          )}
        </button>

        <button 
          className={`nav-btn ${activeSubTab === 'track' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('track')}
        >
          <Clock size={16} /> 2. Live Wash Tracker
        </button>

        <button 
          className={`nav-btn ${activeSubTab === 'signoff' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('signoff')}
        >
          <FileCheck size={16} /> 3. Return Sign-Off
        </button>
      </div>

      {/* Sub-tab 1: Payment Checkout & Proof of Payment Upload */}
      {activeSubTab === 'pay' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Order Snapshot Card */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Order ID</span>
                <h3 style={{ margin: 0, color: 'var(--brand-primary)' }}>#{order.id} — {order.customerName}</h3>
                {order.unitNumber && (
                  <span style={{ fontSize: '13px', color: 'var(--brand-accent)', fontWeight: 600 }}>
                    🏢 {order.unitNumber}
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Amount Due</span>
                <h2 style={{ margin: 0, color: 'var(--success)' }}>R{order.amount.toFixed(2)}</h2>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', background: 'var(--bg-input)', padding: '12px 16px', borderRadius: '10px', fontSize: '13px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Branch:</span> <strong>{order.branch}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Service:</span> <strong>{order.serviceName}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Weight/Qty:</span> <strong>{order.weightOrQty} {order.unit}</strong> (R{order.ratePerUnit}/{order.unit})</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Garments:</span> <strong>{order.totalItemCount} items</strong></div>
            </div>
          </div>

          {/* Branded Nedbank & Payment Instructions Card (Matching Flyer 1) */}
          <div className="payment-flyer-card glass-card">
            <div className="flyer-header">
              <div className="flyer-brand">
                <div className="nedbank-badge">
                  <span className="nedbank-n">N</span>
                </div>
                <div>
                  <h2 className="flyer-title">PAYMENTS MADE EASY</h2>
                  <p className="flyer-subtitle">NEDBANK LIMITED & PAYSHAP CHANNELS</p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '14px 0 16px 0', lineHeight: '1.5' }}>
              TO KEEP YOUR LAUNDRY EXPERIENCE SMOOTH AND HASSLE-FREE, PLEASE USE THE DETAILS BELOW WHEN MAKING YOUR PAYMENT.
            </p>

            {/* Important Reference Notice */}
            <div className="ref-notice-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '13px', color: '#047857', marginBottom: '4px' }}>
                <ShieldCheck size={16} /> IMPORTANT PAYMENT REFERENCE:
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                KINDLY USE YOUR <strong>NAME + UNIT NUMBER</strong> AS YOUR PAYMENT REFERENCE. THIS HELPS US TRACK YOUR ORDER QUICKLY AND ACCURATELY.
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.9)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Your Generated Payment Reference:</span>
                  <strong style={{ fontSize: '15px', color: 'var(--brand-primary)', letterSpacing: '0.5px' }}>
                    {generatedRef || `${order.customerName} #${order.id}`}
                  </strong>
                </div>
                <button 
                  className="btn btn-outline" 
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={() => copyToClipboard(generatedRef || `${order.customerName} #${order.id}`, 'ref')}
                >
                  {copiedKey === 'ref' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  {copiedKey === 'ref' ? 'Copied!' : 'Copy Ref'}
                </button>
              </div>
            </div>

            {/* Account Details & PayShap Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '16px' }}>
              
              {/* Account Details Box */}
              <div className="bank-details-box">
                <div className="box-title">
                  <CreditCard size={16} /> ACCOUNT DETAILS
                </div>
                <div className="bank-field">
                  <span className="label">Bank Name</span>
                  <span className="value">NEDBANK LIMITED</span>
                </div>
                <div className="bank-field">
                  <span className="label">Account Type</span>
                  <span className="value">CURRENT ACCOUNT</span>
                </div>
                <div className="bank-field" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="label">Account Number</span>
                    <span className="value-highlight">{BANK_ACCOUNT_DETAILS.accountNumber}</span>
                  </div>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={() => copyToClipboard(BANK_ACCOUNT_DETAILS.accountNumber, 'acc')}
                  >
                    {copiedKey === 'acc' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedKey === 'acc' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Payment Methods Rules Box */}
              <div className="payment-rules-box">
                <div className="box-title">
                  <Smartphone size={16} /> PAYMENT METHODS
                </div>
                
                <div className="rule-item rule-disallowed">
                  <XCircle size={15} /> CASH SEND & EWALLET NOT ACCEPTED
                </div>
                <div className="rule-item rule-allowed">
                  <CheckCircle2 size={15} /> CASH PAYMENTS WELCOME AT COUNTER
                </div>
                <div className="rule-item rule-payshap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={15} /> PAYSHAP AVAILABLE
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px', marginLeft: '21px' }}>
                      USE: {BANK_ACCOUNT_DETAILS.payShapNumber}
                    </div>
                  </div>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff' }}
                    onClick={() => copyToClipboard(BANK_ACCOUNT_DETAILS.payShapNumber, 'payshap')}
                  >
                    {copiedKey === 'payshap' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    {copiedKey === 'payshap' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* In-App Proof of Payment Submission Form */}
          <div className="glass-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Upload size={20} className="text-primary" /> Submit Proof of Payment (POP)
            </h3>

            {isPaid ? (
              <div style={{ padding: '20px', background: 'var(--success-light)', color: '#047857', borderRadius: '12px', textAlign: 'center' }}>
                <CheckCircle2 size={36} style={{ display: 'block', margin: '0 auto 10px auto' }} />
                <h3 style={{ margin: 0 }}>Payment Verified & Confirmed!</h3>
                <p style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                  Status: <strong>{order.paymentStatus}</strong> ({order.paymentMethod}). Your laundry cycle and return verification are unlocked!
                </p>
              </div>
            ) : isPopPending ? (
              <div style={{ background: 'var(--bg-input)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b45309', marginBottom: '12px' }}>
                  <Clock size={22} />
                  <div>
                    <strong style={{ fontSize: '15px' }}>Proof of Payment Uploaded — Under Review</strong>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                      Uploaded at {order.proofOfPayment?.uploadedAt || 'recently'}. Our management is verifying the payment.
                    </p>
                  </div>
                </div>

                {order.proofOfPayment?.fileData && (
                  <div style={{ marginTop: '12px', background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                      Uploaded Receipt Screenshot:
                    </span>
                    <img 
                      src={order.proofOfPayment.fileData} 
                      alt="Uploaded proof" 
                      style={{ maxHeight: '200px', maxWidth: '100%', objectFit: 'contain', borderRadius: '6px' }} 
                    />
                  </div>
                )}

                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span>Channel: <strong>{order.proofOfPayment?.paymentChannel || order.paymentMethod}</strong></span>
                  <span>Ref: <strong>{order.proofOfPayment?.reference || generatedRef}</strong></span>
                </div>

                <hr style={{ borderColor: 'var(--border-subtle)', margin: '14px 0' }} />

                <details>
                  <summary style={{ fontSize: '13px', color: 'var(--brand-accent)', cursor: 'pointer', fontWeight: 600 }}>
                    Need to upload a different receipt? Click here to re-upload.
                  </summary>
                  <form onSubmit={handlePopSubmit} style={{ marginTop: '12px' }}>
                    <div className="form-group">
                      <label>Select Payment Channel</label>
                      <select 
                        className="custom-select" 
                        value={popChannel}
                        onChange={e => setPopChannel(e.target.value as any)}
                      >
                        <option value="PayShap">PayShap (067 935 6086)</option>
                        <option value="Nedbank EFT">Nedbank EFT Transfer</option>
                        <option value="Cash at Counter">Cash at Counter</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Upload New Screenshot or PDF Receipt</label>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf"
                        className="custom-input" 
                        onChange={handleFileChange}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '10px' }}>
                      Re-submit Proof of Payment
                    </button>
                  </form>
                </details>
              </div>
            ) : (
              <div>
                {isPopRejected && (
                  <div style={{ background: '#fef2f2', border: '1.5px solid #ef4444', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 700, fontSize: '15px' }}>
                      <XCircle size={20} /> Proof of Payment Rejected / Re-Upload Required
                    </div>
                    <div style={{ background: '#ffffff', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '8px', margin: '10px 0', fontSize: '13px' }}>
                      <strong style={{ color: '#991b1b' }}>Reason for Rejection:</strong>
                      <p style={{ margin: '4px 0 0 0', color: '#7f1d1d', fontWeight: 600 }}>
                        "{order.proofOfPayment?.rejectionReason || 'Receipt reference not matching statement or incorrect amount.'}"
                      </p>
                      {order.proofOfPayment?.rejectedAt && (
                        <span style={{ fontSize: '11px', color: '#b91c1c', display: 'block', marginTop: '4px' }}>
                          Reviewed at {order.proofOfPayment.rejectedAt}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12.5px', color: '#991b1b', margin: 0 }}>
                      Please verify that your transfer was made to <strong>Nedbank Current Account 1338934171</strong> or <strong>PayShap 067 935 6086</strong> using reference <strong>{generatedRef}</strong>, and submit your updated receipt below:
                    </p>
                  </div>
                )}

                <form onSubmit={handlePopSubmit}>
                  <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    {isPopRejected 
                      ? 'Upload your corrected EFT or PayShap payment proof below:' 
                      : 'Once you have completed the EFT or PayShap payment to Nedbank, please upload your proof of payment or screenshot below:'}
                  </p>

                  <div className="form-group">
                    <label>Payment Channel Used</label>
                    <select 
                      className="custom-select" 
                      value={popChannel}
                      onChange={e => setPopChannel(e.target.value as any)}
                      required
                    >
                      <option value="PayShap">PayShap (To 067 935 6086)</option>
                      <option value="Nedbank EFT">Nedbank Direct EFT (To 1338934171)</option>
                      <option value="Cash at Counter">Paid Cash at Counter</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Reference / Bank Transaction Note</label>
                    <input 
                      type="text" 
                      className="custom-input" 
                      placeholder={`e.g. ${generatedRef || order.customerName}`}
                      value={popReference}
                      onChange={e => setPopReference(e.target.value)}
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginTop: '3px' }}>
                      Tip: Use "{generatedRef || order.customerName}" so staff can instantly identify your payment.
                    </small>
                  </div>

                  {/* File Upload Box */}
                  <div className="form-group">
                    <label>Upload Receipt Screenshot / PDF File</label>
                    <div 
                      style={{ 
                        border: '2px dashed var(--border-subtle)', 
                        borderRadius: '12px', 
                        padding: '24px 16px', 
                        textAlign: 'center', 
                        background: 'var(--bg-input)', 
                        cursor: 'pointer', 
                        transition: 'border-color 0.2s ease' 
                      }}
                      onClick={() => document.getElementById('pop-file-input')?.click()}
                    >
                      <input 
                        id="pop-file-input"
                        type="file" 
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <Upload size={32} style={{ color: 'var(--brand-primary)', margin: '0 auto 8px auto', display: 'block' }} />
                      <strong style={{ fontSize: '14px', color: 'var(--text-main)', display: 'block' }}>
                        {popFile ? popFile.name : 'Click to select or capture payment screenshot'}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Supports PNG, JPG, or PDF proof of payment
                      </span>
                    </div>

                    {popPreview && (
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Receipt Preview:</span>
                        <img 
                          src={popPreview} 
                          alt="Receipt preview" 
                          style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-subtle)' }} 
                        />
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '100%', padding: '14px', fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    disabled={isSubmittingPop}
                  >
                    <ShieldCheck size={18} /> {isPopRejected ? 'Re-Submit Proof of Payment' : 'Submit Proof of Payment'} (R{order.amount.toFixed(2)})
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Live Wash Load Tracker */}
      {activeSubTab === 'track' && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'var(--success-light)', color: '#047857', borderRadius: '20px', fontWeight: 700, fontSize: '12px', marginBottom: '16px' }}>
            <CheckCircle2 size={14} /> LaundryLab Tracker Active
          </div>

          <h2>Order #{order.id} Live Wash Progress</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            Allocated Machine: <strong>{order.machineCode}</strong> (4 Washing Machines at {order.branch})
          </p>

          <div style={{ background: 'var(--bg-input)', padding: '24px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
            {order.status === 'Awaiting Start' && (
              <>
                <Clock size={40} className="text-warning" style={{ marginBottom: '12px' }} />
                <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--warning)' }}>Awaiting Start</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Waiting for staff operator to launch the wash cycle</p>
              </>
            )}
            {order.status === 'In Progress' && (
              <>
                <Clock size={40} className="text-primary" style={{ animation: 'spin 12s linear infinite', marginBottom: '12px' }} />
                <h1 style={{ fontSize: '48px', fontWeight: 800, color: 'var(--brand-primary)' }}>{timeLeft}</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Estimated wash cycle time remaining</p>
              </>
            )}
            {(order.status === 'Ready for Pickup' || order.status === 'Completed') && (
              <>
                <CheckCircle2 size={40} style={{ color: 'var(--success)', marginBottom: '12px' }} />
                <h1 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--success)' }}>
                  {order.status === 'Completed' ? 'Collected!' : 'Wash Completed!'}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                  {order.status === 'Completed' 
                    ? 'Thank you! Your order has been collected and signed off.' 
                    : 'Your laundry is washed, folded/ironed, and ready at the counter.'}
                </p>
              </>
            )}
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '12px', textAlign: 'left', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
              <span>Service: <strong>{order.serviceName}</strong></span>
              <span>Items: <strong>{order.totalItemCount} garments</strong></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span>Payment Status: <strong style={{ color: isPaid ? 'var(--success)' : isPopPending ? 'var(--brand-accent)' : 'var(--warning)' }}>{order.paymentStatus}</strong></span>
              <span>Status: <strong style={{ color: 'var(--warning)' }}>{order.status}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 3: Garment Sign-Off */}
      {activeSubTab === 'signoff' && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <FileCheck size={20} className="text-success" /> Garment Return Customer Sign-Off
          </h3>

          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Please verify that all {order.totalItemCount} garments dropped off at {order.branch} are handed back:
          </p>

          <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span>Shirts / Tops</span>
              <strong>{order.itemsBreakdown.shirts} items</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span>Pants / Shorts</span>
              <strong>{order.itemsBreakdown.pants} items</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span>Jackets / Outerwear</span>
              <strong>{order.itemsBreakdown.jackets} items</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>Towels / Bedding</span>
              <strong>{order.itemsBreakdown.towels} items</strong>
            </div>
          </div>

          {order.customerSignedOff ? (
            <div style={{ padding: '14px', background: 'var(--success-light)', color: '#047857', borderRadius: '12px', textAlign: 'center', fontWeight: 700 }}>
              <ShieldCheck size={18} style={{ display: 'inline', marginRight: '6px' }} /> 100% Item Count Verified & Signed Off
            </div>
          ) : (
            <button className="btn btn-success" style={{ width: '100%', padding: '14px' }} onClick={handleCustomerSignoff}>
              <CheckCircle2 size={16} /> Sign Off 100% Garment Return Match
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerPortal;
