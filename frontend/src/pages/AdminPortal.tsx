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
import { Order, BranchName, DailyBranchRevenue, MonthlyRollover } from '../types/laundry';

export const AdminPortal: React.FC = () => {
  const { orders, machines, verifyProofOfPayment, rollovers, createMonthlyRollover } = useLaundry();

  // Month Selection & Rollover State
  const currentMonthKey = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonthKey);
  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // Daily drawer sub-filters & pagination (5 items at a time for high-volume 25+ orders/day)
  const [dailyDrawerBranchFilter, setDailyDrawerBranchFilter] = useState<string>('All');
  const [dailyDrawerSearch, setDailyDrawerSearch] = useState<string>('');
  const [dailyDrawerPage, setDailyDrawerPage] = useState<number>(1);
  const DAILY_PAGE_SIZE = 5;

  // Filters & bottom ledger pagination
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('All');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const LEDGER_PAGE_SIZE = 5;
  const [selectedPopOrder, setSelectedPopOrder] = useState<Order | null>(null);

  // Helper to compute next month key YYYY-MM
  const getNextMonthKey = (key: string): string => {
    try {
      const [y, m] = key.split('-').map(Number);
      const nextDate = new Date(y, m, 1);
      return `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`;
    } catch {
      return key;
    }
  };

  // Available months list extracted from orders, archived rollovers, and calendar
  const availableMonths = useMemo(() => {
    const keys = new Set<string>();

    // Always include current active calendar month
    keys.add(currentMonthKey);

    // Include next month so Mpho can see the upcoming period ready to rollover into
    keys.add(getNextMonthKey(currentMonthKey));

    // Include all months where orders exist
    orders.forEach(o => {
      if (o.createdAt) {
        keys.add(o.createdAt.slice(0, 7));
      }
    });

    // Include all archived rollover months and their subsequent active months
    rollovers.forEach(r => {
      if (r.monthKey) {
        keys.add(r.monthKey);
        keys.add(getNextMonthKey(r.monthKey));
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

  const handleConfirmRollover = async (data: Omit<MonthlyRollover, 'id' | 'closedAt'>): Promise<boolean> => {
    const success = await createMonthlyRollover(data);
    if (success) {
      setIsRolloverModalOpen(false);
      // Automatically advance to the next month to begin fresh Day 1 stats
      const nextMonth = getNextMonthKey(data.monthKey);
      setSelectedMonthKey(nextMonth);
    }
    return success;
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
                const isUpcoming = key > currentMonthKey;
                let badge = '';
                if (isCur) badge = '(Current Active)';
                else if (isArchived) badge = '(Archived)';
                else if (isUpcoming) badge = '(Next / Upcoming)';
                return (
                  <option key={key} value={key}>
                    {label} {badge}
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
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedDay(null);
                          } else {
                            setExpandedDay(day.dayNumber);
                            setDailyDrawerBranchFilter('All');
                            setDailyDrawerSearch('');
                            setDailyDrawerPage(1);
                          }
                        }}
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

                      {/* Expandable Day Details Drawer (High-Volume Compact Data Ledger with 5 items/page Pagination) */}
                      {isExpanded && (() => {
                        const displayedDayOrders = dayOrders.filter(o => {
                          const matchesBranch = dailyDrawerBranchFilter === 'All' || o.branch === dailyDrawerBranchFilter;
                          const matchesSearch = !dailyDrawerSearch ||
                            o.id.includes(dailyDrawerSearch) ||
                            o.customerName.toLowerCase().includes(dailyDrawerSearch.toLowerCase()) ||
                            o.serviceName.toLowerCase().includes(dailyDrawerSearch.toLowerCase()) ||
                            (o.customerPhone && o.customerPhone.includes(dailyDrawerSearch));
                          return matchesBranch && matchesSearch;
                        });

                        const totalPages = Math.ceil(displayedDayOrders.length / DAILY_PAGE_SIZE) || 1;
                        const currentPage = Math.min(dailyDrawerPage, totalPages);
                        const startIndex = (currentPage - 1) * DAILY_PAGE_SIZE;
                        const paginatedOrders = displayedDayOrders.slice(startIndex, startIndex + DAILY_PAGE_SIZE);

                        return (
                          <tr style={{ background: '#f8fafc' }}>
                            <td colSpan={9} style={{ padding: '16px 20px', borderBottom: '2px solid var(--border-color)' }}>
                              <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                
                                {/* Header Strip: Title, Breakdown Totals, Search */}
                                <div style={{ padding: '12px 16px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                  <div>
                                    <strong style={{ fontSize: '13.5px', color: 'var(--brand-primary)', display: 'block' }}>
                                      {day.dayLabel} Orders Ledger ({dayOrders.length} total)
                                    </strong>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      High-volume order breakdown with instant branch filtering
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                                      <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                        Counter POS: R{day.counterTotal.toFixed(2)}
                                      </span>
                                      <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                        EFT & PayShap: R{day.eftTotal.toFixed(2)}
                                      </span>
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                      <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                      <input 
                                        type="text" 
                                        placeholder="Search order #, customer..." 
                                        value={dailyDrawerSearch}
                                        onChange={(e) => { 
                                          setDailyDrawerSearch(e.target.value); 
                                          setDailyDrawerPage(1); 
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ fontSize: '12px', padding: '5px 10px 5px 30px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '190px' }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Branch Filter Tabs */}
                                <div style={{ padding: '8px 16px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '4px' }}>Filter Branch:</span>
                                  <button
                                    type="button"
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setDailyDrawerBranchFilter('All'); 
                                      setDailyDrawerPage(1);
                                    }}
                                    style={{
                                      fontSize: '11px',
                                      padding: '3px 9px',
                                      borderRadius: '12px',
                                      border: '1px solid',
                                      borderColor: dailyDrawerBranchFilter === 'All' ? 'var(--brand-primary)' : '#e2e8f0',
                                      background: dailyDrawerBranchFilter === 'All' ? '#eff6ff' : '#ffffff',
                                      color: dailyDrawerBranchFilter === 'All' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                      fontWeight: dailyDrawerBranchFilter === 'All' ? 700 : 500,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    All ({dayOrders.length})
                                  </button>
                                  {BRANCHES.map(branchInfo => {
                                    const bName = branchInfo.name;
                                    const bCount = dayOrders.filter(o => o.branch === bName).length;
                                    if (bCount === 0) return null;
                                    const isSel = dailyDrawerBranchFilter === bName;
                                    return (
                                      <button
                                        key={bName}
                                        type="button"
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          setDailyDrawerBranchFilter(bName); 
                                          setDailyDrawerPage(1);
                                        }}
                                        style={{
                                          fontSize: '11px',
                                          padding: '3px 9px',
                                          borderRadius: '12px',
                                          border: '1px solid',
                                          borderColor: isSel ? 'var(--brand-primary)' : '#e2e8f0',
                                          background: isSel ? '#eff6ff' : '#ffffff',
                                          color: isSel ? 'var(--brand-primary)' : 'var(--text-secondary)',
                                          fontWeight: isSel ? 700 : 500,
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {bName} ({bCount})
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Compact Table */}
                                <div>
                                  {displayedDayOrders.length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                                      {dayOrders.length === 0 ? 'No orders recorded on this day.' : 'No orders match this filter / search.'}
                                    </div>
                                  ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <tr>
                                          <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Order #</th>
                                          <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Branch</th>
                                          <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Customer</th>
                                          <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Service & Load</th>
                                          <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Channel</th>
                                          <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                                          <th style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
                                          <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Action</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {paginatedOrders.map((o, idx) => {
                                          const isPaidCounter = o.paymentMethod === 'Speed Point/Cash(Paid at Counter)' || o.paymentStatus === 'Paid (Counter)';
                                          const isVerifiedEft = o.paymentStatus === 'Paid (EFT/PayShap Verified)';
                                          const isPendingPop = o.paymentStatus === 'POP Uploaded (Pending Verification)';
                                          const isRejected = o.paymentStatus.includes('Rejected');

                                          return (
                                            <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                                              <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                                                #{o.id}
                                              </td>
                                              <td style={{ padding: '9px 10px' }}>
                                                <span className="badge badge-in-use" style={{ fontSize: '10px', padding: '2px 6px' }}>{o.branch}</span>
                                              </td>
                                              <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-main)' }}>
                                                {o.customerName} <span style={{ color: 'var(--text-muted)', fontSize: '10.5px', fontWeight: 400 }}>({o.customerPhone})</span>
                                              </td>
                                              <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>
                                                {o.serviceName} • {o.weightOrQty} {o.unit}
                                              </td>
                                              <td style={{ padding: '9px 12px' }}>
                                                <span style={{ fontSize: '11px', color: isPaidCounter ? '#047857' : '#1d4ed8', fontWeight: 600 }}>
                                                  {isPaidCounter ? '💳 Speed Point / POS' : '📱 EFT / PayShap'}
                                                </span>
                                              </td>
                                              <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                                                <span style={{
                                                  fontSize: '10.5px',
                                                  padding: '2px 7px',
                                                  borderRadius: '10px',
                                                  fontWeight: 600,
                                                  background: isPaidCounter ? '#ecfdf5' : isVerifiedEft ? '#eff6ff' : isPendingPop ? '#fef3c7' : isRejected ? '#fee2e2' : '#f3f4f6',
                                                  color: isPaidCounter ? '#047857' : isVerifiedEft ? '#1d4ed8' : isPendingPop ? '#b45309' : isRejected ? '#dc2626' : '#6b7280'
                                                }}>
                                                  {isPaidCounter ? '✓ Paid (Till)' : isVerifiedEft ? '✓ Verified EFT' : isPendingPop ? 'Pending POP' : isRejected ? 'Rejected' : 'Awaiting'}
                                                </span>
                                              </td>
                                              <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontSize: '12.5px' }}>
                                                R{o.amount.toFixed(2)}
                                              </td>
                                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                                {o.proofOfPayment?.fileData ? (
                                                  <button
                                                    type="button"
                                                    className="btn btn-outline"
                                                    style={{ minHeight: '26px', padding: '2px 8px', fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedPopOrder(o); }}
                                                  >
                                                    <Eye size={11} /> POP Slip
                                                  </button>
                                                ) : (
                                                  <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>—</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>

                                {/* Pagination Controls (Showing 5 items at a time) */}
                                {displayedDayOrders.length > 0 && (
                                  <div style={{ padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                      Showing <strong>{startIndex + 1}–{Math.min(startIndex + DAILY_PAGE_SIZE, displayedDayOrders.length)}</strong> of <strong>{displayedDayOrders.length}</strong> orders (5 items per page)
                                    </div>

                                    {totalPages > 1 && (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                          type="button"
                                          disabled={currentPage <= 1}
                                          onClick={(e) => { e.stopPropagation(); setDailyDrawerPage(prev => Math.max(1, prev - 1)); }}
                                          style={{
                                            padding: '4px 10px',
                                            fontSize: '11.5px',
                                            fontWeight: 600,
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            background: currentPage <= 1 ? '#f1f5f9' : '#ffffff',
                                            color: currentPage <= 1 ? '#94a3b8' : 'var(--text-main)',
                                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
                                          }}
                                        >
                                          Previous
                                        </button>

                                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 6px' }}>
                                          Page {currentPage} of {totalPages}
                                        </span>

                                        <button
                                          type="button"
                                          disabled={currentPage >= totalPages}
                                          onClick={(e) => { e.stopPropagation(); setDailyDrawerPage(prev => Math.min(totalPages, prev + 1)); }}
                                          style={{
                                            padding: '4px 10px',
                                            fontSize: '11.5px',
                                            fontWeight: 600,
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            background: currentPage >= totalPages ? '#f1f5f9' : '#ffffff',
                                            color: currentPage >= totalPages ? '#94a3b8' : 'var(--text-main)',
                                            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                                          }}
                                        >
                                          Next
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })()}
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

      {/* Multi-Branch Digital Audit Ledger */}
      {(() => {
        const totalLedgerPages = Math.ceil(filteredOrders.length / LEDGER_PAGE_SIZE) || 1;
        const currentLedgerPage = Math.min(ledgerPage, totalLedgerPages);
        const startLedgerIndex = (currentLedgerPage - 1) * LEDGER_PAGE_SIZE;
        const paginatedLedgerOrders = filteredOrders.slice(startLedgerIndex, startLedgerIndex + LEDGER_PAGE_SIZE);

        return (
          <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            
            {/* Header Strip: Title, Breakdown Totals, Search (Same design as Daily Breakdown Drawer) */}
            <div style={{ padding: '12px 16px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong style={{ fontSize: '13.5px', color: 'var(--brand-primary)', display: 'block' }}>
                  Multi-Branch Digital Audit Ledger ({selectedMonthName})
                </strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  High-volume order breakdown with instant branch filtering
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '10px', fontSize: '12px' }}>
                  <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    Counter POS: R{monthPosRevenue.toFixed(2)}
                  </span>
                  <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    EFT & PayShap: R{monthEftPayShapRevenue.toFixed(2)}
                  </span>
                </div>

                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search order #, customer..."
                    value={ledgerSearch}
                    onChange={(e) => {
                      setLedgerSearch(e.target.value);
                      setLedgerPage(1);
                    }}
                    style={{ fontSize: '12px', padding: '5px 10px 5px 30px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '190px' }}
                  />
                </div>
              </div>
            </div>

            {/* Branch Filter Tabs */}
            <div style={{ padding: '8px 16px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '4px' }}>Filter Branch:</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedBranchFilter('All');
                  setLedgerPage(1);
                }}
                style={{
                  fontSize: '11px',
                  padding: '3px 9px',
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: selectedBranchFilter === 'All' ? 'var(--brand-primary)' : '#e2e8f0',
                  background: selectedBranchFilter === 'All' ? '#eff6ff' : '#ffffff',
                  color: selectedBranchFilter === 'All' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                  fontWeight: selectedBranchFilter === 'All' ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                All ({monthOrders.length})
              </button>
              {BRANCHES.map(branchInfo => {
                const bName = branchInfo.name;
                const bCount = monthOrders.filter(o => o.branch === bName).length;
                if (bCount === 0) return null;
                const isSel = selectedBranchFilter === bName;
                return (
                  <button
                    key={bName}
                    type="button"
                    onClick={() => {
                      setSelectedBranchFilter(bName);
                      setLedgerPage(1);
                    }}
                    style={{
                      fontSize: '11px',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: isSel ? 'var(--brand-primary)' : '#e2e8f0',
                      background: isSel ? '#eff6ff' : '#ffffff',
                      color: isSel ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {bName} ({bCount})
                  </button>
                );
              })}
            </div>

            {/* Table with original columns & Daily Drawer table design */}
            <div>
              {filteredOrders.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                  No orders match your filter for {selectedMonthName}.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Order ID</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Date / Time</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Branch</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Customer / Ref</th>
                        <th style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Service</th>
                        <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Garments</th>
                        <th style={{ padding: '9px 10px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Status</th>
                        <th style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Amount (ZAR)</th>
                        <th style={{ padding: '9px 12px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedLedgerOrders.map((o, idx) => {
                        const isPaidCounter = o.paymentStatus === 'Paid (Counter)' || o.paymentMethod === 'Speed Point/Cash(Paid at Counter)';
                        const isVerifiedEft = o.paymentStatus === 'Paid (EFT/PayShap Verified)';
                        const isPopPending = o.paymentStatus === 'POP Uploaded (Pending Verification)';
                        const isPopRejected = o.paymentStatus === 'POP Rejected (Re-upload Required)' || !!o.proofOfPayment?.rejected;
                        const dateStr = o.createdAt ? o.createdAt.slice(0, 10) : '';

                        return (
                          <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fcfcfd' }}>
                            <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                              #{o.id}
                            </td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                              {dateStr && <span style={{ display: 'block', fontSize: '10.5px', fontWeight: 600 }}>{dateStr}</span>}
                              {o.timestamp}
                            </td>
                            <td style={{ padding: '9px 10px' }}>
                              <span className="badge badge-in-use" style={{ fontSize: '10px', padding: '2px 6px' }}>{o.branch}</span>
                            </td>
                            <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-main)' }}>
                              {o.customerName}
                              {o.unitNumber && <span style={{ color: 'var(--brand-accent)', fontSize: '10.5px', marginLeft: '5px' }}>🏢 {o.unitNumber}</span>}
                              <span style={{ color: 'var(--text-muted)', fontSize: '10.5px', fontWeight: 400, marginLeft: '5px' }}>({o.customerPhone})</span>
                            </td>
                            <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>
                              {o.serviceName} ({o.weightOrQty} {o.unit})
                            </td>
                            <td style={{ padding: '9px 10px', color: 'var(--text-secondary)' }}>
                              {o.totalItemCount} items
                            </td>
                            <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                              <span style={{
                                fontSize: '10.5px',
                                padding: '2px 7px',
                                borderRadius: '10px',
                                fontWeight: 600,
                                background: isPaidCounter ? '#ecfdf5' : isVerifiedEft ? '#eff6ff' : isPopPending ? '#fef3c7' : isPopRejected ? '#fee2e2' : '#f3f4f6',
                                color: isPaidCounter ? '#047857' : isVerifiedEft ? '#1d4ed8' : isPopPending ? '#b45309' : isPopRejected ? '#dc2626' : '#6b7280'
                              }}>
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontSize: '12.5px' }}>
                              R{o.amount.toFixed(2)}
                            </td>
                            <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                              {isPopPending ? (
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ minHeight: '26px', padding: '2px 8px', fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => setSelectedPopOrder(o)}
                                >
                                  <ShieldCheck size={11} /> Review POP
                                </button>
                              ) : isPopRejected ? (
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  style={{ minHeight: '26px', padding: '2px 8px', fontSize: '10.5px', color: '#dc2626', borderColor: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => setSelectedPopOrder(o)}
                                >
                                  <RotateCcw size={11} /> Rejected POP
                                </button>
                              ) : isPaidCounter ? (
                                <span style={{ color: '#047857', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle2 size={12} /> Settled at Till
                                </span>
                              ) : isVerifiedEft && o.proofOfPayment?.fileData ? (
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  style={{ minHeight: '26px', padding: '2px 8px', fontSize: '10.5px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => setSelectedPopOrder(o)}
                                >
                                  <Eye size={11} /> POP Slip
                                </button>
                              ) : isVerifiedEft ? (
                                <span style={{ color: '#047857', fontSize: '11px', fontWeight: 600 }}>
                                  ✓ Verified EFT
                                </span>
                              ) : (
                                <span style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: 600 }}>
                                  Awaiting Customer POP
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination Controls (Same design as Daily Breakdown Drawer) */}
            {filteredOrders.length > 0 && (
              <div style={{ padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Showing <strong>{startLedgerIndex + 1}–{Math.min(startLedgerIndex + LEDGER_PAGE_SIZE, filteredOrders.length)}</strong> of <strong>{filteredOrders.length}</strong> orders (5 items per page)
                </div>

                {totalLedgerPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      disabled={currentLedgerPage <= 1}
                      onClick={() => setLedgerPage(prev => Math.max(1, prev - 1))}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: currentLedgerPage <= 1 ? '#f1f5f9' : '#ffffff',
                        color: currentLedgerPage <= 1 ? '#94a3b8' : 'var(--text-main)',
                        cursor: currentLedgerPage <= 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Previous
                    </button>

                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 6px' }}>
                      Page {currentLedgerPage} of {totalLedgerPages}
                    </span>

                    <button
                      type="button"
                      disabled={currentLedgerPage >= totalLedgerPages}
                      onClick={() => setLedgerPage(prev => Math.min(totalLedgerPages, prev + 1))}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: currentLedgerPage >= totalLedgerPages ? '#f1f5f9' : '#ffffff',
                        color: currentLedgerPage >= totalLedgerPages ? '#94a3b8' : 'var(--text-main)',
                        cursor: currentLedgerPage >= totalLedgerPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

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
        onConfirmRollover={handleConfirmRollover}
      />
    </div>
  );
};

export default AdminPortal;
