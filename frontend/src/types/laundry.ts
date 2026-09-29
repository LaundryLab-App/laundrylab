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
  capacity: string; // e.g. "10kg", "12kg", "15kg"
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
  | 'Pay Later (EFT / PayShap / Proof of Payment)'
  | 'Speed Point/Cash(Paid at Counter)';

export type PaymentStatus = 
  | 'Pending (Pay Later)' 
  | 'POP Uploaded (Pending Verification)' 
  | 'POP Rejected (Re-upload Required)'
  | 'Paid (Counter)' 
  | 'Paid (EFT/PayShap Verified)' 
  | 'Pending';

export type OrderStatus = 'Awaiting Start' | 'In Progress' | 'Ready for Pickup' | 'Completed';

export interface ProofOfPayment {
  fileData?: string; // Base64 data URL for receipt image or preview
  fileName?: string;
  uploadedAt: string;
  reference: string;
  paymentChannel: 'PayShap' | 'Nedbank EFT' | 'Cash at Counter';
  notes?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  rejected?: boolean;
  rejectionReason?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}

export interface Order {
  id: string;
  timestamp: string;
  branch: BranchName;
  staffName: string;
  machineCode: string; // W-01, W-02, W-03, W-04
  customerName: string;
  customerPhone: string;
  unitNumber?: string; // Customer unit/apartment number for payment reference
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
  startedAt?: string;
  durationMinutes?: number;
  proofOfPayment?: ProofOfPayment;
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

