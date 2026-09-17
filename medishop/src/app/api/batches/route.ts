// ============================================================
// src/app/api/batches/route.ts
// GET  /api/batches?medicine_id=...  — batches for a medicine
// POST /api/batches                  — add a new batch
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const medicineId = searchParams.get("medicine_id");
    const activeOnly = searchParams.get("active_only") !== "false";
    const expiringDays = searchParams.get("expiring_days");

    let query = supabase
      .from("batches")
      .select("*, medicine:medicines(id, name, tablets_per_strip, loose_eligible)")
      .order("expiry_date", { ascending: true });

    if (medicineId) query = query.eq("medicine_id", medicineId);
    if (activeOnly) query = query.eq("is_active", true).gt("quantity_tablets", 0);
    if (expiringDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + parseInt(expiringDays));
      query = query.lte("expiry_date", cutoff.toISOString().split("T")[0]);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
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

    const required = ["medicine_id", "batch_number", "expiry_date", "quantity_tablets"];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (body.quantity_tablets <= 0) {
      return NextResponse.json({ error: "quantity_tablets must be greater than 0" }, { status: 400 });
    }

    const expiry = new Date(body.expiry_date);
    if (expiry <= new Date()) {
      return NextResponse.json({ error: "Cannot add an already-expired batch" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("batches")
      .insert({
        medicine_id: body.medicine_id,
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
