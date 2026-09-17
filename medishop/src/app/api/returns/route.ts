// ============================================================
// src/app/api/returns/route.ts
// GET  /api/returns — list returns (with pagination)
// POST /api/returns — process a customer return.
// Returns are completely separate from write-offs.
// Auto-reverts to sell mode after each return (enforced in client state).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
      .from("returns")
      .select("*, sale:sales(id, created_at, total_amount)", { count: "exact" })
      .order("returned_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("returned_at", from);
    if (to) query = query.lte("returned_at", to);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, total: count });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { sale_id, items, reason, refund_amount } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Return must include at least one item" }, { status: 400 });
    }

    // Validate each return item
    for (const item of items) {
      if (!item.medicine_id || !item.batch_id || !item.quantity_tablets || !item.sell_type) {
        return NextResponse.json(
          { error: "Each return item must have medicine_id, batch_id, quantity_tablets, sell_type" },
          { status: 400 }
        );
      }
      if (item.quantity_tablets <= 0) {
        return NextResponse.json(
          { error: "quantity_tablets must be greater than 0" },
          { status: 400 }
        );
      }
    }

    // ── Create return record ──────────────────────────────────────
    const { data: returnRecord, error: returnErr } = await supabase
      .from("returns")
      .insert({
        sale_id: sale_id ?? null,
        items,
        reason: reason ?? null,
        refund_amount: refund_amount ?? null,
      })
      .select()
      .single();

    if (returnErr) throw returnErr;

    // ── Add stock back for each returned item ─────────────────────
    for (const item of items) {
      const { data: batch, error: bErr } = await supabase
        .from("batches")
        .select("quantity_tablets, is_active, expiry_date")
        .eq("id", item.batch_id)
        .single();

      if (bErr || !batch) {
        console.warn("[return] batch not found:", item.batch_id);
        continue;
      }

      // Re-activate batch if it was zero-deactivated and not expired
      const newQty = batch.quantity_tablets + item.quantity_tablets;
      const isActive = new Date(batch.expiry_date) > new Date();

      await supabase
        .from("batches")
        .update({ quantity_tablets: newQty, is_active: isActive })
        .eq("id", item.batch_id);
    }

    // ── Reverse credit balance if original sale was on credit ─────
    if (sale_id && refund_amount && refund_amount > 0) {
      const { data: sale } = await supabase
        .from("sales")
        .select("payment_mode, customer_id")
        .eq("id", sale_id)
        .single();

      if (sale?.payment_mode === "credit" && sale.customer_id) {
        // Fetch current balance then subtract refund amount (floor at 0)
        const { data: customer } = await supabase
          .from("customers")
          .select("balance_owed")
          .eq("id", sale.customer_id)
          .single();

        if (customer) {
          const newBalance = Math.max(0, parseFloat((customer.balance_owed - refund_amount).toFixed(2)));
          await supabase
            .from("customers")
            .update({ balance_owed: newBalance })
            .eq("id", sale.customer_id);
        }
      }
    }

    return NextResponse.json({ data: returnRecord }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
