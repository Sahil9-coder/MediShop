// ============================================================
// src/app/api/stock/substitute/route.ts
// GET /api/stock/substitute?medicine_id=<uuid>
//     OR ?name=<string>&category=<category>
//
// Spec: "Substitute suggester — if a medicine is out of stock,
// suggests an in-stock equivalent."
//
// Finds medicines in the same category that have in-stock batches.
// Sorts by selling_price ASC (cheapest substitute first).
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
    const nameQuery = searchParams.get("name");
    const categoryParam = searchParams.get("category");

    let category: string | null = categoryParam;
    let excludeId: string | null = medicineId;

    // If medicine_id provided, fetch its category
    if (medicineId) {
      const { data: medicine, error: mErr } = await supabase
        .from("medicines")
        .select("id, category, generic_name")
        .eq("id", medicineId)
        .single();

      if (mErr) {
        return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
      }
      category = medicine.category;
      excludeId = medicine.id;
    }

    if (!category && !nameQuery) {
      return NextResponse.json(
        { error: "Provide medicine_id, category, or name to find substitutes" },
        { status: 400 }
      );
    }

    // Find in-stock medicines in the same category
    let query = supabase
      .from("medicines")
      .select(`
        id, name, generic_name, category, selling_price, loose_price,
        loose_eligible, tablets_per_strip,
        batches!inner(id, quantity_tablets, expiry_date, is_active)
      `)
      .eq("is_active", true)
      .eq("batches.is_active", true)
      .gt("batches.quantity_tablets", 0)
      .gte("batches.expiry_date", new Date().toISOString().split("T")[0])
      .order("selling_price", { ascending: true })
      .limit(10);

    if (category) query = query.eq("category", category);
    if (nameQuery) query = query.ilike("name", `%${nameQuery}%`);
    if (excludeId) query = query.neq("id", excludeId);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
