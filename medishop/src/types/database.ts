// ============================================================
// src/types/database.ts
// TypeScript types mirroring the Supabase database schema.
// ============================================================

export type MedicineCategory =
  | "tablet" | "capsule" | "syrup" | "injection" | "ointment"
  | "cream" | "drops" | "inhaler" | "patch" | "powder" | "other";

export type PaymentMode = "cash" | "upi" | "credit";
export type SellType = "strip" | "loose";
export type WriteoffReason = "expired" | "damaged" | "other";
export type AuditRecordType =
  | "medicine" | "batch" | "sale" | "sale_item" | "return"
  | "writeoff" | "supplier" | "customer" | "customer_payment";
export type ExpiryStatus = "expired" | "red" | "orange" | "green";
export type AppLanguage = "en" | "hi" | "mr";

export interface Supplier {
  id: string; name: string; phone: string | null;
  return_window_days: number; notes: string | null;
  created_at: string; updated_at: string;
}

export interface Medicine {
  id: string; name: string; generic_name: string | null;
  category: MedicineCategory; loose_eligible: boolean;
  tablets_per_strip: number; rx_required: boolean;
  barcode: string | null; cost_price: number; selling_price: number;
  loose_price: number | null; reorder_level: number;
  is_critical: boolean; supplier_id: string | null;
  symptoms: string[] | null; is_active: boolean;
  created_at: string; updated_at: string;
  // Computed (joined)
  supplier?: Supplier; stock_display?: string; total_tablets?: number;
}

export interface Batch {
  id: string; medicine_id: string; batch_number: string;
  expiry_date: string; quantity_tablets: number; opened_strips: number;
  date_received: string; is_active: boolean;
  created_at: string; updated_at: string;
  // Computed
  medicine?: Medicine; expiry_status?: ExpiryStatus; days_left?: number;
}

export interface Customer {
  id: string; name: string; phone: string | null;
  balance_owed: number; notes: string | null;
  created_at: string; updated_at: string;
}

export interface CustomerPayment {
  id: string; customer_id: string; amount: number;
  notes: string | null; paid_at: string;
  customer?: Customer;
}

export interface Sale {
  id: string; subtotal: number;
  discount_flat: number | null; discount_pct: number | null;
  discount_reason: string | null; total_amount: number;
  payment_mode: PaymentMode; customer_id: string | null;
  receipt_generated: boolean; is_completed: boolean; created_at: string;
  customer?: Customer; items?: SaleItem[];
}

export interface SaleItem {
  id: string; sale_id: string; medicine_id: string; batch_id: string;
  quantity_tablets: number; sell_type: SellType;
  price_at_sale: number; line_total: number; created_at: string;
  medicine?: Medicine; batch?: Batch;
}

export interface Return {
  id: string; sale_id: string | null; items: ReturnItem[];
  reason: string | null; refund_amount: number | null; returned_at: string;
}

export interface ReturnItem {
  medicine_id: string; batch_id: string;
  quantity_tablets: number; sell_type: SellType;
}

export interface Writeoff {
  id: string; medicine_id: string; batch_id: string;
  quantity_tablets: number; reason: WriteoffReason;
  notes: string | null; written_off_at: string;
  medicine?: Medicine; batch?: Batch;
}

export interface AuditLogEntry {
  id: string; record_type: AuditRecordType; record_id: string;
  field_name: string; old_value: string | null; new_value: string | null;
  changed_by: string | null; changed_at: string;
}

export interface AppSettings {
  id: string; pin_hash: string | null; auto_lock_minutes: number;
  language: AppLanguage; last_backup_at: string | null;
  whatsapp_number: string | null; first_run_done: boolean; updated_at: string;
}

export interface DashboardSummary {
  yesterday_total: number; today_total: number;
  expiring_this_week: number; expiring_this_month: number;
  low_stock_count: number; total_credit_owed: number;
}

export interface CartItem {
  medicine: Medicine; batch: Batch;
  quantity_tablets: number; sell_type: SellType;
  price_at_sale: number; line_total: number;
  item_discount_flat?: number; item_discount_pct?: number;
}

export interface Cart {
  items: CartItem[]; payment_mode: PaymentMode;
  customer_id?: string; bill_discount_flat?: number;
  bill_discount_pct?: number; discount_reason?: string;
}
