// ============================================================
// src/app/api/customers/[id]/route.ts
// GET    /api/customers/:id           — get customer with payment history
// PATCH  /api/customers/:id           — update customer details
// DELETE /api/customers/:id           — delete customer (only if balance = 0)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [{ data: customer, error: cErr }, { data: payments, error: pErr }] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase
        .from("customer_payments")
        .select("*")
        .eq("customer_id", id)
        .order("paid_at", { ascending: false }),
    ]);

    if (cErr) {
      if (cErr.code === "PGRST116") {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      throw cErr;
    }
    if (pErr) throw pErr;

    return NextResponse.json({ data: { ...customer, payments: payments ?? [] } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id: _id, created_at: _c, balance_owed: _b, ...updatePayload } = body;
    void _id; void _c; void _b; // balance_owed is system-managed via payments/sales

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("customers")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Safety: cannot delete a customer with outstanding balance
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

    if ((customer.balance_owed ?? 0) > 0) {
      return NextResponse.json(
        { error: `Cannot delete customer "${customer.name}" — outstanding balance of ₹${customer.balance_owed}` },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "Customer deleted" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
