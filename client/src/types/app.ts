// ---- Factor (Purchases + Payments) ----

export interface Factor {
  id: string;
  customerId: string;
  createdAt?: string;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
}

export interface Purchase {
  id: string;
  description: string;
  quantity: number;
  amount: number;
  date: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
}

// ---- Legacy / unused (kept for reference, do not use in new Factor UI) ----
export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export interface InvoiceItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}
export interface Invoice {
  id: string;
  customerId: string;
  items: InvoiceItem[];
  subtotal?: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  createdAt: string;
}
export interface InvoicePayment {
  id: string;
  amount: number;
  date: string;
}

// ---- Projects & 360 ----

export interface Project {
  id: string;
  name: string;
  address?: string;
  customerId: string | null;
  is360Unlocked: boolean;
  is3DUnlocked: boolean;
}

export interface SceneHotspot {
  pitch: number;
  yaw: number;
  targetSceneIndex?: number;
  type: 'circle' | 'arrow';
  rotation?: number;
}

export interface WeekScene {
  imageUrl: string;
  roomName: string;
  hotspots?: SceneHotspot[];
  /** Optional flag to mark this scene as the main / default one for the week. */
  isMain?: boolean;
}

export interface Week {
  id: string;
  weekNumber: number;
  title: string;
  createdAt: string;
  scenes: WeekScene[];
}
