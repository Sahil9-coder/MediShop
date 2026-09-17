// ============================================================
// src/app/api/medicines/route.ts
// GET  /api/medicines  — list all active medicines (with batches)
// POST /api/medicines  — create a new medicine
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q");
    const barcode = searchParams.get("barcode");
    const symptom = searchParams.get("symptom");
    const supplierId = searchParams.get("supplier_id");
    const includeInactive = searchParams.get("include_inactive") === "true";

    let query = supabase
      .from("medicines")
      .select(`
        *,
        supplier:suppliers(id, name, phone, return_window_days),
        batches(id, batch_number, expiry_date, quantity_tablets, opened_strips, is_active, date_received)
      `)
      .order("name");

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    if (barcode) {
      query = query.eq("barcode", barcode);
    } else if (search) {
      // Full-text search on name + generic_name
      query = query.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%`);
    } else if (symptom) {
      // Symptom-based search — symptoms is a text[] column
      query = query.contains("symptoms", [symptom.toLowerCase()]);
    }

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Validate required fields
    const required = ["name", "category", "cost_price", "selling_price"];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Enforce: loose_price required if loose_eligible
    if (body.loose_eligible && !body.loose_price) {
      return NextResponse.json(
        { error: "loose_price is required when loose_eligible is true" },
        { status: 400 }
      );
    }

    // Only tablets/capsules can be loose-eligible
    if (body.loose_eligible && !["tablet", "capsule"].includes(body.category)) {
      return NextResponse.json(
        { error: "Only tablets/capsules can be loose-eligible" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("medicines")
      .insert({
        name: body.name,
        generic_name: body.generic_name ?? null,
        category: body.category,
        loose_eligible: body.loose_eligible ?? false,
        tablets_per_strip: body.tablets_per_strip ?? 10,
        rx_required: body.rx_required ?? false,
        barcode: body.barcode ?? null,
        cost_price: body.cost_price,
        selling_price: body.selling_price,
        loose_price: body.loose_price ?? null,
        reorder_level: body.reorder_level ?? 10,
        is_critical: body.is_critical ?? false,
        supplier_id: body.supplier_id ?? null,
        symptoms: body.symptoms ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Barcode already exists" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
