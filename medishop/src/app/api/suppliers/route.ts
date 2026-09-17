// ============================================================
// src/app/api/suppliers/route.ts
// GET  /api/suppliers  — list all suppliers
// POST /api/suppliers  — create a new supplier
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

    let query = supabase
      .from("suppliers")
      .select(`
        *,
        medicines:medicines(id, name, is_active)
      `)
      .order("name");

    if (search) {
      query = query.ilike("name", `%${search}%`);
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

    if (!body.name || String(body.name).trim() === "") {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        name: String(body.name).trim(),
        phone: body.phone ?? null,
        return_window_days: body.return_window_days ?? 90,
        notes: body.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
