// ============================================================
// src/app/expiry/page.tsx
// Phase 3 — Expiry Dashboard (color-coded list)
// Placeholder for now; full implementation in Phase 3.
// ============================================================
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Batch, Medicine } from "@/types/database";
import { formatExpiry, formatCurrency } from "@/lib/utils/format";
import { getExpiryStatus, daysUntilExpiry, stockDisplay, totalTabletsFromBatches } from "@/lib/utils/stock";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";

type BatchWithMedicine = Batch & { medicine: Medicine & { batches: Batch[] } };

const STATUS_LABELS = {
  expired: { label: "Expired", bg: "bg-red-100", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
  red:     { label: "< 30 days", bg: "bg-red-50", text: "text-red-600", border: "border-red-100", dot: "bg-red-400" },
  orange:  { label: "< 90 days", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", dot: "bg-amber-400" },
  green:   { label: "Safe", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", dot: "bg-emerald-500" },
};

export default function ExpiryPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<BatchWithMedicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "expired" | "red" | "orange" | "green">("all");

  useEffect(() => {
    fetch("/api/expiry")
      .then((r) => r.json())
      .then((j) => setBatches(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? batches : batches.filter((b) => getExpiryStatus(b.expiry_date) === filter);

  // Group counts
  const counts = batches.reduce((acc, b) => {
    const s = getExpiryStatus(b.expiry_date);
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-md mx-auto">
      <header className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="flex-1 text-base font-semibold text-text-primary">Expiry Dashboard</h1>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {(["all", "expired", "red", "orange", "green"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f ? "bg-primary text-white border-primary" : "bg-white text-text-muted border-border"
              }`}>
              {f === "all" ? `All (${batches.length})` : `${STATUS_LABELS[f].label} (${counts[f] ?? 0})`}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <Icon name="expiry" size={28} className="text-primary" />
            </div>
            <p className="text-text-primary font-medium">Nothing to show</p>
            <p className="text-text-muted text-sm mt-1">No medicines match this filter</p>
          </div>
        ) : (
          filtered.map((batch) => {
            const status = getExpiryStatus(batch.expiry_date);
            const daysLeft = daysUntilExpiry(batch.expiry_date);
            const s = STATUS_LABELS[status];
            const med = batch.medicine;
            const totalTablets = totalTabletsFromBatches(med.batches ?? [batch]);
            return (
              <div key={batch.id} className={`bg-white rounded-2xl p-4 shadow-card border ${s.border}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                      <p className="font-medium text-text-primary text-sm">{med.name}</p>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 ml-4">
                      Batch {batch.batch_number} · {stockDisplay(totalTablets, med)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>
                      {formatExpiry(batch.expiry_date)}
                    </span>
                    <p className={`text-xs mt-1 ${status === "expired" ? "text-danger" : "text-text-muted"}`}>
                      {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : `${daysLeft} days left`}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  {status !== "green" && !med.is_critical && (
                    <button className="flex items-center gap-1 px-3 py-1.5 border border-amber-200 bg-amber-50 rounded-lg text-xs text-amber-700">
                      <Icon name="tag" size={13} />
                      Suggest discount
                    </button>
                  )}
                  <button
                    onClick={() => router.push("/stock")}
                    className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs text-text-muted"
                  >
                    <Icon name="edit" size={13} />
                    Edit stock
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
