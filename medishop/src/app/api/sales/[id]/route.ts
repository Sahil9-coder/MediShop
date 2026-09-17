// ============================================================
// src/app/api/sales/[id]/route.ts
// GET   /api/sales/:id — get a single completed sale with items
// PATCH /api/sales/:id — mark receipt_generated (only allowed change on completed sale)
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

    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        customer:customers(id, name, phone),
        items:sale_items(
          *,
          medicine:medicines(id, name, category, tablets_per_strip),
          batch:batches(id, batch_number, expiry_date)
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Sale not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ data });
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

    // Only receipt_generated can be updated on a completed sale.
    // Everything else is immutable per spec.
    if (Object.keys(body).some((k) => k !== "receipt_generated")) {
      return NextResponse.json(
        { error: "Completed sales are immutable. Only receipt_generated can be updated." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("sales")
      .update({ receipt_generated: body.receipt_generated })
      .eq("id", id)
      .eq("is_completed", true)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
