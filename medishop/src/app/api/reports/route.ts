// ============================================================
// src/app/api/reports/route.ts
// GET /api/reports — flexible reporting endpoint
//   ?type=sales        — sales summary for a date range
//   ?type=top-sellers  — top-selling medicines
//   ?type=expiry-losses — write-offs with estimated loss value
//   ?type=dead-stock   — slow-moving stock at risk of expiry
//   ?type=daily-cash   — today's cash/UPI/credit breakdown
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "sales";
    const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    switch (type) {
      case "sales": {
        const { data, error } = await supabase.rpc("get_sales_report", {
          p_from: from,
          p_to: to,
        });
        if (error) throw error;
        return NextResponse.json({ data });
      }

      case "top-sellers": {
        const { data, error } = await supabase.rpc("get_top_sellers", {
          p_from: from,
          p_to: to,
          p_limit: limit,
        });
        if (error) throw error;
        return NextResponse.json({ data });
      }

      case "expiry-losses": {
        const { data, error } = await supabase.rpc("get_expiry_losses", {
          p_from: from,
          p_to: to,
        });
        if (error) throw error;
        return NextResponse.json({ data });
      }

      case "dead-stock": {
        const { data, error } = await supabase.rpc("get_dead_stock");
        if (error) throw error;
        return NextResponse.json({ data });
      }

      case "daily-cash": {
        const { data, error } = await supabase.rpc("get_daily_cash_summary", {
          p_date: date,
        });
        if (error) throw error;
        return NextResponse.json({ data });
      }

      default:
        return NextResponse.json(
          { error: `Unknown report type: ${type}. Use: sales, top-sellers, expiry-losses, dead-stock, daily-cash` },
          { status: 400 }
        );
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
