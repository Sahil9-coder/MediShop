// ============================================================
// src/app/sell/page.tsx
// Phase 2 — Sell Screen (Scan-to-Sell)
//
// Features:
//  • Medicine search (name / barcode)
//  • Strip vs. loose sell-type selection
//  • Quantity adjustment inline
//  • Cart list with per-item remove
//  • Bill-level discount (₹ or %)
//  • Payment mode selector (Cash / UPI / Credit)
//  • Return mode toggle (turns accent when active)
//  • Complete Sale → POST /api/sales
//  • Cart auto-persisted to localStorage via cartStore
//  • Receipt prompt after completion
// ============================================================

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { useLockStore } from "@/store/lockStore";
import type { Medicine, Batch, SellType, PaymentMode } from "@/types/database";
import { formatCurrency, formatExpiry } from "@/lib/utils/format";
import { fifoBatch, stockDisplay, totalTabletsFromBatches, getExpiryStatus, calcLineTotal } from "@/lib/utils/stock";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";
import CameraScanner from "@/components/CameraScanner";

// ─── Types ──────────────────────────────────────────────────
type MedicineWithBatches = Medicine & { batches: Batch[] };

// ─── Sub-components ──────────────────────────────────────────

function ExpiryBadge({ expiry }: { expiry: string }) {
  const status = getExpiryStatus(expiry);
  const map = {
    expired: "bg-red-100 text-red-700",
    red:     "bg-red-50 text-red-600",
    orange:  "bg-amber-50 text-amber-700",
    green:   "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={`text-2xs font-medium px-1.5 py-0.5 rounded-full ${map[status]}`}>
      {formatExpiry(expiry)}
    </span>
  );
}

