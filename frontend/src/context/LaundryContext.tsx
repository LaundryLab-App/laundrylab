import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  BranchName, 
  Order, 
  Machine, 
  ServiceRate, 
  BranchInfo,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  ProofOfPayment
} from '../types/laundry';

export const BRANCHES: BranchInfo[] = [
  { name: 'Absa Towers', address: 'Ground Floor, Absa Towers Main', machinesCount: 4, operatorName: 'Nokulunga' },
  { name: 'Zuri', address: 'Ground Floor, Zuri Towers', machinesCount: 4, operatorName: 'Ntombi' },
  { name: 'Nala', address: 'Ground Floor, Nala Suites', machinesCount: 4, operatorName: 'Nokulunga' },
  { name: 'The Encore', address: 'Ground Floor, The Encore Plaza', machinesCount: 4, operatorName: 'Smiso' },
  { name: 'Georgia', address: 'Ground Floor, Georgia House', machinesCount: 4, operatorName: 'Unassigned' },
  { name: 'Centurion', address: 'Ground Floor, Centurion Center', machinesCount: 4, operatorName: 'Unassigned' },
];

export const BANK_ACCOUNT_DETAILS = {
  bankName: 'NEDBANK LIMITED',
  accountType: 'CURRENT ACCOUNT',
  accountNumber: '1338934171',
  payShapNumber: '067 935 6086',
  operatingHours: 'MON - SUN: 8AM - 7PM',
  location: 'GROUND FLOOR',
  referenceGuide: 'NAME + UNIT NUMBER',
  disallowedNotice: 'CASH SEND & EWALLET NOT ACCEPTED',
  welcomeNotice: 'CASH PAYMENTS WELCOME • PAYSHAP AVAILABLE'
};

export const SERVICE_CATALOG: ServiceRate[] = [
  { name: 'Wash, Dry & Iron', rate: 36, unit: 'kg' },
  { name: 'Wash, Dry & Fold', rate: 35, unit: 'kg' },
  { name: 'Iron Only', rate: 33, unit: 'kg' },
  { name: 'Wash Only', rate: 30, unit: 'kg' },
  { name: 'Dry Only', rate: 30, unit: 'kg' },
  { name: 'Carpet Cleaning', rate: 60, unit: 'kg' },
  { name: 'Curtain Cleaning', rate: 80, unit: 'kg' },
  { name: 'Blanket Cleaning', rate: 80, unit: 'kg' },
  { name: 'Sneaker Wash', rate: 80, unit: 'pair' },
];

const INITIAL_MACHINES: Record<BranchName, Machine[]> = {
  'Absa Towers': [
    { id: 'absa-w1', code: 'W-01', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'absa-w2', code: 'W-02', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'absa-w3', code: 'W-03', type: 'Washing Machine', capacity: '12kg', status: 'Available' },
    { id: 'absa-w4', code: 'W-04', type: 'Washing Machine', capacity: '15kg', status: 'Available' },
  ],
  'Zuri': [
    { id: 'zuri-w1', code: 'W-01', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'zuri-w2', code: 'W-02', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'zuri-w3', code: 'W-03', type: 'Washing Machine', capacity: '12kg', status: 'Available' },
    { id: 'zuri-w4', code: 'W-04', type: 'Washing Machine', capacity: '15kg', status: 'Available' },
  ],
  'Nala': [
    { id: 'nala-w1', code: 'W-01', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'nala-w2', code: 'W-02', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'nala-w3', code: 'W-03', type: 'Washing Machine', capacity: '12kg', status: 'Available' },
    { id: 'nala-w4', code: 'W-04', type: 'Washing Machine', capacity: '15kg', status: 'Available' },
  ],
  'The Encore': [
    { id: 'enc-w1', code: 'W-01', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'enc-w2', code: 'W-02', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'enc-w3', code: 'W-03', type: 'Washing Machine', capacity: '12kg', status: 'Available' },
    { id: 'enc-w4', code: 'W-04', type: 'Washing Machine', capacity: '15kg', status: 'Available' },
  ],
  'Georgia': [
    { id: 'geo-w1', code: 'W-01', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'geo-w2', code: 'W-02', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'geo-w3', code: 'W-03', type: 'Washing Machine', capacity: '12kg', status: 'Available' },
    { id: 'geo-w4', code: 'W-04', type: 'Washing Machine', capacity: '15kg', status: 'Available' },
  ],
  'Centurion': [
    { id: 'cen-w1', code: 'W-01', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'cen-w2', code: 'W-02', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'cen-w3', code: 'W-03', type: 'Washing Machine', capacity: '12kg', status: 'Available' },
    { id: 'cen-w4', code: 'W-04', type: 'Washing Machine', capacity: '15kg', status: 'Available' },
  ],
};

