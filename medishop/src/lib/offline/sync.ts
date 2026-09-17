// ============================================================
// src/lib/offline/sync.ts
// Background sync engine: drains pending_ops queue → Supabase.
// Called on network reconnect or periodically.
// ============================================================

import { getDB, type PendingOp } from "./db";
import { createClient } from "@/lib/supabase/client";

const MAX_ATTEMPTS = 5;

// ─── Enqueue a pending operation ──────────────────────────────
export async function enqueue(
  op_type: PendingOp["op_type"],
  payload: unknown
): Promise<void> {
  const db = getDB();
  await db.pending_ops.add({
    op_type,
    payload,
    created_at: new Date().toISOString(),
    attempts: 0,
  });
}

// ─── Drain the queue ──────────────────────────────────────────
export async function drainQueue(): Promise<void> {
  if (!navigator.onLine) return;

  const db = getDB();
  const supabase = createClient();
  const ops = await db.pending_ops
    .filter((op) => op.attempts < MAX_ATTEMPTS)
    .sortBy("created_at");

  for (const op of ops) {
    try {
      await processOp(op, supabase);
      await db.pending_ops.delete(op.id!);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.pending_ops.update(op.id!, {
        attempts: op.attempts + 1,
        last_error: msg,
      });
      console.warn(`[sync] op ${op.op_type} failed (attempt ${op.attempts + 1}):`, msg);
    }
  }
}

// ─── Process a single op ──────────────────────────────────────
async function processOp(
  op: PendingOp,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  const payload = op.payload as Record<string, unknown>;

  switch (op.op_type) {
    // ── Sales ──────────────────────────────────────────────────
    case "INSERT_SALE": {
      const { items, ...sale } = payload as {
        items: unknown[];
        [k: string]: unknown;
      };
      const { data, error } = await supabase.from("sales").insert(sale).select("id").single();
      if (error) throw new Error(error.message);
      // Insert sale items with the real sale ID
      if (items && items.length) {
        const mappedItems = (items as Record<string, unknown>[]).map((item) => ({
          ...item,
          sale_id: data.id,
        }));
        const { error: itemErr } = await supabase.from("sale_items").insert(mappedItems);
        if (itemErr) throw new Error(itemErr.message);
      }
      // Mark local sale as synced
      const db = getDB();
      await db.sales.where("id").equals(payload.id as string).modify({ _sync: "synced" });
      break;
    }

    // ── Returns ────────────────────────────────────────────────
    case "INSERT_RETURN": {
      const { error } = await supabase.from("returns").insert(payload);
      if (error) throw new Error(error.message);
      const db = getDB();
      await db.returns.where("id").equals(payload.id as string).modify({ _sync: "synced" });
      break;
    }

    // ── Write-offs ─────────────────────────────────────────────
    case "INSERT_WRITEOFF": {
      const { error } = await supabase.from("writeoffs").insert(payload);
      if (error) throw new Error(error.message);
      const db = getDB();
      await db.writeoffs.where("id").equals(payload.id as string).modify({ _sync: "synced" });
      // Also sync the batch quantity change
      const { error: bErr } = await supabase
        .from("batches")
        .update({ quantity_tablets: payload.new_quantity_tablets })
        .eq("id", payload.batch_id as string);
      if (bErr) console.warn("[sync] batch quantity sync failed:", bErr.message);
      break;
    }

    // ── Customer payment ────────────────────────────────────────
    case "INSERT_CUSTOMER_PAYMENT": {
      const { error } = await supabase.from("customer_payments").insert(payload);
      if (error) throw new Error(error.message);
      const db = getDB();
      await db.customer_payments
        .where("id")
        .equals(payload.id as string)
        .modify({ _sync: "synced" });
      break;
    }

    // ── Medicines ──────────────────────────────────────────────
    case "INSERT_MEDICINE": {
      const { error } = await supabase.from("medicines").insert(payload);
      if (error) throw new Error(error.message);
      break;
    }
    case "UPDATE_MEDICINE": {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("medicines").update(rest).eq("id", id as string);
      if (error) throw new Error(error.message);
      break;
    }

    // ── Batches ────────────────────────────────────────────────
    case "INSERT_BATCH": {
      const { error } = await supabase.from("batches").insert(payload);
      if (error) throw new Error(error.message);
      break;
    }
    case "UPDATE_BATCH": {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("batches").update(rest).eq("id", id as string);
      if (error) throw new Error(error.message);
      break;
    }

    // ── Suppliers ──────────────────────────────────────────────
    case "INSERT_SUPPLIER": {
      const { error } = await supabase.from("suppliers").insert(payload);
      if (error) throw new Error(error.message);
      break;
    }
    case "UPDATE_SUPPLIER": {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("suppliers").update(rest).eq("id", id as string);
      if (error) throw new Error(error.message);
      break;
    }

    // ── Customers ──────────────────────────────────────────────
    case "INSERT_CUSTOMER": {
      const { error } = await supabase.from("customers").insert(payload);
      if (error) throw new Error(error.message);
      break;
    }
    case "UPDATE_CUSTOMER": {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("customers").update(rest).eq("id", id as string);
      if (error) throw new Error(error.message);
      break;
    }

    // ── App settings ────────────────────────────────────────────
    case "UPDATE_APP_SETTINGS": {
      const { id, ...rest } = payload;
      const { error } = await supabase.from("app_settings").update(rest).eq("id", id as string);
      if (error) throw new Error(error.message);
      break;
    }

    default:
      console.warn("[sync] Unknown op type:", (op as PendingOp).op_type);
  }
}

// ─── Pull fresh data from Supabase into local DB ──────────────
export async function pullRemoteData(): Promise<void> {
  if (!navigator.onLine) return;
  const supabase = createClient();
  const db = getDB();

  try {
    const [
      { data: medicines },
      { data: batches },
      { data: customers },
      { data: suppliers },
      { data: settings },
    ] = await Promise.all([
      supabase.from("medicines").select("*").eq("is_active", true),
      supabase.from("batches").select("*").eq("is_active", true),
      supabase.from("customers").select("*"),
      supabase.from("suppliers").select("*"),
      supabase.from("app_settings").select("id, auto_lock_minutes, language, last_backup_at, whatsapp_number, first_run_done, updated_at").limit(1),
    ]);

    await db.transaction(
      "rw",
      [db.medicines, db.batches, db.customers, db.suppliers, db.app_settings],
      async () => {
        if (medicines) await db.medicines.bulkPut(medicines);
        if (batches) await db.batches.bulkPut(batches);
        if (customers) await db.customers.bulkPut(customers);
        if (suppliers) await db.suppliers.bulkPut(suppliers);
        if (settings && settings.length) await db.app_settings.bulkPut(settings);
      }
    );
  } catch (err) {
    console.warn("[sync] pullRemoteData failed:", err);
  }
}

// ─── Network-aware auto-sync bootstrap ────────────────────────
export function startSyncEngine(): () => void {
  const handleOnline = () => {
    drainQueue().catch(console.error);
    pullRemoteData().catch(console.error);
  };

  window.addEventListener("online", handleOnline);

  // Also try immediately
  if (navigator.onLine) {
    drainQueue().catch(console.error);
  }

  // Periodic heartbeat every 90 s
  const interval = setInterval(() => {
    drainQueue().catch(console.error);
  }, 90_000);

  return () => {
    window.removeEventListener("online", handleOnline);
    clearInterval(interval);
  };
}
