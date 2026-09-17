// ============================================================
// src/lib/offline/db.ts
// Dexie (IndexedDB) schema — local-first offline database.
// All writes go here first; a background sync job pushes to Supabase.
// ============================================================

import Dexie, { type Table } from "dexie";
import type {
  Medicine,
  Batch,
  Sale,
  SaleItem,
  Customer,
  CustomerPayment,
  Supplier,
  Return,
  Writeoff,
  AuditLogEntry,
  AppSettings,
  Cart,
} from "@/types/database";

// ─── Sync envelope ───────────────────────────────────────────
// Every locally-created record gets a sync status so the sync
// engine knows what to push to Supabase.
export type SyncStatus = "pending" | "synced" | "error";

export interface LocalSale extends Sale {
  _sync: SyncStatus;
  _local_id?: string; // used before we know the server UUID
}

export interface LocalSaleItem extends SaleItem {
  _sync: SyncStatus;
}

export interface LocalReturn extends Return {
  _sync: SyncStatus;
}

export interface LocalWriteoff extends Writeoff {
  _sync: SyncStatus;
}

export interface LocalCustomerPayment extends CustomerPayment {
  _sync: SyncStatus;
}

// ─── Pending ops queue (for conflict-safe sync) ──────────────
export type OpType =
  | "INSERT_SALE"
  | "INSERT_RETURN"
  | "INSERT_WRITEOFF"
  | "INSERT_CUSTOMER_PAYMENT"
  | "UPDATE_MEDICINE"
  | "UPDATE_BATCH"
  | "INSERT_MEDICINE"
  | "INSERT_BATCH"
  | "INSERT_SUPPLIER"
  | "UPDATE_SUPPLIER"
  | "INSERT_CUSTOMER"
  | "UPDATE_CUSTOMER"
  | "UPDATE_APP_SETTINGS";

export interface PendingOp {
  id?: number; // Dexie auto-increment
  op_type: OpType;
  payload: unknown;
  created_at: string;
  attempts: number;
  last_error?: string;
}

// ─── Dexie schema ────────────────────────────────────────────
class MediShopDB extends Dexie {
  medicines!: Table<Medicine>;
  batches!: Table<Batch>;
  sales!: Table<LocalSale>;
  sale_items!: Table<LocalSaleItem>;
  customers!: Table<Customer>;
  customer_payments!: Table<LocalCustomerPayment>;
  suppliers!: Table<Supplier>;
  returns!: Table<LocalReturn>;
  writeoffs!: Table<LocalWriteoff>;
  audit_log!: Table<AuditLogEntry>;
  app_settings!: Table<AppSettings>;
  pending_ops!: Table<PendingOp>;
  // Cart persisted locally so a crash mid-sale never loses the cart
  cart!: Table<{ id: string; data: Cart; updated_at: string }>;

  constructor() {
    super("MediShopDB");

    this.version(1).stores({
      medicines: "id, barcode, supplier_id, is_active, name, category",
      batches: "id, medicine_id, expiry_date, is_active, quantity_tablets",
      sales: "id, is_completed, payment_mode, customer_id, created_at, _sync",
      sale_items: "id, sale_id, medicine_id, batch_id, _sync",
      customers: "id, name, balance_owed",
      customer_payments: "id, customer_id, paid_at, _sync",
      suppliers: "id, name",
      returns: "id, sale_id, returned_at, _sync",
      writeoffs: "id, medicine_id, batch_id, written_off_at, _sync",
      audit_log: "id, record_type, record_id, changed_at",
      app_settings: "id",
      pending_ops: "++id, op_type, created_at, attempts",
      cart: "id",
    });
  }
}

// ─── Singleton export ─────────────────────────────────────────
// Only instantiated on the client (SSR guard)
let _db: MediShopDB | undefined;

export function getDB(): MediShopDB {
  if (typeof window === "undefined") {
    throw new Error("Dexie DB is only available in the browser.");
  }
  if (!_db) {
    _db = new MediShopDB();
  }
  return _db;
}

export default getDB;
