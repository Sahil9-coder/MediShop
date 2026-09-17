// ============================================================
// src/app/api/suppliers/[id]/route.ts
// GET    /api/suppliers/:id — get supplier with linked medicines
// PATCH  /api/suppliers/:id — update supplier
// DELETE /api/suppliers/:id — delete supplier (only if no linked active medicines)
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
      .from("suppliers")
      .select(`
        *,
        medicines:medicines(id, name, category, is_active, selling_price)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
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
    const { id: _id, created_at: _c, ...updatePayload } = body;
    void _id; void _c;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("suppliers")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
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

    // Safety: cannot delete if there are active linked medicines
    const { data: supplier, error: sErr } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", id)
      .single();

    if (sErr) {
      if (sErr.code === "PGRST116") {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }
      throw sErr;
    }

    const { count: activeCount } = await supabase
      .from("medicines")
      .select("id", { count: "exact", head: true })
      .eq("supplier_id", id)
      .eq("is_active", true);

    if ((activeCount ?? 0) > 0) {
      return NextResponse.json(
        { error: `Cannot delete supplier "${supplier.name}" — ${activeCount} active medicine(s) linked. Reassign or deactivate them first.` },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ message: "Supplier deleted" });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
