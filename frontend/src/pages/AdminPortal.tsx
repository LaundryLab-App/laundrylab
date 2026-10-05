import React, { useState } from 'react';
import { useLaundry, BRANCHES } from '../context/LaundryContext';
import { 
  PieChart, 
  FileSpreadsheet, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  Shirt, 
  Building, 
  Search, 
  CheckCircle2,
  Clock,
  Filter,
  Eye,
  ShieldCheck,
  Check,
  AlertCircle,
  User,
  FileCheck
} from 'lucide-react';
import { ProofOfPaymentModal } from '../components/modals/ProofOfPaymentModal';
import { Order, BranchName } from '../types/laundry';

export const AdminPortal: React.FC = () => {
  const { orders, machines, verifyProofOfPayment } = useLaundry();
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('All');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [selectedPopOrder, setSelectedPopOrder] = useState<Order | null>(null);

  // Total Cashless Revenue
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);

  const posRevenue = orders
    .filter(o => o.paymentStatus === 'Paid (Counter)' || o.paymentMethod === 'Speed Point/Cash(Paid at Counter)')
    .reduce((sum, o) => sum + o.amount, 0);

  const eftPayShapRevenue = orders
    .filter(o => o.paymentStatus === 'Paid (EFT/PayShap Verified)')
    .reduce((sum, o) => sum + o.amount, 0);

  const pendingRevenue = orders
    .filter(o => !o.paymentStatus.startsWith('Paid'))
    .reduce((sum, o) => sum + o.amount, 0);

  // Pending POP queue (Exclusive to Owner verification)
  const pendingPopOrders = orders.filter(o => o.paymentStatus === 'POP Uploaded (Pending Verification)');

  const filteredOrders = orders.filter(o => {
    const matchesBranch = selectedBranchFilter === 'All' || o.branch === selectedBranchFilter;
    const matchesSearch = 
      o.customerName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      o.customerPhone.includes(ledgerSearch) ||
      o.id.includes(ledgerSearch) ||
      (o.unitNumber && o.unitNumber.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
      o.serviceName.toLowerCase().includes(ledgerSearch.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const exportToCSV = () => {
    const headers = ['Order ID', 'Timestamp', 'Branch', 'Customer', 'Unit #', 'Phone', 'Service', 'Weight/Qty', 'Amount (ZAR)', 'Payment Method', 'Payment Status', 'Garment Match'];
    const rows = orders.map(o => [
      o.id,
      o.timestamp,
      o.branch,
      o.customerName,
      o.unitNumber || 'N/A',
      o.customerPhone,
      o.serviceName,
      `${o.weightOrQty} ${o.unit}`,
      o.amount.toFixed(2),
      o.paymentMethod,
      o.paymentStatus,
      o.customerSignedOff ? 'Signed Off' : 'Pending'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LaundryLab_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickApprovePop = (orderId: string) => {
    verifyProofOfPayment(orderId, 'Mpho (Owner)');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PieChart className="text-primary" size={26} /> LaundryLab Multi-Branch Owner Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Owner administration, single-pane POP verification across all 6 branches, and shift reconciliation
          </p>
        </div>

        <button className="btn btn-success" onClick={exportToCSV}>
          <FileSpreadsheet size={16} /> Export Ledger to Excel (CSV)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon icon-blue"><Banknote size={24} /></div>
          <div className="stat-info">
            <span>Total Intake Value</span>
            <h3>R{totalRevenue.toFixed(2)}</h3>
            <small style={{ color: 'var(--text-muted)' }}>Across All 6 Branches</small>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon icon-green"><CreditCard size={24} /></div>
          <div className="stat-info">
            <span>Speed Point / Cash POS</span>
            <h3>R{posRevenue.toFixed(2)}</h3>
            <small style={{ color: 'var(--success)' }}>Counter Settled</small>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon icon-purple"><Smartphone size={24} /></div>
          <div className="stat-info">
            <span>EFT & PayShap Verified</span>
            <h3>R{eftPayShapRevenue.toFixed(2)}</h3>
            <small style={{ color: 'var(--brand-accent)' }}>Nedbank & PayShap POPs</small>
          </div>
        </div>

        <div className="stat-card glass-card" style={{ borderLeft: pendingPopOrders.length > 0 ? '3px solid var(--warning)' : undefined }}>
          <div className="stat-icon icon-orange"><Clock size={24} /></div>
          <div className="stat-info">
            <span>Pending POP Verification</span>
            <h3 style={{ color: pendingPopOrders.length > 0 ? 'var(--warning)' : 'inherit' }}>
              {pendingPopOrders.length} Orders (R{pendingRevenue.toFixed(2)})
            </h3>
            <small style={{ color: pendingPopOrders.length > 0 ? '#b45309' : 'var(--text-muted)', fontWeight: 600 }}>
              {pendingPopOrders.length > 0 ? 'Action Required by Owner' : 'All POPs Verified'}
            </small>
          </div>
        </div>
      </div>

      {/* OWNER EXCLUSIVE: Pending Proof of Payment (POP) Verification Queue */}
      {pendingPopOrders.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '28px', border: '1.5px solid #3b82f6', background: 'linear-gradient(180deg, #ffffff 0%, #eff6ff 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1d4ed8', margin: 0 }}>
              <ShieldCheck size={22} /> Owner Proof of Payment (POP) Approval Queue ({pendingPopOrders.length})
            </h3>
            <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
              Auto-syncs with Staff Stations upon approval
            </span>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Customers have deposited clothes with "Pay Later" and uploaded EFT / PayShap proof of payment. Verify against your Nedbank account statement and approve to notify staff:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingPopOrders.map(order => {
              const pop = order.proofOfPayment;

              return (
                <div key={order.id} style={{ background: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {pop?.fileData && (
                      <div 
                        style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setSelectedPopOrder(order)}
                        title="Click to view full receipt"
                      >
                        <img src={pop.fileData} alt="Receipt thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: 'var(--brand-primary)', fontSize: '15px' }}>Order #{order.id}</strong>
                        <span className="badge badge-in-use">{order.branch}</span>
                        {order.unitNumber && <span style={{ color: 'var(--brand-accent)', fontSize: '12.5px', fontWeight: 600 }}>🏢 {order.unitNumber}</span>}
                      </div>

                      <p style={{ fontSize: '14px', fontWeight: 600, margin: '2px 0' }}>
                        {order.customerName} ({order.customerPhone})
                      </p>

                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <span>Channel: <strong style={{ color: '#1d4ed8' }}>{pop?.paymentChannel || 'PayShap/EFT'}</strong></span>
                        <span>Ref: <strong style={{ color: 'var(--brand-accent)' }}>{pop?.reference || `${order.customerName} ${order.unitNumber || ''}`}</strong></span>
                        <span>Uploaded: {pop?.uploadedAt || 'Today'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payable Amount</span>
                      <h3 style={{ margin: 0, color: 'var(--success)' }}>R{order.amount.toFixed(2)}</h3>
                    </div>
                    <button 
                      className="btn btn-outline"
                      style={{ minHeight: '42px', padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                      onClick={() => setSelectedPopOrder(order)}
                    >
                      <Eye size={15} /> Inspect Full POP
                    </button>

                    <button 
                      className="btn btn-success"
                      style={{ minHeight: '42px', padding: '10px 18px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px' }}
                      onClick={() => handleQuickApprovePop(order.id)}
                    >
                      <Check size={17} /> Approve & Verify
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Branch Performance Cards (6 Branches) */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Building size={20} /> Branch Operations Breakdown (6 Locations — 4 Washing Machines Each)
        </h3>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '16px' 
        }}>
          {BRANCHES.map(branch => {
            const bOrders = orders.filter(o => o.branch === branch.name);
            const bTotalRevenue = bOrders.reduce((sum, o) => sum + o.amount, 0);

            // Paid on Counter (Speed Point / Cash)
            const bCounterRevenue = bOrders
              .filter(o => o.paymentMethod === 'Speed Point/Cash(Paid at Counter)' || o.paymentStatus === 'Paid (Counter)')
              .reduce((sum, o) => sum + o.amount, 0);

            // EFT / PayShap total
            const bEftRevenue = bOrders
              .filter(o => o.paymentMethod === 'Pay Later (EFT / PayShap / Proof of Payment)' || o.paymentStatus === 'Paid (EFT/PayShap Verified)' || o.paymentStatus.includes('POP'))
              .reduce((sum, o) => sum + o.amount, 0);

            // EFT verified vs pending
            const bEftPending = bOrders
              .filter(o => o.paymentMethod === 'Pay Later (EFT / PayShap / Proof of Payment)' && o.paymentStatus !== 'Paid (EFT/PayShap Verified)')
              .reduce((sum, o) => sum + o.amount, 0);

            const bMachines = machines[branch.name] || [];
            const activeCount = bMachines.filter(m => m.status === 'In Use').length;

            return (
              <div 
                key={branch.name} 
                className="glass-card" 
                style={{ 
                  padding: '20px', 
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <div>
                      <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '17px', fontWeight: 700 }}>
                        {branch.name}
                      </h4>
                      <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                        {branch.address}
                      </p>
                    </div>
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        background: activeCount > 0 ? '#ecfdf5' : 'rgba(255,255,255,0.06)', 
                        color: activeCount > 0 ? '#047857' : 'var(--text-secondary)', 
                        border: activeCount > 0 ? '1px solid #a7f3d0' : '1px solid var(--border-color)',
                        padding: '4px 10px', 
                        borderRadius: '20px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {activeCount}/4 Active
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '6px', marginBottom: '14px' }}>
                    <User size={13} style={{ color: 'var(--primary-light)' }} />
                    <span>Station Operator: <strong>{branch.operatorName || 'Unassigned'}</strong></span>
                  </div>

                  {/* Payment Breakdown Box */}
                  <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '10px', 
                    padding: '10px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <CreditCard size={14} style={{ color: 'var(--success)' }} /> Paid on Counter (POS/Cash)
                      </span>
                      <strong style={{ color: 'var(--success)', fontWeight: 700 }}>
                        R{bCounterRevenue.toFixed(2)}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                        <Smartphone size={14} style={{ color: '#a855f7' }} /> EFT & PayShap
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: '#c084fc', fontWeight: 700 }}>
                          R{bEftRevenue.toFixed(2)}
                        </strong>
                        {bEftPending > 0 && (
                          <div style={{ fontSize: '10px', color: 'var(--warning)', marginTop: '-1px' }}>
                            (R{bEftPending.toFixed(2)} pending POP)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: Order count & Total Branch Intake */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  fontSize: '13px', 
                  paddingTop: '10px', 
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: '4px'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    Orders: <strong style={{ color: 'var(--text-main)', fontSize: '14px' }}>{bOrders.length}</strong>
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Branch Intake</span>
                    <strong style={{ color: 'var(--primary-light)', fontSize: '16px', fontWeight: 800 }}>
                      R{bTotalRevenue.toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-Branch Ledger Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Multi-Branch Digital Audit Ledger
          </h3>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select 
              className="custom-select" 
              style={{ width: 'auto', minHeight: '40px' }}
              value={selectedBranchFilter}
              onChange={e => setSelectedBranchFilter(e.target.value)}
            >
              <option value="All">All 6 Branches</option>
              {BRANCHES.map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>

            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '13px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="custom-input" 
                placeholder="Search ledger..." 
                style={{ paddingLeft: '32px', minHeight: '40px' }}
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px' }}>Order ID</th>
                <th style={{ padding: '12px' }}>Time</th>
                <th style={{ padding: '12px' }}>Branch</th>
                <th style={{ padding: '12px' }}>Customer / Ref</th>
                <th style={{ padding: '12px' }}>Service</th>
                <th style={{ padding: '12px' }}>Garments</th>
                <th style={{ padding: '12px' }}>Payment Status</th>
                <th style={{ padding: '12px' }}>Amount (ZAR)</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const isPaid = o.paymentStatus.startsWith('Paid');
                const isPaidCounter = o.paymentStatus === 'Paid (Counter)' || o.paymentMethod === 'Speed Point/Cash(Paid at Counter)';
                const isPopPending = o.paymentStatus === 'POP Uploaded (Pending Verification)';

                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--brand-accent)' }}>#{o.id}</td>
                    <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{o.timestamp}</td>
                    <td style={{ padding: '12px' }}>{o.branch}</td>
                    <td style={{ padding: '12px' }}>
                      <strong>{o.customerName}</strong>
                      {o.unitNumber && <span style={{ color: 'var(--brand-accent)', fontSize: '11px', display: 'block' }}>🏢 {o.unitNumber}</span>}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.customerPhone}</span>
                    </td>
                    <td style={{ padding: '12px' }}>{o.serviceName} ({o.weightOrQty} {o.unit})</td>
                    <td style={{ padding: '12px' }}>{o.totalItemCount} items</td>
                    <td style={{ padding: '12px' }}>
                      <span className={`badge ${isPaid ? 'badge-available' : isPopPending ? 'badge-in-use' : 'badge-completed'}`}>
                        {o.paymentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: 'var(--success)' }}>R{o.amount.toFixed(2)}</td>
                    <td style={{ padding: '12px' }}>
                      {isPopPending ? (
                        <button 
                          className="btn btn-primary"
                          style={{ minHeight: '38px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                          onClick={() => setSelectedPopOrder(o)}
                        >
                          <Eye size={14} /> Review POP
                        </button>
                      ) : isPaidCounter ? (
                        <button 
                          className="btn btn-outline"
                          style={{ minHeight: '38px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                          onClick={() => setSelectedPopOrder(o)}
                        >
                          <FileCheck size={14} style={{ color: 'var(--success)' }} /> Order Receipt
                        </button>
                      ) : (
                        <button 
                          className="btn btn-outline"
                          style={{ minHeight: '38px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                          onClick={() => setSelectedPopOrder(o)}
                        >
                          <Eye size={14} /> View Details
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* POP Modal (Owner Verification Enabled) */}
      <ProofOfPaymentModal 
        isOpen={!!selectedPopOrder}
        order={selectedPopOrder}
        onClose={() => setSelectedPopOrder(null)}
        staffName="Mpho (Owner)"
        canVerify={true}
      />
    </div>
  );
};

export default AdminPortal;
