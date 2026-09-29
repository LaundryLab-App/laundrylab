import React, { useState, useEffect } from 'react';
import { useLaundry, SERVICE_CATALOG } from '../context/LaundryContext';
import { useAuth } from '../context/AuthContext';
import { 
  ClipboardCheck, 
  PlusCircle, 
  Calculator, 
  ShoppingBag, 
  Grid, 
  CreditCard, 
  Smartphone, 
  Handshake, 
  Search, 
  CheckCircle2, 
  Clock,
  Shirt,
  Lock,
  FileCheck,
  AlertCircle,
  Eye,
  AlertTriangle,
  Building
} from 'lucide-react';
import { IntakeModal } from '../components/modals/IntakeModal';
import { ReturnModal } from '../components/modals/ReturnModal';
import { ReconcileModal } from '../components/modals/ReconcileModal';
import { ProofOfPaymentModal } from '../components/modals/ProofOfPaymentModal';
import { Order, BranchName } from '../types/laundry';

export const StaffStation: React.FC = () => {
  const { 
    currentBranch, 
    setCurrentBranch, 
    getBranchOrders, 
    getBranchMachines, 
    updateOrderStatus, 
    startWashCycle, 
    stopWashCycle, 
    restartWashCycle 
  } = useLaundry();
  const { currentUser } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'intake' | 'returns'>('intake');
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<Order | null>(null);
  const [selectedPopOrder, setSelectedPopOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [, setTick] = useState(0);

  // Live timer interval to update countdowns and unlocks every 1 second
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Lock branch to employee's assigned branch
  useEffect(() => {
    if (currentUser && currentUser.role === 'Operator' && currentUser.assignedBranch !== 'All Branches') {
      setCurrentBranch(currentUser.assignedBranch as BranchName);
    }
  }, [currentUser, setCurrentBranch]);

  const activeBranchName = (currentUser && currentUser.role === 'Operator' && currentUser.assignedBranch !== 'All Branches')
    ? (currentUser.assignedBranch as BranchName)
    : currentBranch;

  const branchOrders = getBranchOrders(activeBranchName);
  const branchMachines = getBranchMachines(activeBranchName);

  const activeWashes = branchOrders.filter(o => o.status !== 'Completed');
  const returnsQueue = branchOrders.filter(o => o.status === 'Ready for Pickup');

  const filteredReturns = returnsQueue.filter(o => 
    o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customerPhone.includes(searchTerm) ||
    o.id.includes(searchTerm) ||
    (o.unitNumber && o.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const posTotal = branchOrders
    .filter(o => o.paymentStatus === 'Paid (Counter)' || o.paymentMethod === 'Speed Point/Cash(Paid at Counter)')
    .reduce((sum, o) => sum + o.amount, 0);

  const eftPayShapTotal = branchOrders
    .filter(o => o.paymentStatus === 'Paid (EFT/PayShap Verified)')
    .reduce((sum, o) => sum + o.amount, 0);

  const pendingTotal = branchOrders
    .filter(o => !o.paymentStatus.startsWith('Paid'))
    .reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="app-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ClipboardCheck className="text-primary" size={26} /> {activeBranchName} Staff Counter Station
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Logged in Operator: <strong>{currentUser?.name || 'Staff'}</strong> | Branch Locked: <strong>{activeBranchName}</strong> (4 Washing Machines)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => setShowIntakeModal(true)}>
            <PlusCircle size={16} /> New Customer Laundry Intake
          </button>
          <button className="btn btn-warning" onClick={() => setShowReconcileModal(true)}>
            <Calculator size={16} /> End-of-Day Shift Reconcile (7PM)
          </button>
        </div>
      </div>

      {/* Real-time Price List Banner */}
      <div className="glass-card" style={{ marginBottom: '20px', padding: '16px 20px', borderRadius: '16px' }}>
        <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '14px' }}>
          <h4 style={{ margin: 0, color: 'var(--brand-primary)', fontSize: '13px', fontWeight: 800, letterSpacing: '0.5px' }}>
            LAUNDRY SERVICES PRICE LIST
          </h4>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {SERVICE_CATALOG.map(s => (
            <div 
              key={s.name} 
              style={{ 
                background: 'var(--mint-surface)', 
                padding: '8px 12px', 
                borderRadius: '10px', 
                border: '1px solid var(--mint-border)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                fontSize: '11.5px' 
              }}
            >
              <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.name.toUpperCase()}</span>
              <strong style={{ color: 'var(--text-main)', fontWeight: 800 }}>R{s.rate}/{s.unit.toUpperCase()}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Station Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button 
          className={`nav-btn ${activeTab === 'intake' ? 'active' : ''}`}
          onClick={() => setActiveTab('intake')}
        >
          <ShoppingBag size={16} /> Active Washes & In-House Laundry ({activeWashes.length})
        </button>

        <button 
          className={`nav-btn ${activeTab === 'returns' ? 'active' : ''}`}
          onClick={() => setActiveTab('returns')}
        >
          <Handshake size={16} /> Customer Pickup & Garment Match Verification ({returnsQueue.length})
        </button>
      </div>

      {/* Tab 1: Active Washes */}
      {activeTab === 'intake' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {/* Orders List */}
          <div className="glass-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ShoppingBag size={20} /> Orders In-House Today ({activeWashes.length})
            </h3>

            {activeWashes.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No active orders for {activeBranchName}. Click "+ New Customer Laundry Intake" to create one.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeWashes.map(order => {
                  const isPaid = order.paymentStatus.startsWith('Paid');
                  const isPopPending = order.paymentStatus === 'POP Uploaded (Pending Verification)';
                  const isPopRejected = order.paymentStatus === 'POP Rejected (Re-upload Required)';
                  
                  const allocatedMachine = branchMachines.find(m => m.code === order.machineCode);
                  const isMachineCycleFinished = allocatedMachine?.status === 'Cycle Completed' || (allocatedMachine?.timeRemainingMinutes !== undefined && allocatedMachine.timeRemainingMinutes <= 0);

                  // Wash Timer Calculation
                  const isRunning = order.status === 'In Progress' && !!order.startedAt && !!order.durationMinutes;
                  let diffMs = 0;
                  let remainingMins = 0;
                  let remainingSecs = 0;
                  if (isRunning) {
                    const startMs = new Date(order.startedAt!).getTime();
                    const durationMs = order.durationMinutes! * 60 * 1000;
                    const elapsedMs = Date.now() - startMs;
                    diffMs = durationMs - elapsedMs;
                    if (diffMs > 0) {
                      remainingMins = Math.floor(diffMs / 60000);
                      remainingSecs = Math.floor((diffMs % 60000) / 1000);
                    }
                  }
                  const isWashRunning = isRunning && diffMs > 0 && !isMachineCycleFinished;

                  return (
                    <div key={order.id} style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div>
                          <strong style={{ color: 'var(--brand-primary)' }}>Order #{order.id}</strong>
                          {order.unitNumber && (
                            <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--brand-accent)', fontWeight: 600 }}>
                              🏢 {order.unitNumber}
                            </span>
                          )}
                        </div>
                        <span className={`badge ${order.status === 'In Progress' ? 'badge-in-use' : 'badge-completed'}`}>
                          {order.status}
                        </span>
                      </div>

                      <p style={{ fontSize: '14px', fontWeight: 600 }}>{order.customerName} ({order.customerPhone})</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {order.weightOrQty} {order.unit} {order.serviceName} | Machine: <strong>{order.machineCode}</strong>
                      </p>

                      {/* Payment Status Pill with POP Action */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0', padding: '6px 10px', background: isPaid ? 'var(--success-light)' : isPopRejected ? 'var(--danger-light)' : isPopPending ? '#eff6ff' : 'var(--warning-light)', borderRadius: '8px', fontSize: '12px' }}>
                        <span style={{ fontWeight: 600, color: isPaid ? '#047857' : isPopRejected ? '#b91c1c' : isPopPending ? '#1d4ed8' : '#b45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {isPaid ? <CheckCircle2 size={13} /> : isPopRejected ? <AlertTriangle size={13} /> : isPopPending ? <Clock size={13} /> : <AlertCircle size={13} />}
                          Payment: {isPopRejected ? 'POP Rejected (Re-upload Needed)' : isPopPending ? 'POP Uploaded (Awaiting Verification)' : order.paymentStatus}
                        </span>

                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', background: '#ffffff', borderRadius: '6px' }}
                          onClick={() => setSelectedPopOrder(order)}
                        >
                          <Eye size={13} /> {isPopPending ? 'View POP' : isPopRejected ? 'Rejection Info' : 'Payment / POP'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '13px', flexWrap: 'wrap', gap: '8px' }}>
                        <span>Items: {order.totalItemCount} | Total: <strong style={{ color: 'var(--success)' }}>R{order.amount.toFixed(2)}</strong></span>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {order.status === 'Awaiting Start' && (
                            <button 
                              className="btn btn-success" 
                              style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 700, borderRadius: '8px' }}
                              onClick={() => {
                                const minutesStr = prompt("Enter wash cycle duration (minutes):", "35");
                                if (minutesStr === null) return;
                                const minutes = parseInt(minutesStr);
                                if (isNaN(minutes) || minutes <= 0) {
                                  alert("Please enter a valid number of minutes.");
                                  return;
                                }
                                startWashCycle(order.id, minutes);
                              }}
                            >
                              ▶ Start Wash
                            </button>
                          )}

                          {order.status === 'In Progress' && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              {isWashRunning ? (
                                <>
                                  <span 
                                    className="badge badge-in-use" 
                                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px' }}
                                    title="Wash cycle is currently running. Mark Ready will unlock once completed."
                                  >
                                    <Clock size={14} style={{ animation: 'spin 8s linear infinite' }} /> 
                                    Running ({remainingMins > 0 ? `${remainingMins}m ` : ''}{remainingSecs}s left)
                                  </span>

                                  <button 
                                    className="btn btn-outline" 
                                    style={{ padding: '7px 12px', fontSize: '12.5px', fontWeight: 600, color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2', borderRadius: '8px' }}
                                    title="Stop wash cycle for machine issue / fault"
                                    onClick={() => {
                                      const ok = window.confirm(`⚠️ STOP WASH CONFIRMATION\n\nStop wash cycle for Order #${order.id}?\nMachine ${order.machineCode} will be reset to Available.`);
                                      if (ok) stopWashCycle(order.id);
                                    }}
                                  >
                                    ⏹️ Stop
                                  </button>

                                  <button 
                                    className="btn btn-outline" 
                                    style={{ padding: '7px 12px', fontSize: '12.5px', fontWeight: 600, borderRadius: '8px' }}
                                    title="Restart wash timer"
                                    onClick={() => {
                                      const minsStr = prompt("Restart wash cycle (minutes):", "35");
                                      if (minsStr) {
                                        const mins = parseInt(minsStr);
                                        if (!isNaN(mins) && mins > 0) restartWashCycle(order.id, mins);
                                      }
                                    }}
                                  >
                                    🔄 Restart
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button 
                                    className="btn btn-success" 
                                    style={{ padding: '7px 16px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px' }}
                                    onClick={() => {
                                      updateOrderStatus(order.id, 'Ready for Pickup');
                                      
                                      // Send WhatsApp ready notification
                                      const digits = order.customerPhone.replace(/\D/g, '');
                                      const formattedPhone = digits.startsWith('0') && digits.length === 10 ? '27' + digits.substring(1) : digits;
                                      const origin = window.location.origin;
                                      const messageText = `LaundryLab Alert: Your laundry for Order #${order.id} is washed, folded/ironed, and ready for pickup at our ${order.branch} branch!\n💳 Payment Status: ${order.paymentStatus}\n📱 Track order: ${origin}/track/${order.id}`;
                                      const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
                                      
                                      try {
                                        window.open(waUrl, '_blank');
                                      } catch (err) {
                                        console.error("Popup blocked", err);
                                      }
                                    }}
                                  >
                                    <CheckCircle2 size={15} /> Mark Ready
                                  </button>

                                  <button 
                                    className="btn btn-outline" 
                                    style={{ padding: '7px 12px', fontSize: '12.5px', borderRadius: '8px' }}
                                    title="Restart cycle if extra wash is needed"
                                    onClick={() => {
                                      const minsStr = prompt("Enter additional wash minutes:", "20");
                                      if (minsStr) {
                                        const mins = parseInt(minsStr);
                                        if (!isNaN(mins) && mins > 0) restartWashCycle(order.id, mins);
                                      }
                                    }}
                                  >
                                    🔄 Restart
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Machine Floor Status (Strict 4 Washing Machines, No Dryers) */}
          <div className="glass-card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Grid size={20} /> Machine Floor Status ({activeBranchName} — 4 Washing Machines)
            </h3>

            <div className="floor-grid">
              {branchMachines.map(m => (
                <div key={m.id} className={`machine-card ${m.status === 'In Use' ? 'in-use' : 'available'}`} style={{ padding: '16px', borderRadius: '12px' }}>
                  <div className="machine-header">
                    <span className="machine-code"><Shirt size={16} /> {m.code}</span>
                    <span className={`badge ${m.status === 'In Use' ? 'badge-in-use' : 'badge-available'}`}>
                      {m.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Type: Washing Machine ({m.capacity})</span>
                  {m.currentOrderId && (
                    <span style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px', display: 'block' }}>
                      <Clock size={12} /> Load #{m.currentOrderId} ({m.timeRemainingMinutes}m left)
                    </span>
                  )}
                </div>
              ))}
            </div>

            <hr style={{ borderColor: 'var(--border-color)', margin: '20px 0' }} />

            <h3>Shift Revenue & Reconciliation (ZAR)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '12px' }}>
              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CreditCard size={13} /> Speed Point / Cash
                </span>
                <h4 style={{ fontSize: '16px', marginTop: '4px', color: 'var(--success)' }}>R{posTotal.toFixed(2)}</h4>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Smartphone size={13} /> EFT / PayShap Verified
                </span>
                <h4 style={{ fontSize: '16px', marginTop: '4px', color: 'var(--brand-accent)' }}>R{eftPayShapTotal.toFixed(2)}</h4>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} /> Pay Later Pending
                </span>
                <h4 style={{ fontSize: '16px', marginTop: '4px', color: 'var(--warning)' }}>R{pendingTotal.toFixed(2)}</h4>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Customer Return & Pickup Verification */}
      {activeTab === 'returns' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Handshake size={20} /> Customer Return Garment Check
            </h3>
            <div style={{ position: 'relative', minWidth: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="custom-input" 
                placeholder="Search Order #, Customer, or Unit..." 
                style={{ paddingLeft: '36px', minHeight: '44px' }}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredReturns.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No orders pending customer pickup matching your search.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredReturns.map(order => {
                const isPaid = order.paymentStatus.startsWith('Paid');
                const isPopPending = order.paymentStatus === 'POP Uploaded (Pending Verification)';

                return (
                  <div key={order.id} style={{ background: '#ffffff', padding: '18px', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', border: !isPaid ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1.5px solid var(--border-subtle)', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                    <div>
                      <h4 style={{ color: 'var(--brand-primary)', margin: 0, fontSize: '15.5px' }}>
                        Order #{order.id} — {order.customerName}
                        {order.unitNumber && <span style={{ color: 'var(--brand-accent)', fontSize: '13px', marginLeft: '6px' }}>🏢 {order.unitNumber}</span>}
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0' }}>
                        Phone: {order.customerPhone} | Service: {order.serviceName} | Total Items: <strong>{order.totalItemCount} garments</strong>
                      </p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span className={`badge ${isPaid ? 'badge-available' : isPopPending ? 'badge-in-use' : 'badge-completed'}`}>
                          {isPopPending ? 'POP Uploaded (Awaiting Verification)' : `Payment: ${order.paymentStatus}`}
                        </span>
                        <strong style={{ color: 'var(--success)', fontSize: '14.5px' }}>R{order.amount.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {!isPaid && (
                        <button 
                          className="btn btn-outline"
                          style={{ minHeight: '46px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                          onClick={() => setSelectedPopOrder(order)}
                        >
                          <CreditCard size={16} /> {isPopPending ? 'View POP / POS' : 'Collect POS/Cash'}
                        </button>
                      )}

                      <button 
                        className="btn btn-success"
                        style={{ minHeight: '46px', padding: '10px 18px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px' }}
                        onClick={() => setSelectedReturnOrder(order)}
                      >
                        <CheckCircle2 size={18} /> Verify Garments & Hand Over
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <IntakeModal isOpen={showIntakeModal} onClose={() => setShowIntakeModal(false)} />
      <ReconcileModal isOpen={showReconcileModal} onClose={() => setShowReconcileModal(false)} />
      <ReturnModal order={selectedReturnOrder} onClose={() => setSelectedReturnOrder(null)} />
      <ProofOfPaymentModal 
        isOpen={!!selectedPopOrder} 
        order={selectedPopOrder} 
        onClose={() => setSelectedPopOrder(null)} 
        staffName={currentUser?.name || 'Operator'}
        canVerify={false}
      />
    </div>
  );
};

export default StaffStation;
