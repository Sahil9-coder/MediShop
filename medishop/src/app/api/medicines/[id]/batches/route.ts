// ============================================================
// src/app/api/medicines/[id]/batches/route.ts
// GET  /api/medicines/:id/batches — all batches for a medicine
// POST /api/medicines/:id/batches — add a new batch to this medicine
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: medicineId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active_only") !== "false";
    const includeExpired = searchParams.get("include_expired") === "true";

    let query = supabase
      .from("batches")
      .select("*")
      .eq("medicine_id", medicineId)
      .order("expiry_date", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true).gt("quantity_tablets", 0);
    }
    if (!includeExpired) {
      query = query.gte("expiry_date", new Date().toISOString().split("T")[0]);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id: medicineId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify medicine exists
    const { error: mErr } = await supabase
      .from("medicines")
      .select("id")
      .eq("id", medicineId)
      .single();

    if (mErr) {
      return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
    }

    const body = await req.json();
    const required = ["batch_number", "expiry_date", "quantity_tablets"];
    for (const field of required) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (body.quantity_tablets <= 0) {
      return NextResponse.json({ error: "quantity_tablets must be greater than 0" }, { status: 400 });
    }

    const expiry = new Date(body.expiry_date);
    if (isNaN(expiry.getTime())) {
      return NextResponse.json({ error: "Invalid expiry_date format" }, { status: 400 });
    }
    if (expiry <= new Date()) {
      return NextResponse.json({ error: "Cannot add an already-expired batch" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("batches")
      .insert({
        medicine_id: medicineId,
        batch_number: body.batch_number,
        expiry_date: body.expiry_date,
        quantity_tablets: body.quantity_tablets,
        date_received: body.date_received ?? new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Batch number already exists for this medicine" },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