function SellTypeModal({
  medicine,
  batch,
  onConfirm,
  onClose,
}: {
  medicine: MedicineWithBatches;
  batch: Batch;
  onConfirm: (sellType: SellType, qty: number) => void;
  onClose: () => void;
}) {
  const [sellType, setSellType] = useState<SellType>("strip");
  const [qty, setQty] = useState(1);

  const totalTablets = totalTabletsFromBatches(medicine.batches);
  const maxQty =
    sellType === "strip"
      ? Math.floor(totalTablets / medicine.tablets_per_strip)
      : totalTablets;

  const lineTotal = calcLineTotal(
    sellType,
    sellType === "strip" ? qty * medicine.tablets_per_strip : qty,
    medicine.tablets_per_strip,
    sellType === "loose" ? (medicine.loose_price ?? medicine.selling_price) : medicine.selling_price
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 animate-slide-up shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-text-muted font-medium uppercase tracking-wide">Adding to cart</p>
            <h2 className="text-lg font-semibold text-text-primary mt-0.5">{medicine.name}</h2>
            {medicine.generic_name && (
              <p className="text-xs text-text-muted">{medicine.generic_name}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Stock & expiry */}
        <div className="flex items-center gap-2 mb-5 text-sm text-text-muted">
          <span>{stockDisplay(totalTablets, medicine)}</span>
          <span className="text-border">·</span>
          <ExpiryBadge expiry={batch.expiry_date} />
        </div>

        {/* Sell type toggle */}
        {medicine.loose_eligible && (
          <div className="flex rounded-xl border border-border overflow-hidden mb-5">
            {(["strip", "loose"] as SellType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setSellType(t); setQty(1); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  sellType === t
                    ? "bg-primary text-white"
                    : "bg-white text-text-muted hover:bg-gray-50"
                }`}
              >
                {t === "strip" ? "Sell Strip" : "Sell Loose (tablets)"}
              </button>
            ))}
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-text-muted">
            Quantity ({sellType === "strip" ? "strips" : "tablets"})
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
              disabled={qty <= 1}
            >
              <Icon name="minus" size={18} />
            </button>
            <span className="w-8 text-center font-semibold text-text-primary text-lg">{qty}</span>
            <button
              onClick={() => setQty(Math.min(maxQty, qty + 1))}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
              disabled={qty >= maxQty}
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
        </div>

        {/* Price preview */}
        <div className="flex items-center justify-between mb-6 py-3 border-t border-border">
          <span className="text-sm text-text-muted">Line total</span>
          <span className="text-xl font-semibold text-primary">{formatCurrency(lineTotal)}</span>
        </div>

        {/* Confirm */}
        <button
          onClick={() => onConfirm(sellType, qty)}
          className="w-full bg-primary text-white rounded-2xl py-3.5 font-semibold text-base hover:bg-primary-600 active:scale-[0.98] transition-all"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function DiscountModal({
  current,
  onSave,
  onClose,
}: {
  current: { flat?: number; pct?: number; reason?: string };
  onSave: (flat?: number, pct?: number, reason?: string) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<"flat" | "pct">(current.pct ? "pct" : "flat");
  const [value, setValue] = useState(String(current.flat ?? current.pct ?? ""));
  const [reason, setReason] = useState(current.reason ?? "");

  function handleSave() {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) { onSave(undefined, undefined, undefined); onClose(); return; }
    if (type === "flat") onSave(num, undefined, reason || undefined);
    else onSave(undefined, num, reason || undefined);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 animate-scale-in shadow-float" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Bill Discount</h3>

        <div className="flex rounded-xl border border-border overflow-hidden mb-4">
          {(["flat", "pct"] as const).map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${type === t ? "bg-primary text-white" : "bg-white text-text-muted"}`}>
              {t === "flat" ? "₹ Flat" : "% Percent"}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
            {type === "flat" ? "₹" : "%"}
          </span>
          <input
            type="number" min="0" value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full pl-7 pr-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
            placeholder="Enter amount"
            autoFocus
          />
        </div>

        <input
          type="text" value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:border-primary mb-5"
          placeholder="Reason (optional — e.g. regular customer)"
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-text-muted">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-medium">Apply</button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ total, onDone }: { total: number; onDone: () => void }) {
  const receipt = `MediShop receipt\nTotal paid: ${formatCurrency(total)}\nThank you for your purchase.`;
  const printOrShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "MediShop receipt", text: receipt });
      return;
    }
    window.print();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center animate-scale-in shadow-float">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon name="check" size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-1">Sale complete!</h2>
        <p className="text-text-muted text-sm mb-2">Total collected</p>
        <p className="text-3xl font-bold text-primary mb-6">{formatCurrency(total)}</p>

        <div className="flex gap-3 mb-3">
          <button
            onClick={onDone}
            className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-semibold"
          >
            Done
          </button>
        </div>
        <button onClick={() => void printOrShare()} className="w-full py-3 rounded-2xl border border-border text-sm text-text-muted flex items-center justify-center gap-2">
          <Icon name="receipt" size={16} />
          Print / Share receipt
        </button>
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────

export default function SellPage() {
  const router = useRouter();
  const resetTimer = useLockStore((s) => s.resetTimer);

  const {
    items, subtotal, total,
    payment_mode, bill_discount_flat, bill_discount_pct, discount_reason,
    addItem, removeItem, updateItemQty,
    setPaymentMode, setBillDiscount, clearCart, restoreCart,
  } = useCartStore();

  // ── State ──────────────────────────────────────────────────
  const [returnMode, setReturnMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicineWithBatches[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMed, setSelectedMed] = useState<MedicineWithBatches | null>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saleTotal, setSaleTotal] = useState<number | null>(null); // non-null = show receipt
  const [error, setError] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore persisted cart on mount
  useEffect(() => { restoreCart(); }, [restoreCart]);

  // ── Medicine search ────────────────────────────────────────
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const param = q.length > 4 && /^[\d-]+$/.test(q)
        ? `barcode=${encodeURIComponent(q)}`
        : `q=${encodeURIComponent(q)}`;
      const res = await fetch(`/api/medicines?${param}`);
      const json = await res.json();
      setResults((json.data as MedicineWithBatches[]) ?? []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => search(query), 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, search]);

  // ── Select medicine → open modal ──────────────────────────
  function selectMedicine(med: MedicineWithBatches) {
    resetTimer();
    setQuery("");
    setResults([]);
    setSelectedMed(med);
  }

  // ── Add to cart ───────────────────────────────────────────
  function handleAddToCart(sellType: SellType, qty: number) {
    if (!selectedMed) return;
    const batch = fifoBatch(selectedMed.batches);
    if (!batch) { setError("No stock available for this medicine."); setSelectedMed(null); return; }
    addItem(selectedMed, batch, sellType, qty);
    setSelectedMed(null);
    resetTimer();
  }

  // ── Complete sale ─────────────────────────────────────────
  async function completeSale() {
    if (items.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          payment_mode,
          discount_flat: bill_discount_flat,
          discount_pct: bill_discount_pct,
          discount_reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not complete sale.");
      setSaleTotal(total);
      clearCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sale failed. Please try again.");
    } finally { setSubmitting(false); }
  }

  const PAYMENT_MODES: { mode: PaymentMode; icon: "cash" | "upi" | "credit"; label: string }[] = [
    { mode: "cash",   icon: "cash",   label: "Cash" },
    { mode: "upi",    icon: "upi",    label: "UPI" },
    { mode: "credit", icon: "credit", label: "Credit" },
  ];

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-md mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-border px-4 pt-safe-top pb-0">
        <div className="flex items-center gap-3 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100"
            aria-label="Go back"
          >
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="flex-1 text-base font-semibold text-text-primary">
            {returnMode ? "Return Mode" : "Sell"}
          </h1>

          {/* Return mode toggle */}
          <button
            onClick={() => { setReturnMode((r) => !r); resetTimer(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              returnMode
                ? "bg-accent-50 text-accent border-accent"
                : "bg-gray-50 text-text-muted border-border"
            }`}
          >
            <Icon name="refresh" size={14} />
            {returnMode ? "Return ON" : "Return"}
          </button>
        </div>

        {/* ── Search bar ──────────────────────────────────── */}
        <div className="pb-3 relative">
          <div className="relative">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetTimer(); }}
              placeholder="Search medicine name or scan barcode…"
              className="w-full pl-9 pr-10 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary placeholder:text-text-light"
              autoFocus
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner size="sm" className="text-primary" />
              </span>
            )}
          </div>
          <button type="button" onClick={() => setShowScanner(true)} className="mt-2 w-full py-2 rounded-xl border border-primary-100 bg-primary-50 text-primary text-xs font-semibold">Scan with camera</button>

          {/* Search results dropdown */}
          {results.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-2xl shadow-card-lg z-30 overflow-hidden divide-y divide-border">
              {results.slice(0, 6).map((med) => {
                const total = totalTabletsFromBatches(med.batches ?? []);
                const outOfStock = total <= 0;
                return (
                  <li key={med.id}>
                    <button
                      onClick={() => !outOfStock && selectMedicine(med)}
                      disabled={outOfStock}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 disabled:opacity-40"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary">{med.name}</p>
                        {med.generic_name && (
                          <p className="text-xs text-text-light">{med.generic_name}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(med.selling_price)}
                        </p>
                        <p className={`text-xs ${outOfStock ? "text-danger" : "text-text-muted"}`}>
                          {outOfStock ? "Out of stock" : stockDisplay(total, med)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </header>

      {/* ── Cart items ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2 animate-fade-in">
            <Icon name="warning" size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <Icon name="sell" size={28} className="text-primary" />
            </div>
            <p className="text-text-primary font-medium">Cart is empty</p>
            <p className="text-text-muted text-sm mt-1">Search for a medicine above to start selling</p>
          </div>
        ) : (
          items.map((item, idx) => {
            const displayQty =
              item.sell_type === "strip"
                ? `${item.quantity_tablets / item.medicine.tablets_per_strip} strip${item.quantity_tablets / item.medicine.tablets_per_strip !== 1 ? "s" : ""}`
                : `${item.quantity_tablets} tablet${item.quantity_tablets !== 1 ? "s" : ""}`;

            return (
              <div key={idx} className="bg-white rounded-2xl p-4 shadow-card animate-slide-up">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm truncate">{item.medicine.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-2xs font-medium px-1.5 py-0.5 rounded-full ${
                        item.sell_type === "loose" ? "bg-blue-50 text-blue-600" : "bg-primary-50 text-primary"
                      }`}>
                        {item.sell_type === "loose" ? "Loose" : "Strip"}
                      </span>
                      <ExpiryBadge expiry={item.batch.expiry_date} />
                    </div>
                  </div>
                  <button
                    onClick={() => { removeItem(idx); resetTimer(); }}
                    className="p-1.5 rounded-full hover:bg-red-50 text-text-light hover:text-danger"
                    aria-label="Remove"
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>

                {/* Qty stepper + line total */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newQty = item.sell_type === "strip"
                          ? Math.max(1, item.quantity_tablets / item.medicine.tablets_per_strip - 1)
                          : Math.max(1, item.quantity_tablets - 1);
                        updateItemQty(idx, newQty);
                        resetTimer();
                      }}
                      className="w-8 h-8 border border-border rounded-full flex items-center justify-center hover:bg-gray-50"
                    >
                      <Icon name="minus" size={16} />
                    </button>
                    <span className="text-sm font-medium text-text-primary w-20 text-center">{displayQty}</span>
                    <button
                      onClick={() => {
                        const newQty = item.sell_type === "strip"
                          ? item.quantity_tablets / item.medicine.tablets_per_strip + 1
                          : item.quantity_tablets + 1;
                        updateItemQty(idx, newQty);
                        resetTimer();
                      }}
                      className="w-8 h-8 border border-border rounded-full flex items-center justify-center hover:bg-gray-50"
                    >
                      <Icon name="plus" size={16} />
                    </button>
                  </div>
                  <p className="text-base font-semibold text-text-primary">
                    {formatCurrency(item.line_total)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ── Bottom panel: totals + complete ─────────────────── */}
      {items.length > 0 && (
        <div className="bg-white border-t border-border px-4 pt-4 pb-6 pb-safe-bottom shadow-float">
          {/* Subtotal / discount row */}
          <div className="space-y-1.5 mb-4">
            <div className="flex justify-between text-sm text-text-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {(bill_discount_flat || bill_discount_pct) && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount {bill_discount_pct ? `(${bill_discount_pct}%)` : ""}</span>
                <span>−{formatCurrency(subtotal - total)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base text-text-primary border-t border-border pt-2">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Discount + payment row */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => { setShowDiscount(true); resetTimer(); }}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-xl text-sm text-text-muted hover:bg-gray-50"
            >
              <Icon name="tag" size={15} />
              {bill_discount_flat || bill_discount_pct ? "Edit discount" : "Add discount"}
            </button>
            <div className="flex gap-1.5 ml-auto">
              {PAYMENT_MODES.map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  onClick={() => { setPaymentMode(mode); resetTimer(); }}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    payment_mode === mode
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-text-muted border-border"
                  }`}
                >
                  <Icon name={icon} size={14} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Complete sale button */}
          <button
            onClick={completeSale}
            disabled={submitting}
            className="w-full bg-primary text-white rounded-2xl py-4 font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary-600 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {submitting ? <Spinner size="sm" className="text-white" /> : <Icon name="check" size={20} />}
            {submitting ? "Processing…" : "Complete Sale"}
          </button>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────── */}
      {selectedMed && (
        <SellTypeModal
          medicine={selectedMed}
          batch={fifoBatch(selectedMed.batches)!}
          onConfirm={handleAddToCart}
          onClose={() => setSelectedMed(null)}
        />
      )}

      {showDiscount && (
        <DiscountModal
          current={{
            flat: bill_discount_flat,
            pct: bill_discount_pct,
            reason: discount_reason,
          }}
          onSave={(f, p, r) => { setBillDiscount(f, p, r); resetTimer(); }}
          onClose={() => setShowDiscount(false)}
        />
      )}

      {saleTotal !== null && (
        <ReceiptModal
          total={saleTotal}
          onDone={() => { setSaleTotal(null); router.push("/"); }}
        />
      )}
      {showScanner && <CameraScanner onClose={() => setShowScanner(false)} onDetected={(value) => { setQuery(value); setShowScanner(false); void search(value); }} />}
    </div>
  );
}
