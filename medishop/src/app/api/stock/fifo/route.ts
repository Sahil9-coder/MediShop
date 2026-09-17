// ============================================================
// src/app/api/stock/fifo/route.ts
// GET /api/stock/fifo?medicine_id=<uuid>
// Returns the FIFO batch (earliest expiry with stock) for a medicine.
// Used by the sell screen to auto-select the right batch.
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

    if (!medicineId) {
      return NextResponse.json({ error: "medicine_id is required" }, { status: 400 });
    }

    const { data: batchId, error } = await supabase.rpc("get_fifo_batch", {
      p_medicine_id: medicineId,
    });

    if (error) throw error;

    if (!batchId) {
      return NextResponse.json({ error: "No stock available for this medicine" }, { status: 404 });
    }

    // Return full batch record
    const { data: batch, error: bErr } = await supabase
      .from("batches")
      .select("*, medicine:medicines(id, name, tablets_per_strip, loose_eligible, selling_price, loose_price)")
      .eq("id", batchId)
      .single();

    if (bErr) throw bErr;

    return NextResponse.json({ data: batch });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
