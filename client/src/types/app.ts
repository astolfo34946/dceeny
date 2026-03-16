// ---- Factor (Purchases + Payments) ----

export interface Factor {
  id: string;
  customerId: string;
  createdAt?: string;
  totalPurchases: number;
  totalPaid: number;
  balance: number;
}

/** Unit type for invoice line items. */
export type PurchaseUnit = 'unit' | 'm' | 'm2';

export interface Purchase {
  id: string;
  description: string;
  quantity: number;
  /** Unit of measure: unit, m, or m2 */
  unit?: PurchaseUnit;
  /** Unit price (prix). Line total = quantity * unitPrice. */
  unitPrice?: number;
  /** Line total (quantity × unitPrice). Stored for factor totals. */
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
  /** Optional project gallery (normal photos, not panoramas). Stored as ordered array in Firestore. */
  gallery?: ProjectGalleryImage[];
}

export interface ProjectGalleryImage {
  url: string;
  caption?: string;
  createdAt?: string;
}

export interface SceneHotspot {
  pitch: number;
  yaw: number;
  targetSceneIndex?: number;
  type: 'circle' | 'arrow';
  rotation?: number;
  /** Optional custom label for the button (defaults to target room name). */
  label?: string;
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
