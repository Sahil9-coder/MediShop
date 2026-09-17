// ============================================================
// src/app/api/customers/[id]/payments/route.ts
// GET  /api/customers/:id/payments — payment history for a customer
// POST /api/customers/:id/payments — record a payment (reduces balance)
// Balance update is handled by Postgres trigger (trg_customer_payment_balance).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const { data, error, count } = await supabase
      .from("customer_payments")
      .select("*", { count: "exact" })
      .eq("customer_id", id)
      .order("paid_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({ data, total: count });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { amount, notes } = body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json({ error: "Payment amount must be a positive number" }, { status: 400 });
    }

    // Verify customer exists and check balance
    const { data: customer, error: cErr } = await supabase
      .from("customers")
      .select("id, name, balance_owed")
      .eq("id", id)
      .single();

    if (cErr) {
      if (cErr.code === "PGRST116") {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      throw cErr;
    }

    const paymentAmount = parseFloat(parseFloat(amount).toFixed(2));

    if (paymentAmount > customer.balance_owed) {
      return NextResponse.json(
        {
          error: `Payment amount ₹${paymentAmount} exceeds outstanding balance ₹${customer.balance_owed}`,
        },
        { status: 409 }
      );
    }

    // Insert payment — Postgres trigger auto-updates balance
    const { data: payment, error: pErr } = await supabase
      .from("customer_payments")
      .insert({
        customer_id: id,
        amount: paymentAmount,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (pErr) throw pErr;

    // Fetch updated customer balance
    const { data: updated } = await supabase
      .from("customers")
      .select("balance_owed")
      .eq("id", id)
      .single();

    return NextResponse.json(
      { data: payment, new_balance: updated?.balance_owed ?? 0 },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
