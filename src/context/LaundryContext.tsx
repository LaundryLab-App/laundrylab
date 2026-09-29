import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  BranchName, 
  Order, 
  Machine, 
  User, 
  ServiceRate, 
  BranchInfo,
  PaymentMethod,
  PaymentStatus,
  OrderStatus 
} from '../types/laundry';

export const BRANCHES: BranchInfo[] = [
  { name: 'Absa Towers', address: 'Ground Floor, Absa Towers Main', machinesCount: 4, operatorName: 'Jane Doe' },
  { name: 'Zuri', address: 'Ground Floor, Zuri Towers', machinesCount: 4, operatorName: 'Mike Ross' },
  { name: 'Nala', address: 'Ground Floor, Nala Suites', machinesCount: 4, operatorName: 'Sarah Connor' },
  { name: 'The Encore', address: 'Ground Floor, The Encore Plaza', machinesCount: 4, operatorName: 'Alex Mercer' },
  { name: 'Georgia', address: 'Ground Floor, Georgia House', machinesCount: 4, operatorName: 'Emily Blunt' },
  { name: 'Centurion', address: 'Ground Floor, Centurion Center', machinesCount: 4, operatorName: 'David Vance' },
];

export const SERVICE_CATALOG: ServiceRate[] = [
  { name: 'Wash, Dry & Fold', rate: 25, unit: 'kg' },
  { name: 'Wash, Dry & Iron', rate: 30, unit: 'kg' },
  { name: 'Iron Only', rate: 30, unit: 'kg' },
  { name: 'Wash Only', rate: 25, unit: 'kg' },
  { name: 'Dry Only', rate: 30, unit: 'kg' },
  { name: 'Carpet Cleaning', rate: 60, unit: 'kg' },
  { name: 'Curtain Cleaning', rate: 70, unit: 'kg' },
  { name: 'Blanket Cleaning', rate: 70, unit: 'kg' },
  { name: 'Sneaker Wash', rate: 80, unit: 'pair' },
];

