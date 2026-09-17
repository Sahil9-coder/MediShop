// ============================================================
// src/app/api/auth/pin/route.ts
// POST /api/auth/pin?action=set   — set or change PIN (hashed with bcrypt)
// POST /api/auth/pin?action=verify — verify PIN against stored hash
//
// PIN is NEVER stored in plain text — bcrypt hash only.
// The pin_hash column is excluded from all other endpoints.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashPin, verifyPin } from "@/lib/utils/pin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const body = await req.json();

    // ── Set or change PIN ─────────────────────────────────────────
    if (action === "set") {
      const { pin } = body;

      if (!pin || !/^\d{4,6}$/.test(String(pin))) {
        return NextResponse.json(
          { error: "PIN must be 4-6 digits" },
          { status: 400 }
        );
      }

      const hash = await hashPin(String(pin));

      // Get settings row ID
      const { data: settings, error: sErr } = await supabase
        .from("app_settings")
        .select("id")
        .limit(1)
        .single();

      if (sErr) throw sErr;

      const { error } = await supabase
        .from("app_settings")
        .update({ pin_hash: hash })
        .eq("id", settings.id);

      if (error) throw error;

      return NextResponse.json({ message: "PIN set successfully" });
    }

    // ── Verify PIN ────────────────────────────────────────────────
    if (action === "verify") {
      const { pin } = body;

      if (!pin) {
        return NextResponse.json({ error: "PIN is required" }, { status: 400 });
      }

      // Fetch current pin_hash (only here is it accessed)
      const { data: settings, error: sErr } = await supabase
        .from("app_settings")
        .select("pin_hash")
        .limit(1)
        .single();

      if (sErr) throw sErr;

      // If no PIN set, any input fails (app is locked until PIN is configured)
      if (!settings?.pin_hash) {
        return NextResponse.json({ valid: false, error: "No PIN configured" }, { status: 403 });
      }

      const valid = await verifyPin(String(pin), settings.pin_hash);

      if (!valid) {
        return NextResponse.json({ valid: false }, { status: 401 });
      }

      return NextResponse.json({ valid: true });
    }

    return NextResponse.json(
      { error: "action must be 'set' or 'verify'" },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
