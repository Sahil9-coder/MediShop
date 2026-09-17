// ============================================================
// src/app/api/reports/export/route.ts
// GET /api/reports/export — returns report data formatted for export
//   ?type=sales|top-sellers|expiry-losses|dead-stock
//   ?format=json (default) | csv
//   ?from=<date>&to=<date>
//
// Spec: "Reports exportable to Excel/PDF: sales, dead stock, expiry losses"
// This endpoint returns raw data; the client handles PDF/Excel rendering.
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
    const format = searchParams.get("format") ?? "json";
    const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];

    let data: unknown[] = [];
    let columns: { key: string; label: string }[] = [];

    switch (type) {
      case "sales": {
        const { data: rows, error } = await supabase
          .from("sales")
          .select(`
            created_at, payment_mode, subtotal, discount_flat, discount_pct, total_amount,
            customer:customers(name)
          `)
          .eq("is_completed", true)
          .gte("created_at", from)
          .lte("created_at", to)
          .order("created_at", { ascending: false });

        if (error) throw error;
        data = rows ?? [];
        columns = [
          { key: "created_at", label: "Date & Time" },
          { key: "payment_mode", label: "Payment Mode" },
          { key: "subtotal", label: "Subtotal (₹)" },
          { key: "discount_flat", label: "Discount Flat (₹)" },
          { key: "discount_pct", label: "Discount %" },
          { key: "total_amount", label: "Total (₹)" },
          { key: "customer.name", label: "Customer" },
        ];
        break;
      }

      case "top-sellers": {
        const { data: rows, error } = await supabase.rpc("get_top_sellers", {
          p_from: from,
          p_to: to,
          p_limit: 50,
        });
        if (error) throw error;
        data = rows ?? [];
        columns = [
          { key: "medicine_name", label: "Medicine" },
          { key: "total_tablets", label: "Tablets Sold" },
          { key: "total_revenue", label: "Revenue (₹)" },
          { key: "sale_count", label: "# Transactions" },
        ];
        break;
      }

      case "expiry-losses": {
        const { data: rows, error } = await supabase.rpc("get_expiry_losses", {
          p_from: from,
          p_to: to,
        });
        if (error) throw error;
        data = rows ?? [];
        columns = [
          { key: "medicine_name", label: "Medicine" },
          { key: "batch_number", label: "Batch No." },
          { key: "quantity_tablets", label: "Tablets Written Off" },
          { key: "reason", label: "Reason" },
          { key: "estimated_loss", label: "Est. Loss (₹)" },
          { key: "written_off_at", label: "Date" },
        ];
        break;
      }

      case "dead-stock": {
        const { data: rows, error } = await supabase.rpc("get_dead_stock");
        if (error) throw error;
        data = rows ?? [];
        columns = [
          { key: "medicine_name", label: "Medicine" },
          { key: "stock_display", label: "Stock" },
          { key: "earliest_expiry", label: "Expires On" },
          { key: "days_until_expiry", label: "Days Left" },
          { key: "last_sold_at", label: "Last Sold" },
        ];
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown report type: ${type}` },
          { status: 400 }
        );
    }

    if (format === "csv") {
      // Build CSV string for download
      const header = columns.map((c) => c.label).join(",");
      const rows = (data as Record<string, unknown>[]).map((row) =>
        columns.map((col) => {
          const val = col.key.includes(".")
            ? col.key.split(".").reduce((obj, k) => (obj as Record<string, unknown>)?.[k] as Record<string, unknown>, row as Record<string, unknown>) as unknown
            : row[col.key];
          return `"${String(val ?? "").replace(/"/g, '""')}"`;
        }).join(",")
      );

      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${type}-report-${from}-to-${to}.csv"`,
        },
      });
    }

    return NextResponse.json({ data, columns, type, from, to });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
