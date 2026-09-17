// ============================================================
// src/app/api/batches/[id]/route.ts
// GET    /api/batches/:id — get single batch
// PATCH  /api/batches/:id — update batch (quantity, expiry, etc.)
// DELETE /api/batches/:id — soft-delete batch (sets is_active=false, qty=0)
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
      .from("batches")
      .select("*, medicine:medicines(*)")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
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

    // Disallow negative quantity
    if (body.quantity_tablets !== undefined && body.quantity_tablets < 0) {
      return NextResponse.json({ error: "quantity_tablets cannot be negative" }, { status: 400 });
    }

    // Validate expiry date if provided
    if (body.expiry_date) {
      const expiry = new Date(body.expiry_date);
      if (isNaN(expiry.getTime())) {
        return NextResponse.json({ error: "Invalid expiry_date format" }, { status: 400 });
      }
    }

    const { id: _id, created_at: _c, medicine_id: _m, ...updatePayload } = body;
    void _id; void _c; void _m;

    // Auto-deactivate if zeroed out
    if (updatePayload.quantity_tablets === 0) {
      updatePayload.is_active = false;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("batches")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
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

    // Soft delete — preserve for audit trail
    const { data, error } = await supabase
      .from("batches")
      .update({ is_active: false, quantity_tablets: 0 })
      .eq("id", id)
      .select("id, batch_number")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ data, message: "Batch deactivated" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
