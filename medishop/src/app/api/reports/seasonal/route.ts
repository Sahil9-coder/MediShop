// ============================================================
// src/app/api/reports/seasonal/route.ts
// GET /api/reports/seasonal?month=<1-12>
//   Spec: "Seasonal restock hints based on past sales patterns
//          (e.g. cold/fever meds before monsoon)"
//   Returns medicines to restock based on historical same-month sales.
//   month defaults to next calendar month (prepare in advance).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    // Default: look ahead to next month (e.g., in June, show hints for July)
    const nextMonth = ((new Date().getMonth() + 1) % 12) + 1;
    const monthParam = searchParams.get("month");
    const month = monthParam ? parseInt(monthParam) : nextMonth;

    if (isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "month must be 1-12" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("get_seasonal_restock_hints", {
      p_month: month,
    });
    if (error) throw error;

    const monthName = new Date(2024, month - 1, 1).toLocaleString("en-IN", { month: "long" });
    return NextResponse.json({ data: data ?? [], month, month_name: monthName });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
