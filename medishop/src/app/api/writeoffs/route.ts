// ============================================================
// src/app/api/writeoffs/route.ts
// GET  /api/writeoffs — list write-offs (damaged/expired stock)
// POST /api/writeoffs — record a write-off (deducts from batch)
// Write-offs are DISTINCT from customer returns — no refund, no customer.
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
    const reason = searchParams.get("reason");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
      .from("writeoffs")
      .select(
        `*, medicine:medicines(id, name), batch:batches(id, batch_number, expiry_date)`,
        { count: "exact" }
      )
      .order("written_off_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) query = query.gte("written_off_at", from);
    if (to) query = query.lte("written_off_at", to);
    if (reason) query = query.eq("reason", reason);

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
    const { medicine_id, batch_id, quantity_tablets, reason, notes } = body;

    const required = ["medicine_id", "batch_id", "quantity_tablets", "reason"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (!["expired", "damaged", "other"].includes(reason)) {
      return NextResponse.json(
        { error: "reason must be one of: expired, damaged, other" },
        { status: 400 }
      );
    }

    if (quantity_tablets <= 0) {
      return NextResponse.json({ error: "quantity_tablets must be > 0" }, { status: 400 });
    }

    // ── Check stock ───────────────────────────────────────────────
    const { data: batch, error: bErr } = await supabase
      .from("batches")
      .select("quantity_tablets, medicine_id")
      .eq("id", batch_id)
      .single();

    if (bErr || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    if (batch.medicine_id !== medicine_id) {
      return NextResponse.json(
        { error: "Batch does not belong to the specified medicine" },
        { status: 400 }
      );
    }

    if (batch.quantity_tablets < quantity_tablets) {
      return NextResponse.json(
        {
          error: `Cannot write off ${quantity_tablets} tablets — only ${batch.quantity_tablets} in this batch`,
        },
        { status: 409 }
      );
    }

    // ── Create writeoff record ────────────────────────────────────
    const { data: writeoff, error: wErr } = await supabase
      .from("writeoffs")
      .insert({ medicine_id, batch_id, quantity_tablets, reason, notes: notes ?? null })
      .select()
      .single();

    if (wErr) throw wErr;

    // ── Deduct from batch ─────────────────────────────────────────
    const newQty = batch.quantity_tablets - quantity_tablets;
    await supabase
      .from("batches")
      .update({ quantity_tablets: newQty, is_active: newQty > 0 })
      .eq("id", batch_id);

    return NextResponse.json({ data: writeoff }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
