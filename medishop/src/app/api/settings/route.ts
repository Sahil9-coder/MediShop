// ============================================================
// src/app/api/settings/route.ts
// GET   /api/settings — get app settings
// PATCH /api/settings — update app settings (language, auto-lock, WhatsApp number, etc.)
//
// PIN management is split into a separate endpoint (/api/auth/pin)
// for security isolation.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("app_settings")
      .select("id, auto_lock_minutes, language, last_backup_at, whatsapp_number, first_run_done, updated_at")
      // Never return pin_hash over the API
      .limit(1)
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    // Strip fields that must never be directly patched here
    const { id: _id, pin_hash: _pin, ...updatePayload } = body;
    void _id; void _pin;

    // Validate language if provided
    if (updatePayload.language && !["en", "hi", "mr"].includes(updatePayload.language)) {
      return NextResponse.json(
        { error: "language must be one of: en, hi, mr" },
        { status: 400 }
      );
    }

    // Validate auto_lock_minutes if provided
    if (updatePayload.auto_lock_minutes !== undefined) {
      const mins = parseInt(updatePayload.auto_lock_minutes);
      if (isNaN(mins) || mins < 0 || mins > 60) {
        return NextResponse.json(
          { error: "auto_lock_minutes must be between 0 (never) and 60" },
          { status: 400 }
        );
      }
      updatePayload.auto_lock_minutes = mins;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    // Get the settings row ID first
    const { data: existing, error: gErr } = await supabase
      .from("app_settings")
      .select("id")
      .limit(1)
      .single();

    if (gErr) throw gErr;

    const { data, error } = await supabase
      .from("app_settings")
      .update(updatePayload)
      .eq("id", existing.id)
      .select("id, auto_lock_minutes, language, last_backup_at, whatsapp_number, first_run_done, updated_at")
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
