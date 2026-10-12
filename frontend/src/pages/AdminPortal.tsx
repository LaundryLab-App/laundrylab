import React, { useState, useMemo } from 'react';
import { useLaundry, BRANCHES } from '../context/LaundryContext';
import { 
  PieChart, 
  FileSpreadsheet, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  Building, 
  Search, 
  CheckCircle2,
  Clock,
  Eye,
  ShieldCheck,
  Check,
  User,
  RotateCcw,
  Calendar,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Layers,
  FileCheck
} from 'lucide-react';
import { ProofOfPaymentModal } from '../components/modals/ProofOfPaymentModal';
import { MonthRolloverModal } from '../components/modals/MonthRolloverModal';
import { Order, BranchName, DailyBranchRevenue } from '../types/laundry';

export const AdminPortal: React.FC = () => {
  const { orders, machines, verifyProofOfPayment, rollovers, createMonthlyRollover } = useLaundry();
  
  // Month Selection & Rollover State
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Filters
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('All');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [selectedPopOrder, setSelectedPopOrder] = useState<Order | null>(null);

  // Available months list extracted from orders and archived rollovers
  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    keys.add(currentMonthKey);
    orders.forEach(o => {
      if (o.createdAt) {
        keys.add(o.createdAt.slice(0, 7));
      }
    });
    rollovers.forEach(r => {
      if (r.monthKey) {
        keys.add(r.monthKey);
      }
    });
    return Array.from(keys).sort().reverse();
  }, [orders, rollovers, currentMonthKey]);

  const formatMonthLabel = (key: string) => {
    try {
      const [y, m] = key.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, 1);
      return date.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
    } catch (e) {
      return key;
    }
  };

  const selectedMonthName = formatMonthLabel(selectedMonthKey);
  const isSelectedMonthCurrent = selectedMonthKey === currentMonthKey;
  const existingRollover = rollovers.find(r => r.monthKey === selectedMonthKey);

  // Orders filtered for the selected month
  const monthOrders = useMemo(() => {
    return orders.filter(o => {
      const oMonth = o.createdAt ? o.createdAt.slice(0, 7) : currentMonthKey;
      return oMonth === selectedMonthKey;
    });
  }, [orders, selectedMonthKey, currentMonthKey]);

  // Total Revenue for Selected Month
  const monthTotalRevenue = monthOrders.reduce((sum, o) => sum + o.amount, 0);

  const monthPosRevenue = monthOrders
    .filter(o => o.paymentStatus === 'Paid (Counter)' || o.paymentMethod === 'Speed Point/Cash(Paid at Counter)')
    .reduce((sum, o) => sum + o.amount, 0);

  const monthEftPayShapRevenue = monthOrders
    .filter(o => o.paymentStatus === 'Paid (EFT/PayShap Verified)')
    .reduce((sum, o) => sum + o.amount, 0);

  const monthPendingRevenue = monthOrders
    .filter(o => !o.paymentStatus.startsWith('Paid'))
    .reduce((sum, o) => sum + o.amount, 0);

  // Pending POP queue (Global across all pending POPs requiring owner attention)
  const pendingPopOrders = orders.filter(o => o.paymentStatus === 'POP Uploaded (Pending Verification)');

  // 6 Branch Breakdown Totals for Selected Month
  const branchBreakdownTotals = useMemo(() => {
    const res: Record<BranchName, { totalRevenue: number; counterRevenue: number; eftRevenue: number; ordersCount: number }> = {
      'Absa Towers': { totalRevenue: 0, counterRevenue: 0, eftRevenue: 0, ordersCount: 0 },
      'Zuri': { totalRevenue: 0, counterRevenue: 0, eftRevenue: 0, ordersCount: 0 },
      'Nala': { totalRevenue: 0, counterRevenue: 0, eftRevenue: 0, ordersCount: 0 },
      'The Encore': { totalRevenue: 0, counterRevenue: 0, eftRevenue: 0, ordersCount: 0 },
      'Georgia': { totalRevenue: 0, counterRevenue: 0, eftRevenue: 0, ordersCount: 0 },
      'Centurion': { totalRevenue: 0, counterRevenue: 0, eftRevenue: 0, ordersCount: 0 },
    };

    monthOrders.forEach(o => {
      if (res[o.branch]) {
        res[o.branch].totalRevenue += o.amount;
        res[o.branch].ordersCount += 1;
        if (o.paymentMethod === 'Speed Point/Cash(Paid at Counter)' || o.paymentStatus === 'Paid (Counter)') {
          res[o.branch].counterRevenue += o.amount;
        } else {
          res[o.branch].eftRevenue += o.amount;
        }
      }
    });

    return res;
  }, [monthOrders]);

  // Daily Branch Breakdown Matrix for the Selected Month
  const dailyBreakdown: DailyBranchRevenue[] = useMemo(() => {
    const [yStr, mStr] = selectedMonthKey.split('-');
    const year = parseInt(yStr) || new Date().getFullYear();
    const month = parseInt(mStr) || (new Date().getMonth() + 1);
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    const map: Record<number, DailyBranchRevenue> = {};

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dayLabel = dateObj.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
      const dateStr = `${selectedMonthKey}-${day.toString().padStart(2, '0')}`;
      
      const initBranchRevs: Record<BranchName, number> = {
        'Absa Towers': 0,
        'Zuri': 0,
        'Nala': 0,
        'The Encore': 0,
        'Georgia': 0,
        'Centurion': 0
      };

      map[day] = {
        dayNumber: day,
        dateStr,
        dayLabel,
        branchRevenues: initBranchRevs,
        totalDayRevenue: 0,
        ordersCount: 0,
        counterTotal: 0,
        eftTotal: 0
      };
    }

    monthOrders.forEach(o => {
      let dayNum = 1;
      if (o.createdAt) {
        dayNum = new Date(o.createdAt).getDate();
      } else if (o.timestamp) {
        dayNum = new Date().getDate();
      }

      if (map[dayNum]) {
        map[dayNum].ordersCount += 1;
        map[dayNum].totalDayRevenue += o.amount;
        if (map[dayNum].branchRevenues[o.branch] !== undefined) {
          map[dayNum].branchRevenues[o.branch] += o.amount;
        }
        if (o.paymentMethod === 'Speed Point/Cash(Paid at Counter)' || o.paymentStatus === 'Paid (Counter)') {
          map[dayNum].counterTotal += o.amount;
        } else {
          map[dayNum].eftTotal += o.amount;
        }
      }
    });

    // If viewing current month, show all days up to today, plus any days with recorded activity
    const todayDay = new Date().getDate();
    const maxDayToShow = isSelectedMonthCurrent ? Math.min(todayDay, totalDaysInMonth) : totalDaysInMonth;
    
    return Object.values(map)
      .filter(d => d.dayNumber <= maxDayToShow || d.totalDayRevenue > 0)
      .sort((a, b) => b.dayNumber - a.dayNumber); // Latest day first
  }, [monthOrders, selectedMonthKey, isSelectedMonthCurrent]);

  // Filtered orders for the bottom ledger
  const filteredOrders = monthOrders.filter(o => {
    const matchesBranch = selectedBranchFilter === 'All' || o.branch === selectedBranchFilter;
    const matchesSearch = 
      o.customerName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      o.customerPhone.includes(ledgerSearch) ||
      o.id.includes(ledgerSearch) ||
      (o.unitNumber && o.unitNumber.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
      o.serviceName.toLowerCase().includes(ledgerSearch.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  const exportMonthLedgerCSV = () => {
    const headers = ['Order ID', 'Date/Created', 'Time', 'Branch', 'Customer', 'Unit #', 'Phone', 'Service', 'Weight/Qty', 'Amount (ZAR)', 'Payment Method', 'Payment Status', 'Garment Match'];
    const rows = monthOrders.map(o => [
      o.id,
      o.createdAt ? o.createdAt.slice(0, 10) : selectedMonthKey,
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
    link.setAttribute("download", `LaundryLab_${selectedMonthKey}_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportDailyMatrixCSV = () => {
    const headers = ['Date', 'Absa Towers (ZAR)', 'Zuri (ZAR)', 'Nala (ZAR)', 'The Encore (ZAR)', 'Georgia (ZAR)', 'Centurion (ZAR)', 'Counter POS', 'EFT / PayShap', 'Total Daily Intake (ZAR)', 'Orders Count'];
    const rows = dailyBreakdown.map(d => [
      d.dateStr,
      d.branchRevenues['Absa Towers'].toFixed(2),
      d.branchRevenues['Zuri'].toFixed(2),
      d.branchRevenues['Nala'].toFixed(2),
      d.branchRevenues['The Encore'].toFixed(2),
      d.branchRevenues['Georgia'].toFixed(2),
      d.branchRevenues['Centurion'].toFixed(2),
      d.counterTotal.toFixed(2),
      d.eftTotal.toFixed(2),
      d.totalDayRevenue.toFixed(2),
      d.ordersCount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LaundryLab_${selectedMonthKey}_Daily_Branch_Matrix.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickApprovePop = (orderId: string) => {
    verifyProofOfPayment(orderId, 'Mpho (Owner)');
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <PieChart className="text-primary" size={26} /> LaundryLab Multi-Branch Owner Portal
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '4px', marginBottom: 0 }}>
            Single-pane multi-branch oversight, daily revenue intelligence, and monthly rollover reconciliation
          </p>
        </div>

        {/* Global Export */}
        <button className="btn btn-outline" style={{ minHeight: '40px', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={exportMonthLedgerCSV}>
          <FileSpreadsheet size={16} /> Export {selectedMonthName} Ledger (CSV)
        </button>
      </div>

      {/* Monthly Scoping & Rollover Control Bar */}
      <div className="glass-card" style={{ marginBottom: '24px', padding: '16px 20px', background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(16,185,129,0.06) 100%)', border: '1.5px solid var(--border-color)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={22} className="text-primary" />
            <div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Active Financial Month</span>
              <h4 style={{ margin: 0, fontSize: '18px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedMonthName}
                {isSelectedMonthCurrent ? (
                  <span style={{ fontSize: '11px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    Active Month
                  </span>
                ) : existingRollover ? (
                  <span style={{ fontSize: '11px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    Archived Month
                  </span>
                ) : null}
              </h4>
            </div>
          </div>

          {/* Month Switcher Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Switch Month:</span>
            <select
              className="custom-select"
              style={{ minHeight: '38px', padding: '6px 12px', fontSize: '13px', width: 'auto', background: '#ffffff' }}
              value={selectedMonthKey}
              onChange={e => setSelectedMonthKey(e.target.value)}
            >
              {availableMonths.map(key => {
                const label = formatMonthLabel(key);
                const isCur = key === currentMonthKey;
                const isArchived = rollovers.some(r => r.monthKey === key);
                return (
                  <option key={key} value={key}>
                    {label} {isCur ? '(Current Active)' : isArchived ? '(Archived)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Rollover Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {existingRollover ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#047857', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '8px 14px', borderRadius: '10px', fontWeight: 600 }}>
              <CheckCircle2 size={15} /> Archived on {new Date(existingRollover.closedAt).toLocaleDateString()}
            </div>
          ) : (
            <button
              className="btn btn-primary"
              style={{ minHeight: '40px', padding: '8px 18px', fontSize: '13.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(37,99,235,0.2)' }}
              onClick={() => setIsRolloverModalOpen(true)}
            >
              <RotateCcw size={16} /> Close & Rollover {selectedMonthName}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards (Scoped to Selected Month) */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon icon-blue"><Banknote size={24} /></div>
          <div className="stat-info">
            <span>Total Intake Value</span>
            <h3>R{monthTotalRevenue.toFixed(2)}</h3>
            <small style={{ color: 'var(--text-muted)' }}>Across 6 Branches ({selectedMonthName})</small>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon icon-green"><CreditCard size={24} /></div>
          <div className="stat-info">
            <span>Speed Point / Cash POS</span>
            <h3>R{monthPosRevenue.toFixed(2)}</h3>
            <small style={{ color: 'var(--success)' }}>Counter Settled ({selectedMonthName})</small>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon icon-purple"><Smartphone size={24} /></div>
          <div className="stat-info">
            <span>EFT & PayShap Verified</span>
            <h3>R{monthEftPayShapRevenue.toFixed(2)}</h3>
            <small style={{ color: 'var(--brand-accent)' }}>Nedbank & PayShap POPs ({selectedMonthName})</small>
          </div>
        </div>

        <div className="stat-card glass-card" style={{ borderLeft: pendingPopOrders.length > 0 ? '3px solid var(--warning)' : undefined }}>
          <div className="stat-icon icon-orange"><Clock size={24} /></div>
          <div className="stat-info">
            <span>Pending POP Verification</span>
            <h3 style={{ color: pendingPopOrders.length > 0 ? 'var(--warning)' : 'inherit' }}>
              {pendingPopOrders.length} Orders
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

      {/* NEW SECTION: 6-Branch Daily Revenue Matrix Table */}
      <div className="glass-card" style={{ marginBottom: '28px', border: '1.5px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-main)', fontSize: '17px' }}>
              <TrendingUp size={20} className="text-primary" /> Daily Revenue Matrix by Laundry ({selectedMonthName})
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
              Breakdown of how much each of the 6 laundry branches makes each day. Click any date to view individual orders and POS vs EFT breakdown.
            </p>
          </div>

          <button 
            className="btn btn-outline"
            style={{ padding: '6px 14px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={exportDailyMatrixCSV}
          >
            <FileSpreadsheet size={14} /> Export Daily Matrix (CSV)
          </button>
        </div>

        {dailyBreakdown.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={36} style={{ display: 'block', margin: '0 auto 10px auto', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No recorded intakes for {selectedMonthName} yet.</p>
            <span style={{ fontSize: '12px' }}>New intakes will automatically populate this daily matrix as orders are processed.</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 14px', minWidth: '130px' }}>Date</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Absa Towers</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Zuri</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Nala</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>The Encore</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Georgia</th>
                  <th style={{ padding: '12px 10px', textAlign: 'right' }}>Centurion</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>Day Intake</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.map(day => {
                  const isExpanded = expandedDay === day.dayNumber;
                  const dayOrders = monthOrders.filter(o => {
                    const dayNum = o.createdAt ? new Date(o.createdAt).getDate() : new Date().getDate();
                    return dayNum === day.dayNumber;
                  });

                  return (
                    <React.Fragment key={day.dayNumber}>
                      <tr 
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: isExpanded ? 'rgba(37,99,235,0.04)' : day.totalDayRevenue > 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onClick={() => setExpandedDay(isExpanded ? null : day.dayNumber)}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isExpanded ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
                            {day.dayLabel}
                          </div>
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'right', color: day.branchRevenues['Absa Towers'] > 0 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: day.branchRevenues['Absa Towers'] > 0 ? 600 : 400 }}>
                          R{day.branchRevenues['Absa Towers'].toFixed(2)}
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'right', color: day.branchRevenues['Zuri'] > 0 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: day.branchRevenues['Zuri'] > 0 ? 600 : 400 }}>
                          R{day.branchRevenues['Zuri'].toFixed(2)}
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'right', color: day.branchRevenues['Nala'] > 0 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: day.branchRevenues['Nala'] > 0 ? 600 : 400 }}>
                          R{day.branchRevenues['Nala'].toFixed(2)}
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'right', color: day.branchRevenues['The Encore'] > 0 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: day.branchRevenues['The Encore'] > 0 ? 600 : 400 }}>
                          R{day.branchRevenues['The Encore'].toFixed(2)}
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'right', color: day.branchRevenues['Georgia'] > 0 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: day.branchRevenues['Georgia'] > 0 ? 600 : 400 }}>
                          R{day.branchRevenues['Georgia'].toFixed(2)}
                        </td>

                        <td style={{ padding: '12px 10px', textAlign: 'right', color: day.branchRevenues['Centurion'] > 0 ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: day.branchRevenues['Centurion'] > 0 ? 600 : 400 }}>
                          R{day.branchRevenues['Centurion'].toFixed(2)}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: day.totalDayRevenue > 0 ? 'var(--success)' : 'var(--text-muted)', fontSize: '13.5px' }}>
                          R{day.totalDayRevenue.toFixed(2)}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', background: day.ordersCount > 0 ? '#dbeafe' : 'rgba(255,255,255,0.06)', color: day.ordersCount > 0 ? '#1e40af' : 'var(--text-muted)', padding: '3px 8px', borderRadius: '10px', fontWeight: 600 }}>
                            {day.ordersCount} {day.ordersCount === 1 ? 'order' : 'orders'}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable Day Details Drawer */}
                      {isExpanded && (
                        <tr style={{ background: 'var(--bg-input)' }}>
                          <td colSpan={9} style={{ padding: '14px 20px', borderBottom: '1.5px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                              <strong style={{ fontSize: '13.5px', color: 'var(--brand-primary)' }}>
                                Orders Breakdown for {day.dayLabel} ({dayOrders.length} intakes):
                              </strong>
                              <div style={{ display: 'flex', gap: '14px', fontSize: '12.5px' }}>
                                <span style={{ color: '#047857', fontWeight: 600 }}>
                                  Counter POS / Cash: <strong>R{day.counterTotal.toFixed(2)}</strong>
                                </span>
                                <span style={{ color: '#1d4ed8', fontWeight: 600 }}>
                                  EFT & PayShap: <strong>R{day.eftTotal.toFixed(2)}</strong>
                                </span>
                              </div>
                            </div>

                            {dayOrders.length === 0 ? (
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>No individual orders recorded on this day.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                                {dayOrders.map(o => (
                                  <div key={o.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <strong style={{ color: 'var(--brand-primary)' }}>#{o.id}</strong>
                                        <span className="badge badge-in-use" style={{ fontSize: '10px', padding: '2px 6px' }}>{o.branch}</span>
                                      </div>
                                      <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {o.customerName} • {o.serviceName}
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <strong style={{ color: 'var(--success)', fontSize: '13px', display: 'block' }}>R{o.amount.toFixed(2)}</strong>
                                      <span style={{ fontSize: '10.5px', color: o.paymentStatus.startsWith('Paid') ? '#047857' : '#b45309' }}>
                                        {o.paymentStatus.startsWith('Paid') ? '✓ Paid' : 'Pending'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>

              {/* Monthly Totals Footer Row */}
              <tfoot>
                <tr style={{ background: 'var(--bg-input)', borderTop: '2px solid var(--border-color)', fontWeight: 800 }}>
                  <td style={{ padding: '14px', color: 'var(--text-main)', fontSize: '13.5px' }}>
                    Month Total ({selectedMonthName})
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', color: 'var(--brand-primary)' }}>
                    R{branchBreakdownTotals['Absa Towers'].totalRevenue.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', color: 'var(--brand-primary)' }}>
                    R{branchBreakdownTotals['Zuri'].totalRevenue.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', color: 'var(--brand-primary)' }}>
                    R{branchBreakdownTotals['Nala'].totalRevenue.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', color: 'var(--brand-primary)' }}>
                    R{branchBreakdownTotals['The Encore'].totalRevenue.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', color: 'var(--brand-primary)' }}>
                    R{branchBreakdownTotals['Georgia'].totalRevenue.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 10px', textAlign: 'right', color: 'var(--brand-primary)' }}>
                    R{branchBreakdownTotals['Centurion'].totalRevenue.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right', color: 'var(--success)', fontSize: '15px' }}>
                    R{monthTotalRevenue.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {monthOrders.length} orders
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Branch Performance Cards (6 Branches - Scoped to Selected Month) */}
      <div style={{ marginBottom: '28px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Building size={20} /> Branch Operations Breakdown ({selectedMonthName})
        </h3>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
          gap: '16px' 
        }}>
          {BRANCHES.map(branch => {
            const bOrders = monthOrders.filter(o => o.branch === branch.name);
            const bStats = branchBreakdownTotals[branch.name] || { totalRevenue: 0, counterRevenue: 0, eftRevenue: 0, ordersCount: 0 };
            const bTotalRevenue = bStats.totalRevenue;
            const bCounterRevenue = bStats.counterRevenue;
            const bEftRevenue = bStats.eftRevenue;

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
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Branch Month Intake</span>
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
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              Multi-Branch Digital Audit Ledger ({selectedMonthName})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing {filteredOrders.length} of {monthOrders.length} orders for {selectedMonthName}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                <th style={{ padding: '12px' }}>Date / Time</th>
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No orders match your filter for {selectedMonthName}.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const isPaid = o.paymentStatus.startsWith('Paid');
                  const isPaidCounter = o.paymentStatus === 'Paid (Counter)' || o.paymentMethod === 'Speed Point/Cash(Paid at Counter)';
                  const isPopPending = o.paymentStatus === 'POP Uploaded (Pending Verification)';
                  const isPopRejected = o.paymentStatus === 'POP Rejected (Re-upload Required)' || !!o.proofOfPayment?.rejected;
                  const dateStr = o.createdAt ? o.createdAt.slice(0, 10) : '';

                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--brand-accent)' }}>#{o.id}</td>
                      <td style={{ padding: '12px', color: 'var(--text-muted)' }}>
                        {dateStr && <span style={{ display: 'block', fontSize: '11px', fontWeight: 600 }}>{dateStr}</span>}
                        {o.timestamp}
                      </td>
                      <td style={{ padding: '12px' }}>{o.branch}</td>
                      <td style={{ padding: '12px' }}>
                        <strong>{o.customerName}</strong>
                        {o.unitNumber && <span style={{ color: 'var(--brand-accent)', fontSize: '11px', display: 'block' }}>🏢 {o.unitNumber}</span>}
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.customerPhone}</span>
                      </td>
                      <td style={{ padding: '12px' }}>{o.serviceName} ({o.weightOrQty} {o.unit})</td>
                      <td style={{ padding: '12px' }}>{o.totalItemCount} items</td>
                      <td style={{ padding: '12px' }}>
                        {isPopRejected ? (
                          <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
                            POP Rejected
                          </span>
                        ) : (
                          <span className={`badge ${isPaid ? 'badge-available' : isPopPending ? 'badge-in-use' : 'badge-completed'}`}>
                            {o.paymentStatus}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 700, color: 'var(--success)' }}>R{o.amount.toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>
                        {isPopPending ? (
                          <button 
                            className="btn btn-primary"
                            style={{ minHeight: '36px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                            onClick={() => setSelectedPopOrder(o)}
                          >
                            <ShieldCheck size={14} /> Review POP
                          </button>
                        ) : isPopRejected ? (
                          <button 
                            className="btn btn-outline"
                            style={{ minHeight: '36px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#dc2626', borderColor: '#fca5a5', display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                            onClick={() => setSelectedPopOrder(o)}
                          >
                            <RotateCcw size={13} /> View Rejected POP
                          </button>
                        ) : isPaidCounter ? (
                          <span style={{ color: '#047857', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} /> Settled at Till
                          </span>
                        ) : o.paymentStatus === 'Paid (EFT/PayShap Verified)' && o.proofOfPayment?.fileData ? (
                          <button 
                            className="btn btn-outline"
                            style={{ minHeight: '36px', padding: '6px 12px', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '8px', whiteSpace: 'nowrap' }}
                            onClick={() => setSelectedPopOrder(o)}
                          >
                            <Eye size={13} /> View POP Slip
                          </button>
                        ) : o.paymentStatus === 'Paid (EFT/PayShap Verified)' ? (
                          <span style={{ color: '#047857', fontSize: '12px', fontWeight: 600 }}>
                            ✓ Verified EFT
                          </span>
                        ) : (
                          <span style={{ color: 'var(--warning)', fontSize: '12px', fontWeight: 600 }}>
                            Awaiting Customer POP
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
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

      {/* End of Month Rollover & Reconciliation Modal */}
      <MonthRolloverModal
        isOpen={isRolloverModalOpen}
        onClose={() => setIsRolloverModalOpen(false)}
        monthKey={selectedMonthKey}
        monthName={selectedMonthName}
        totalIntake={monthTotalRevenue}
        counterTotal={monthPosRevenue}
        eftTotal={monthEftPayShapRevenue}
        ordersCount={monthOrders.length}
        branchBreakdown={branchBreakdownTotals}
        onConfirmRollover={createMonthlyRollover}
      />
    </div>
  );
};

export default AdminPortal;
