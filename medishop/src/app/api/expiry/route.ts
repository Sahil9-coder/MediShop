// ============================================================
// src/app/api/expiry/route.ts
// GET /api/expiry — expiry dashboard data
//   ?days=90     — batches expiring within N days (default 90)
//   ?view=heatmap — returns monthly count for calendar heatmap
//   ?view=reminders — return-window reminders only
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") ?? "90");
    const view = searchParams.get("view") ?? "list"; // "list" | "heatmap" | "reminders"

    if (view === "reminders") {
      // Near-expiry items within supplier return window
      const { data, error } = await supabase.rpc("get_near_expiry_return_reminders");
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Fetch expiring batches using DB function
    const { data: batches, error: bErr } = await supabase.rpc("get_expiring_batches", { p_days: days });
    if (bErr) throw bErr;

    if (view === "heatmap") {
      // Group by YYYY-MM for calendar heatmap
      const heatmap: Record<string, number> = {};
      for (const batch of (batches ?? [])) {
        const month = (batch.expiry_date as string).slice(0, 7); // "YYYY-MM"
        heatmap[month] = (heatmap[month] ?? 0) + 1;
      }
      return NextResponse.json({ data: heatmap });
    }

    // Default: list view with status breakdown
    const grouped = {
      expired:  (batches ?? []).filter((b: { status: string }) => b.status === "expired"),
      red:      (batches ?? []).filter((b: { status: string }) => b.status === "red"),
      orange:   (batches ?? []).filter((b: { status: string }) => b.status === "orange"),
      green:    (batches ?? []).filter((b: { status: string }) => b.status === "green"),
    };

    return NextResponse.json({ data: batches, grouped });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
