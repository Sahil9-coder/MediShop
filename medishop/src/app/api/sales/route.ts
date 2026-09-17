// ============================================================
// src/app/api/sales/route.ts
// GET  /api/sales         — list sales (with date filter, pagination)
// POST /api/sales         — complete a sale (atomic: sale + items + stock deduction)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CartItem } from "@/types/database";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from"); // ISO date string
    const to = searchParams.get("to");
    const customerId = searchParams.get("customer_id");
    const paymentMode = searchParams.get("payment_mode");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
      .from("sales")
      .select(`
        *,
        customer:customers(id, name, phone),
        items:sale_items(
          *,
          medicine:medicines(id, name),
          batch:batches(id, batch_number, expiry_date)
        )
      `, { count: "exact" })
      .eq("is_completed", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);
    if (customerId) query = query.eq("customer_id", customerId);
    if (paymentMode) query = query.eq("payment_mode", paymentMode);

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
    const { items, payment_mode, customer_id, discount_flat, discount_pct, discount_reason } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Sale must have at least one item" }, { status: 400 });
    }

    if (payment_mode === "credit" && !customer_id) {
      return NextResponse.json(
        { error: "customer_id is required for credit sales" },
        { status: 400 }
      );
    }

    // ── Validate stock for all items first ───────────────────────
    for (const item of items as CartItem[]) {
      const { data: batch, error: bErr } = await supabase
        .from("batches")
        .select("quantity_tablets, is_active")
        .eq("id", item.batch.id)
        .single();

      if (bErr || !batch) {
        return NextResponse.json(
          { error: `Batch not found: ${item.batch.id}` },
          { status: 404 }
        );
      }
      if (!batch.is_active) {
        return NextResponse.json(
          { error: `Batch ${item.batch.batch_number} is no longer active` },
          { status: 409 }
        );
      }
      if (batch.quantity_tablets < item.quantity_tablets) {
        return NextResponse.json(
          {
            error: `Insufficient stock for ${item.medicine.name} — requested ${item.quantity_tablets} tablets, available ${batch.quantity_tablets}`,
          },
          { status: 409 }
        );
      }
    }

    // ── Calculate totals ──────────────────────────────────────────
    const subtotal = (items as CartItem[]).reduce((s, i) => s + i.line_total, 0);
    let total = subtotal;
    if (discount_flat && discount_flat > 0) {
      total = Math.max(0, subtotal - discount_flat);
    } else if (discount_pct && discount_pct > 0) {
      total = Math.max(0, subtotal * (1 - discount_pct / 100));
    }
    total = parseFloat(total.toFixed(2));

    // ── Create sale record ────────────────────────────────────────
    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .insert({
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount_flat: discount_flat ?? null,
        discount_pct: discount_pct ?? null,
        discount_reason: discount_reason ?? null,
        total_amount: total,
        payment_mode,
        customer_id: customer_id ?? null,
        is_completed: true,
      })
      .select()
      .single();

    if (saleErr) throw saleErr;

    // ── Insert sale items ─────────────────────────────────────────
    const saleItemsPayload = (items as CartItem[]).map((item) => ({
      sale_id: sale.id,
      medicine_id: item.medicine.id,
      batch_id: item.batch.id,
      quantity_tablets: item.quantity_tablets,
      sell_type: item.sell_type,
      price_at_sale: item.price_at_sale,
      line_total: item.line_total,
    }));

    const { error: itemsErr } = await supabase.from("sale_items").insert(saleItemsPayload);
    if (itemsErr) throw itemsErr;

    // ── Deduct stock from batches ─────────────────────────────────
    for (const item of items as CartItem[]) {
      const { data: batch } = await supabase
        .from("batches")
        .select("quantity_tablets, opened_strips")
        .eq("id", item.batch.id)
        .single();

      if (!batch) continue;

      let newQty = batch.quantity_tablets - item.quantity_tablets;
      let newOpenedStrips = batch.opened_strips;

      // For loose sales: track opened strips
      if (item.sell_type === "loose") {
        // If we're drawing from loose tablets, count was already in tablets
        // If the batch goes to 0 or below a full strip, the strip is "opened"
        const tabletsPerStrip = item.medicine.tablets_per_strip;
        const remainderInLastStrip = newQty % tabletsPerStrip;
        if (remainderInLastStrip !== 0 && newQty > 0) {
          newOpenedStrips = 1; // at least one opened strip
        } else {
          newOpenedStrips = 0;
        }
      }

      const updatePayload: Record<string, unknown> = { quantity_tablets: Math.max(0, newQty) };
      if (item.sell_type === "loose") {
        updatePayload.opened_strips = newOpenedStrips;
      }

      // Deactivate batch if fully sold out
      if (newQty <= 0) {
        updatePayload.is_active = false;
      }

      const { error: deductErr } = await supabase
        .from("batches")
        .update(updatePayload)
        .eq("id", item.batch.id);

      if (deductErr) {
        console.error("[sale] stock deduction failed for batch", item.batch.id, deductErr);
      }
    }

    return NextResponse.json({ data: sale }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