const INITIAL_ORDERS: Order[] = [];

interface LaundryContextType {
  currentBranch: BranchName;
  setCurrentBranch: (branch: BranchName) => void;
  currentRole: 'Operator' | 'Owner';
  setCurrentRole: (role: 'Operator' | 'Owner') => void;
  orders: Order[];
  machines: Record<BranchName, Machine[]>;
  addOrder: (order: Omit<Order, 'id' | 'timestamp' | 'customerSignedOff' | 'smsSent'>) => Order;
  startWashCycle: (orderId: string, durationMinutes: number) => void;
  stopWashCycle: (orderId: string, reason?: string) => void;
  restartWashCycle: (orderId: string, durationMinutes: number) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updatePaymentStatus: (orderId: string, status: PaymentStatus, method?: PaymentMethod) => void;
  submitProofOfPayment: (orderId: string, pop: Omit<ProofOfPayment, 'verified' | 'verifiedAt' | 'verifiedBy'>) => void;
  verifyProofOfPayment: (orderId: string, verifiedBy?: string) => void;
  rejectProofOfPayment: (orderId: string, reason?: string, rejectedBy?: string) => void;
  customerSignoffGarments: (orderId: string, itemBreakdownMatch: boolean) => void;
  getBranchOrders: (branchName?: BranchName) => Order[];
  getBranchMachines: (branchName?: BranchName) => Machine[];
  toastMessage: { text: string; type: 'success' | 'error' } | null;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

const LaundryContext = createContext<LaundryContextType | undefined>(undefined);

export const LaundryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBranch, setCurrentBranch] = useState<BranchName>(() => {
    return (localStorage.getItem('laundrylab_branch') as BranchName) || 'Absa Towers';
  });

  const [currentRole, setCurrentRole] = useState<'Operator' | 'Owner'>(() => {
    return (localStorage.getItem('laundrylab_role') as 'Operator' | 'Owner') || 'Operator';
  });

  // Database is the single source of truth - no longer persisted in browser localStorage
  const [orders, setOrders] = useState<Order[]>([]);
  const [machines, setMachines] = useState<Record<BranchName, Machine[]>>(INITIAL_MACHINES);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Clean up legacy localStorage caches so the browser uses only DB state
  useEffect(() => {
    localStorage.removeItem('laundrylab_orders_v6');
    localStorage.removeItem('laundrylab_machines_v6');
    localStorage.removeItem('laundrylab_orders');
    localStorage.removeItem('laundrylab_machines');
  }, []);

  useEffect(() => {
    localStorage.setItem('laundrylab_branch', currentBranch);
  }, [currentBranch]);

  useEffect(() => {
    localStorage.setItem('laundrylab_role', currentRole);
  }, [currentRole]);

  // Initial fetch and continuous real-time sync with backend API (connected to Supabase)
  useEffect(() => {
    let isMounted = true;

    const syncFromBackend = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && Array.isArray(data.orders)) {
            setOrders(prev => {
              const bJson = JSON.stringify(data.orders);
              const pJson = JSON.stringify(prev);
              if (bJson !== pJson) {
                return data.orders;
              }
              return prev;
            });

            if (data.machines) {
              setMachines(prev => {
                const bJson = JSON.stringify(data.machines);
                const pJson = JSON.stringify(prev);
                return bJson !== pJson ? data.machines : prev;
              });
            }
          }
        }
      } catch (err) {
        // Backend not reached, keep current state
      }
    };

    syncFromBackend();
    const interval = setInterval(syncFromBackend, 1500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Push state updates directly to backend DB (no localStorage writes)
  useEffect(() => {
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders, machines })
    }).catch(() => {});
  }, [orders, machines]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const addOrder = (newOrderData: Omit<Order, 'id' | 'timestamp' | 'customerSignedOff' | 'smsSent'>): Order => {
    const nextId = (1080 + orders.length + 1).toString();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newOrder: Order = {
      ...newOrderData,
      id: nextId,
      timestamp,
      customerSignedOff: false,
      smsSent: true
    };

    setOrders(prev => [newOrder, ...prev]);

    setMachines(prev => {
      const branchList = [...(prev[newOrder.branch] || [])];
      const targetIdx = branchList.findIndex(m => m.code === newOrder.machineCode);
      if (targetIdx !== -1) {
        branchList[targetIdx] = {
          ...branchList[targetIdx],
          status: 'Available',
          currentOrderId: nextId,
          timeRemainingMinutes: undefined
        };
      }
      return { ...prev, [newOrder.branch]: branchList };
    });

    showToast(`Order #${nextId} logged! SMS sent to ${newOrder.customerPhone}`);
    return newOrder;
  };

  const startWashCycle = (orderId: string, durationMinutes: number) => {
    const startIso = new Date().toISOString();
    
    setOrders(currentOrders => {
      const updatedOrders = currentOrders.map(o => o.id === orderId ? {
        ...o,
        status: 'In Progress' as const,
        startedAt: startIso,
        durationMinutes: durationMinutes
      } : o);
      
      const order = updatedOrders.find(o => o.id === orderId);
      if (order) {
        setMachines(prev => {
          const branchList = [...(prev[order.branch] || [])];
          const targetIdx = branchList.findIndex(m => m.code === order.machineCode);
          if (targetIdx !== -1) {
            branchList[targetIdx] = {
              ...branchList[targetIdx],
              status: 'In Use',
              currentOrderId: orderId,
              timeRemainingMinutes: durationMinutes
            };
          }
          return { ...prev, [order.branch]: branchList };
        });
        showToast(`Machine ${order.machineCode} started for Order #${orderId} (${durationMinutes} mins)`);
      }
      return updatedOrders;
    });
  };

  // Keep machines remaining times in sync with real elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setMachines(prev => {
        let changed = false;
        const updated = { ...prev };
        
        for (const branch in updated) {
          const branchList = [...updated[branch as BranchName]];
          let branchChanged = false;
          
          for (let i = 0; i < branchList.length; i++) {
            const m = branchList[i];
            if (m.status === 'In Use' && m.currentOrderId) {
              const order = orders.find(o => o.id === m.currentOrderId);
              if (order && order.startedAt && order.durationMinutes) {
                const startMs = new Date(order.startedAt).getTime();
                const durationMs = order.durationMinutes * 60 * 1000;
                const elapsedMs = Date.now() - startMs;
                const remainingMs = durationMs - elapsedMs;
                const remainingMins = remainingMs <= 0 ? 0 : Math.ceil(remainingMs / 60000);
                
                if (remainingMs <= 0) {
                  branchList[i] = {
                    ...m,
                    status: 'Cycle Completed',
                    timeRemainingMinutes: 0
                  };
                  branchChanged = true;
                  changed = true;
                } else if (m.timeRemainingMinutes !== remainingMins) {
                  branchList[i] = {
                    ...m,
                    timeRemainingMinutes: remainingMins
                  };
                  branchChanged = true;
                  changed = true;
                }
              }
            }
          }
          if (branchChanged) {
            updated[branch as BranchName] = branchList;
          }
        }
        return changed ? updated : prev;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [orders]);

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => {
      const updated = prev.map(o => o.id === orderId ? { ...o, status } : o);
      
      if (status === 'Ready for Pickup') {
        const order = updated.find(o => o.id === orderId);
        if (order) {
          setMachines(machinesPrev => {
            const branchList = [...(machinesPrev[order.branch] || [])];
            const targetIdx = branchList.findIndex(m => m.code === order.machineCode);
            if (targetIdx !== -1) {
              branchList[targetIdx] = {
                ...branchList[targetIdx],
                status: 'Available',
                currentOrderId: undefined,
                timeRemainingMinutes: undefined
              };
            }
            return { ...machinesPrev, [order.branch]: branchList };
          });
        }
      }
      
      return updated;
    });
    
    showToast(`Order #${orderId} status set to ${status}`);
  };

  const updatePaymentStatus = (orderId: string, paymentStatus: PaymentStatus, method?: PaymentMethod) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      paymentStatus,
      paymentMethod: method || o.paymentMethod
    } : o));
    showToast(`Order #${orderId} payment updated to ${paymentStatus}`);
  };

  const submitProofOfPayment = (
    orderId: string, 
    popData: Omit<ProofOfPayment, 'verified' | 'verifiedAt' | 'verifiedBy'>
  ) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const newPop: ProofOfPayment = {
          ...popData,
          verified: false
        };
        const method: PaymentMethod = 'Pay Later (EFT / PayShap / Proof of Payment)';
        return {
          ...o,
          paymentStatus: 'POP Uploaded (Pending Verification)',
          paymentMethod: method,
          proofOfPayment: newPop
        };
      }
      return o;
    }));
    showToast(`Proof of payment uploaded for Order #${orderId}! Pending staff verification.`);
  };

  const verifyProofOfPayment = (orderId: string, verifiedBy: string = 'Staff Operator') => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const updatedPop: ProofOfPayment | undefined = o.proofOfPayment ? {
          ...o.proofOfPayment,
          verified: true,
          verifiedAt: nowStr,
          verifiedBy,
          rejected: false
        } : undefined;
        return {
          ...o,
          paymentStatus: 'Paid (EFT/PayShap Verified)',
          proofOfPayment: updatedPop
        };
      }
      return o;
    }));

    // Directly persist to backend endpoint so background poller doesn't race
    fetch(`/api/orders/${orderId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verifiedBy })
    }).then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.order) {
          setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
        }
      })
      .catch(() => {});

    showToast(`Order #${orderId} payment verified & approved!`);
  };

  const stopWashCycle = (orderId: string, reason?: string) => {
    setOrders(currentOrders => {
      const updatedOrders = currentOrders.map(o => o.id === orderId ? {
        ...o,
        status: 'Awaiting Start' as const,
        startedAt: undefined,
        durationMinutes: undefined
      } : o);

      const order = currentOrders.find(o => o.id === orderId);
      if (order) {
        setMachines(prev => {
          const branchList = [...(prev[order.branch] || [])];
          const targetIdx = branchList.findIndex(m => m.code === order.machineCode);
          if (targetIdx !== -1) {
            branchList[targetIdx] = {
              ...branchList[targetIdx],
              status: 'Available',
              currentOrderId: undefined,
              timeRemainingMinutes: undefined
            };
          }
          return { ...prev, [order.branch]: branchList };
        });
        showToast(`Wash cycle stopped for Order #${orderId} on machine ${order.machineCode}. Machine reset to Available.${reason ? ' (' + reason + ')' : ''}`);
      }
      return updatedOrders;
    });
  };

  const restartWashCycle = (orderId: string, durationMinutes: number) => {
    startWashCycle(orderId, durationMinutes);
    showToast(`Wash cycle restarted for Order #${orderId} (${durationMinutes} mins)`);
  };

  const rejectProofOfPayment = (orderId: string, reason?: string, rejectedBy: string = 'Management') => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const finalReason = reason || 'Receipt reference not matching statement or incorrect amount.';
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentStatus: 'POP Rejected (Re-upload Required)',
          proofOfPayment: o.proofOfPayment ? {
            ...o.proofOfPayment,
            rejected: true,
            rejectionReason: finalReason,
            rejectedAt: nowStr,
            rejectedBy,
            verified: false
          } : {
            uploadedAt: nowStr,
            reference: 'None',
            paymentChannel: 'Nedbank EFT',
            verified: false,
            rejected: true,
            rejectionReason: finalReason,
            rejectedAt: nowStr,
            rejectedBy
          }
        };
      }
      return o;
    }));

    // Directly persist to backend endpoint so background poller doesn't race
    fetch(`/api/orders/${orderId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: finalReason, rejectedBy })
    }).then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.order) {
          setOrders(prev => prev.map(o => o.id === orderId ? data.order : o));
        }
      })
      .catch(() => {});

    showToast(`POP rejected for Order #${orderId}: ${finalReason}. Customer notified to re-upload.`, 'error');
  };

  const customerSignoffGarments = (orderId: string, itemBreakdownMatch: boolean) => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOrders(prev => prev.map(o => o.id === orderId ? {
      ...o,
      status: 'Completed',
      customerSignedOff: itemBreakdownMatch,
      signedOffAt: nowStr
    } : o));

    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      setMachines(prev => {
        const branchList = [...(prev[targetOrder.branch] || [])];
        const targetIdx = branchList.findIndex(m => m.code === targetOrder.machineCode);
        if (targetIdx !== -1 && branchList[targetIdx].currentOrderId === orderId) {
          branchList[targetIdx] = {
            ...branchList[targetIdx],
            status: 'Available',
            currentOrderId: undefined,
            timeRemainingMinutes: undefined
          };
        }
        return { ...prev, [targetOrder.branch]: branchList };
      });
    }

    showToast(`Order #${orderId} garments verified & signed off by customer!`);
  };

  const getBranchOrders = (branchName?: BranchName) => {
    const b = branchName || currentBranch;
    return orders.filter(o => o.branch === b);
  };

  const getBranchMachines = (branchName?: BranchName) => {
    const b = branchName || currentBranch;
    const baseList = machines[b] || [];
    return baseList.map(m => {
      const activeOrder = orders.find(o => 
        o.branch === b && 
        o.machineCode === m.code && 
        o.status === 'In Progress' && 
        o.startedAt && 
        o.durationMinutes
      );
      if (activeOrder) {
        const startMs = new Date(activeOrder.startedAt!).getTime();
        const durationMs = activeOrder.durationMinutes! * 60 * 1000;
        const remainingMs = durationMs - (Date.now() - startMs);
        if (remainingMs > 0) {
          return {
            ...m,
            status: 'In Use' as const,
            currentOrderId: activeOrder.id,
            timeRemainingMinutes: Math.ceil(remainingMs / 60000)
          };
        } else {
          return {
            ...m,
            status: 'Cycle Completed' as const,
            currentOrderId: activeOrder.id,
            timeRemainingMinutes: 0
          };
        }
      }
      return m;
    });
  };

  return (
    <LaundryContext.Provider
      value={{
        currentBranch,
        setCurrentBranch,
        currentRole,
        setCurrentRole,
        orders,
        machines,
        addOrder,
        startWashCycle,
        stopWashCycle,
        restartWashCycle,
        updateOrderStatus,
        updatePaymentStatus,
        submitProofOfPayment,
        verifyProofOfPayment,
        rejectProofOfPayment,
        customerSignoffGarments,
        getBranchOrders,
        getBranchMachines,
        toastMessage,
        showToast
      }}
    >
      {children}
    </LaundryContext.Provider>
  );
};

export const useLaundry = () => {
  const context = useContext(LaundryContext);
  if (!context) throw new Error('useLaundry must be used within a LaundryProvider');
  return context;
};
