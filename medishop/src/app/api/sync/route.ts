// ============================================================
// src/app/api/sync/route.ts
// POST /api/sync — manually trigger a remote data pull from Supabase.
//   Used by the offline sync engine when coming back online.
//   Returns fresh medicines, batches, customers, suppliers, settings.
// ============================================================

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch all data needed for local IndexedDB seed
    const [
      { data: medicines, error: mErr },
      { data: batches,   error: bErr },
      { data: customers, error: cErr },
      { data: suppliers, error: sErr },
      { data: settings,  error: stErr },
    ] = await Promise.all([
      supabase.from("medicines").select("*").eq("is_active", true),
      supabase.from("batches").select("*").eq("is_active", true).gt("quantity_tablets", 0),
      supabase.from("customers").select("*"),
      supabase.from("suppliers").select("*"),
      supabase.from("app_settings")
        .select("id, auto_lock_minutes, language, last_backup_at, whatsapp_number, first_run_done, updated_at")
        .limit(1),
    ]);

    const errors = [mErr, bErr, cErr, sErr, stErr].filter(Boolean);
    if (errors.length > 0) {
      throw new Error(errors.map((e) => e?.message).join("; "));
    }

    return NextResponse.json({
      data: {
        medicines:  medicines  ?? [],
        batches:    batches    ?? [],
        customers:  customers  ?? [],
        suppliers:  suppliers  ?? [],
        settings:   settings?.[0] ?? null,
        synced_at:  new Date().toISOString(),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
