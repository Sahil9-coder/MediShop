// ============================================================
// src/app/api/audit-log/route.ts
// GET /api/audit-log — view-only audit log
//   ?record_type=medicine — filter by record type
//   ?record_id=<uuid>    — filter by specific record
//   ?from=<date>         — date range filter
//   ?to=<date>
// Audit log is READ ONLY — no write endpoint here.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const recordType = searchParams.get("record_type");
    const recordId = searchParams.get("record_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") ?? "100");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("changed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (recordType) query = query.eq("record_type", recordType);
    if (recordId)   query = query.eq("record_id", recordId);
    if (from)       query = query.gte("changed_at", from);
    if (to)         query = query.lte("changed_at", to);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data, total: count });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
