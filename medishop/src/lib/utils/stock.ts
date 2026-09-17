// ============================================================
// src/lib/utils/stock.ts
// Stock calculation helpers — strip ↔ tablet conversions,
// friendly display strings, FIFO batch selection, low-stock check.
// ============================================================

import type { Batch, Medicine, ExpiryStatus } from "@/types/database";

// ─── Unit conversions ──────────────────────────────────────────

/** Convert strips to tablets. */
export function stripsToTablets(strips: number, tabletsPerStrip: number): number {
  return strips * tabletsPerStrip;
}

/** Convert tablets to full strips + remainder loose tablets. */
export function tabletsToStrips(
  tablets: number,
  tabletsPerStrip: number
): { strips: number; loose: number } {
  return {
    strips: Math.floor(tablets / tabletsPerStrip),
    loose: tablets % tabletsPerStrip,
  };
}

// ─── Human-friendly stock display ────────────────────────────
/** Returns owner-friendly stock string. Mirrors the DB function get_stock_display(). */
export function stockDisplay(
  totalTablets: number,
  medicine: Pick<Medicine, "loose_eligible" | "tablets_per_strip">
): string {
  if (totalTablets <= 0) return "Out of stock";

  if (medicine.loose_eligible) {
    const { strips, loose } = tabletsToStrips(totalTablets, medicine.tablets_per_strip);
    if (strips > 0 && loose > 0) {
      return `${strips} strip${strips > 1 ? "s" : ""} + ${loose} loose tablet${loose > 1 ? "s" : ""}`;
    }
    if (strips > 0) return `${strips} strip${strips > 1 ? "s" : ""}`;
    return `${loose} loose tablet${loose > 1 ? "s" : ""}`;
  } else {
    const strips = Math.floor(totalTablets / medicine.tablets_per_strip);
    if (strips === 0) return "Less than 1 strip";
    return `${strips} strip${strips > 1 ? "s" : ""}`;
  }
}

// ─── Total tablets across batches ────────────────────────────
export function totalTabletsFromBatches(batches: Batch[]): number {
  return batches
    .filter((b) => b.is_active && b.quantity_tablets > 0)
    .reduce((sum, b) => sum + b.quantity_tablets, 0);
}

// ─── FIFO batch selection ─────────────────────────────────────
/**
 * Returns the batch that should be sold first (FIFO = earliest expiry).
 * Filters to only active, in-stock batches.
 */
export function fifoBatch(batches: Batch[]): Batch | undefined {
  return batches
    .filter((b) => b.is_active && b.quantity_tablets > 0)
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0];
}

// ─── Expiry status ───────────────────────────────────────────
/** Mirrors the DB function get_expiry_status(). */
export function getExpiryStatus(expiryDateStr: string): ExpiryStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft < 0) return "expired";
  if (daysLeft < 30) return "red";
  if (daysLeft < 90) return "orange";
  return "green";
}

export function daysUntilExpiry(expiryDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Low stock check ─────────────────────────────────────────
export function isLowStock(totalTablets: number, reorderLevel: number): boolean {
  return totalTablets <= reorderLevel;
}

// ─── Price calculations ───────────────────────────────────────
export interface LineTotal {
  unitPrice: number;
  quantity: number; // tablets
  lineTotal: number;
}

/**
 * Calculate the line total for a sale item.
 * For strips: price is per strip (quantity in tablets, convert to strips).
 * For loose: price is per tablet.
 */
export function calcLineTotal(
  sellType: "strip" | "loose",
  quantityTablets: number,
  tabletsPerStrip: number,
  priceAtSale: number
): number {
  if (sellType === "loose") {
    return parseFloat((priceAtSale * quantityTablets).toFixed(2));
  } else {
    const strips = quantityTablets / tabletsPerStrip;
    return parseFloat((priceAtSale * strips).toFixed(2));
  }
}

// ─── Discount application ─────────────────────────────────────
export function applyDiscount(
  subtotal: number,
  discountFlat?: number,
  discountPct?: number
): number {
  if (discountFlat !== undefined && discountFlat > 0) {
    return Math.max(0, parseFloat((subtotal - discountFlat).toFixed(2)));
  }
  if (discountPct !== undefined && discountPct > 0) {
    return Math.max(0, parseFloat((subtotal * (1 - discountPct / 100)).toFixed(2)));
  }
  return subtotal;
}

// ─── Suggested discount for near-expiry stock ──────────────────
/**
 * Suggests a discount % to move stock nearing expiry.
 * Critical medicines are never discounted.
 * Red (<30 days): 30% | Orange (<90 days): 15%
 */
export function suggestExpiryDiscount(
  expiryStatus: ExpiryStatus,
  isCritical: boolean
): number | null {
  if (isCritical) return null;
  if (expiryStatus === "red") return 30;
  if (expiryStatus === "orange") return 15;
  return null;
}

// ─── Return window check ──────────────────────────────────────
/**
 * Returns true if the batch is within the supplier's return window.
 * returnWindowDays: number of days before expiry the supplier accepts returns.
 */
export function isWithinReturnWindow(
  expiryDateStr: string,
  returnWindowDays: number
): boolean {
  const daysLeft = daysUntilExpiry(expiryDateStr);
  // If batch is not yet expired and we're within the window
  return daysLeft >= 0 && daysLeft <= returnWindowDays;
}