const INITIAL_MACHINES: Record<BranchName, Machine[]> = {
  'Absa Towers': [
    { id: 'absa-w1', code: 'W-01', type: 'Washing Machine', capacity: '10kg', status: 'In Use', currentOrderId: '1081', timeRemainingMinutes: 25 },
    { id: 'absa-w2', code: 'W-02', type: 'Washing Machine', capacity: '10kg', status: 'Available' },
    { id: 'absa-w3', code: 'W-03', type: 'Washing Machine', capacity: '12kg', status: 'In Use', currentOrderId: '1082', timeRemainingMinutes: 40 },
    { id: 'absa-w4', code: 'W-04', type: 'Washing Machine', capacity: '15kg', status: 'Available' },
  ],
  'Zuri': [
    { id: 'zuri-w1', code: 'W-01', type: 'Washing Machine', capacity: '10kg', status: 'In Use', currentOrderId: '1083', timeRemainingMinutes: 15 },
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

const INITIAL_ORDERS: Order[] = [
  {
    id: '1081',
    timestamp: '09:15 AM',
    branch: 'Absa Towers',
    staffName: 'Jane Doe',
    machineCode: 'W-01',
    customerName: 'John Miller',
    customerPhone: '067 555 0192',
    serviceName: 'Wash, Dry & Fold',
    ratePerUnit: 25,
    weightOrQty: 4.5,
    unit: 'kg',
    itemsBreakdown: { shirts: 4, pants: 2, jackets: 1, towels: 1 },
    totalItemCount: 8,
    itemsReturned: 8,
    paymentMethod: 'Speed Point (Card POS)',
    paymentStatus: 'Paid (POS)',
    amount: 112.50,
    status: 'In Progress',
    customerSignedOff: false,
    smsSent: true
  },
  {
    id: '1082',
    timestamp: '10:05 AM',
    branch: 'Absa Towers',
    staffName: 'Jane Doe',
    machineCode: 'W-03',
    customerName: 'Sarah Jenkins',
    customerPhone: '067 888 2341',
    serviceName: 'Sneaker Wash',
    ratePerUnit: 80,
    weightOrQty: 2,
    unit: 'pair',
    itemsBreakdown: { shirts: 0, pants: 0, jackets: 0, towels: 2 },
    totalItemCount: 2,
    itemsReturned: 2,
    paymentMethod: 'Online (SMS Link)',
    paymentStatus: 'Pending',
    amount: 160.00,
    status: 'In Progress',
    customerSignedOff: false,
    smsSent: true
  },
  {
    id: '1083',
    timestamp: '10:30 AM',
    branch: 'Zuri',
    staffName: 'Mike Ross',
    machineCode: 'W-01',
    customerName: 'David Beckham',
    customerPhone: '072 111 4455',
    serviceName: 'Blanket Cleaning',
    ratePerUnit: 70,
    weightOrQty: 3.0,
    unit: 'kg',
    itemsBreakdown: { shirts: 0, pants: 0, jackets: 0, towels: 2 },
    totalItemCount: 2,
    itemsReturned: 2,
    paymentMethod: 'Speed Point (Card POS)',
    paymentStatus: 'Paid (POS)',
    amount: 210.00,
    status: 'Completed',
    customerSignedOff: true,
    signedOffAt: '11:45 AM',
    smsSent: true
  }
];

interface LaundryContextType {
  currentBranch: BranchName;
  setCurrentBranch: (branch: BranchName) => void;
  currentRole: 'Operator' | 'Owner';
  setCurrentRole: (role: 'Operator' | 'Owner') => void;
  orders: Order[];
  machines: Record<BranchName, Machine[]>;
  addOrder: (order: Omit<Order, 'id' | 'timestamp' | 'customerSignedOff' | 'smsSent'>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updatePaymentStatus: (orderId: string, status: PaymentStatus, method?: PaymentMethod) => void;
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

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('laundrylab_orders_v2');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [machines, setMachines] = useState<Record<BranchName, Machine[]>>(() => {
    const saved = localStorage.getItem('laundrylab_machines_v2');
    return saved ? JSON.parse(saved) : INITIAL_MACHINES;
  });

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    localStorage.setItem('laundrylab_branch', currentBranch);
  }, [currentBranch]);

  useEffect(() => {
    localStorage.setItem('laundrylab_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('laundrylab_orders_v2', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('laundrylab_machines_v2', JSON.stringify(machines));
  }, [machines]);

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

    // Update machine status to In Use
    setMachines(prev => {
      const branchList = [...(prev[newOrder.branch] || [])];
      const targetIdx = branchList.findIndex(m => m.code === newOrder.machineCode);
      if (targetIdx !== -1) {
        branchList[targetIdx] = {
          ...branchList[targetIdx],
          status: 'In Use',
          currentOrderId: nextId,
          timeRemainingMinutes: 35
        };
      }
      return { ...prev, [newOrder.branch]: branchList };
    });

    showToast(`Order #${nextId} created! SMS receipt & tracking link sent to ${newOrder.customerPhone}`);
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { ...o, status };
      }
      return o;
    }));
    showToast(`Order #${orderId} status updated to ${status}`);
  };

  const updatePaymentStatus = (orderId: string, paymentStatus: PaymentStatus, method?: PaymentMethod) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentStatus,
          paymentMethod: method || o.paymentMethod
        };
      }
      return o;
    }));
    showToast(`Order #${orderId} payment confirmed!`);
  };

  const customerSignoffGarments = (orderId: string, itemBreakdownMatch: boolean) => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'Completed',
          customerSignedOff: itemBreakdownMatch,
          signedOffAt: nowStr
        };
      }
      return o;
    }));

    // Free up machine if needed
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      setMachines(prev => {
        const branchList = [...(prev[targetOrder.branch] || [])];
        const targetIdx = branchList.findIndex(m => m.code === targetOrder.machineCode);
        if (targetIdx !== -1) {
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

    showToast(`Order #${orderId} garments verified & signed off by customer at ${nowStr}!`);
  };

  const getBranchOrders = (branchName?: BranchName) => {
    const b = branchName || currentBranch;
    return orders.filter(o => o.branch === b);
  };

  const getBranchMachines = (branchName?: BranchName) => {
    const b = branchName || currentBranch;
    return machines[b] || [];
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
        updateOrderStatus,
        updatePaymentStatus,
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
  if (!context) {
    throw new Error('useLaundry must be used within a LaundryProvider');
  }
  return context;
};
