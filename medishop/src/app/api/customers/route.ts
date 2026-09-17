// ============================================================
// src/app/api/customers/route.ts
// GET  /api/customers  — list all customers (with balance)
// POST /api/customers  — create a new customer
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
    const hasBalance = searchParams.get("has_balance"); // "true" = only customers with outstanding balance
    const limit = parseInt(searchParams.get("limit") ?? "100");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
      .from("customers")
      .select("*", { count: "exact" })
      .order("name")
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (hasBalance === "true") {
      query = query.gt("balance_owed", 0);
    }

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

    if (!body.name || String(body.name).trim() === "") {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: String(body.name).trim(),
        phone: body.phone ?? null,
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
