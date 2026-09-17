// ============================================================
// src/app/api/stock/risk/route.ts
// GET /api/stock/risk — predictive expiry risk
//   Spec: "Predictive expiry risk — flags slow-moving stock likely to expire
//          unsold (based on sales pace)"
//   Returns batches with risk_level: 'high' | 'medium' | 'low'
//   Excludes is_critical medicines (they never get auto-discount flags)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const riskLevel = searchParams.get("risk_level"); // 'high' | 'medium' | 'low' | null (all)

    const { data, error } = await supabase.rpc("get_predictive_expiry_risk");
    if (error) throw error;

    const filtered = riskLevel
      ? (data ?? []).filter((row: { risk_level: string }) => row.risk_level === riskLevel)
      : (data ?? []);

    return NextResponse.json({ data: filtered });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
