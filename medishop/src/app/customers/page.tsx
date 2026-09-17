// ============================================================
// src/app/customers/page.tsx
// Phase 4 — Customers / Khata (credit ledger)
// ============================================================
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/types/database";
import { formatCurrency } from "@/lib/utils/format";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((j) => setCustomers(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = query
    ? customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : customers;

  const totalOwed = customers.reduce((s, c) => s + (c.balance_owed ?? 0), 0);

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-md mx-auto">
      <header className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="flex-1 text-base font-semibold text-text-primary">Khata / Customers</h1>
        </div>
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer…"
            className="w-full pl-9 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary placeholder:text-text-light" />
        </div>
      </header>

      {/* Summary card */}
      {!loading && customers.length > 0 && (
        <div className="mx-4 mt-3 bg-primary text-white rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">Total outstanding credit</p>
            <p className="text-2xl font-bold">{formatCurrency(totalOwed)}</p>
          </div>
          <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center">
            <Icon name="credit" size={24} />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <Icon name="customers" size={28} className="text-primary" />
            </div>
            <p className="text-text-primary font-medium">{query ? "No customers found" : "No customers yet"}</p>
            <p className="text-text-muted text-sm mt-1">Credit customers will appear here</p>
          </div>
        ) : (
          filtered.map((customer) => (
            <div key={customer.id} className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary text-sm">{customer.name}</p>
                {customer.phone && (
                  <p className="text-xs text-text-muted">{customer.phone}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className={`font-semibold text-sm ${customer.balance_owed > 0 ? "text-danger" : "text-safe"}`}>
                  {customer.balance_owed > 0 ? formatCurrency(customer.balance_owed) : "Settled"}
                </p>
                {customer.balance_owed > 0 && (
                  <p className="text-xs text-text-muted">owed</p>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
