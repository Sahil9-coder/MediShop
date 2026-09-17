// ============================================================
// src/app/suppliers/page.tsx
// Phase 4 — Supplier Directory
// ============================================================
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "@/types/database";
import { callLink, whatsappLink } from "@/lib/utils/format";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((j) => setSuppliers(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-md mx-auto">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <Icon name="arrow-left" size={20} />
        </button>
        <h1 className="flex-1 text-base font-semibold text-text-primary">Suppliers</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary" /></div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <Icon name="suppliers" size={28} className="text-primary" />
            </div>
            <p className="text-text-primary font-medium">No suppliers yet</p>
            <p className="text-text-muted text-sm mt-1">Add suppliers when adding medicines</p>
          </div>
        ) : (
          suppliers.map((supplier) => (
            <div key={supplier.id} className="bg-white rounded-2xl p-4 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-text-primary text-sm">{supplier.name}</p>
                  {supplier.phone && (
                    <p className="text-xs text-text-muted mt-0.5">{supplier.phone}</p>
                  )}
                  {supplier.return_window_days > 0 && (
                    <p className="text-xs text-primary mt-1">
                      Returns accepted up to {supplier.return_window_days} days before expiry
                    </p>
                  )}
                </div>
                {supplier.phone && (
                  <div className="flex gap-2 shrink-0">
                    <a href={callLink(supplier.phone)}
                      className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary"
                      aria-label="Call supplier">
                      <Icon name="info" size={17} />
                    </a>
                    <a href={whatsappLink(supplier.phone)}
                      target="_blank" rel="noreferrer"
                      className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"
                      aria-label="WhatsApp supplier">
                      <Icon name="share" size={17} />
                    </a>
                  </div>
                )}
              </div>
              {supplier.notes && (
                <p className="text-xs text-text-muted mt-2 pt-2 border-t border-border">{supplier.notes}</p>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
