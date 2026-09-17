// ============================================================
// src/app/api/medicines/[id]/route.ts
// GET    /api/medicines/:id — get single medicine with batches
// PATCH  /api/medicines/:id — update medicine (all fields editable)
// DELETE /api/medicines/:id — soft-delete (sets is_active=false)
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
      .from("medicines")
      .select(`
        *,
        supplier:suppliers(id, name, phone, return_window_days),
        batches(*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
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

    // Remove fields that should never be patched directly
    const { id: _id, created_at: _c, ...updatePayload } = body;
    void _id; void _c;

    // Validate loose_eligible constraint
    if (updatePayload.loose_eligible === true && !updatePayload.loose_price) {
      // Check existing value in DB
      const { data: existing } = await supabase
        .from("medicines")
        .select("loose_price")
        .eq("id", id)
        .single();
      if (!existing?.loose_price && !updatePayload.loose_price) {
        return NextResponse.json(
          { error: "loose_price is required when loose_eligible is true" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from("medicines")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
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

    // Soft delete — never hard-delete medicine records (audit trail preservation)
    const { data, error } = await supabase
      .from("medicines")
      .update({ is_active: false })
      .eq("id", id)
      .select("id, name")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Medicine not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ data, message: "Medicine deactivated" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
