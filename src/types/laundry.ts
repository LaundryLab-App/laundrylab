export type BranchName = 
  | 'Absa Towers'
  | 'Zuri'
  | 'Nala'
  | 'The Encore'
  | 'Georgia'
  | 'Centurion';

export type Role = 'Operator' | 'Supervisor' | 'Owner';

export interface User {
  id: string;
  name: string;
  role: Role;
  assignedBranch: BranchName | 'All Branches';
}

export type MachineStatus = 'Available' | 'In Use' | 'Cycle Completed' | 'Maintenance';

export interface Machine {
  id: string;
  code: string; // e.g. "W-01", "W-02", "W-03", "W-04"
  type: 'Washing Machine'; // All 4 machines are washing machines (no dryers)
  capacity: string; // e.g. "8kg" or "12kg"
  status: MachineStatus;
  currentOrderId?: string;
  timeRemainingMinutes?: number;
}

export interface ItemBreakdown {
  shirts: number;
  pants: number;
  jackets: number;
  towels: number;
}

export type PaymentMethod = 
  | 'Speed Point (Card POS)'
  | 'Online (SMS Link)'
  | 'LaundryPass Account';

export type PaymentStatus = 'Pending' | 'Paid (POS)' | 'Paid (Online)' | 'Paid (Account)';

export type OrderStatus = 'Awaiting Start' | 'In Progress' | 'Ready for Pickup' | 'Completed';

export interface Order {
  id: string;
  timestamp: string;
  branch: BranchName;
  staffName: string;
  machineCode: string; // W-01, W-02, W-03, W-04
  customerName: string;
  customerPhone: string;
  serviceName: string;
  ratePerUnit: number;
  weightOrQty: number; // kg or pairs
  unit: 'kg' | 'pair';
  itemsBreakdown: ItemBreakdown;
  totalItemCount: number;
  itemsReturned: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  amount: number;
  status: OrderStatus;
  customerSignedOff: boolean;
  signedOffAt?: string;
  smsSent: boolean;
}

export interface BranchInfo {
  name: BranchName;
  address: string;
  machinesCount: number; // Always 4 washing machines
  operatorName: string;
}

export interface ServiceRate {
  name: string;
  rate: number;
  unit: 'kg' | 'pair';
}
