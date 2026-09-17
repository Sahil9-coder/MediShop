// ============================================================
// src/store/cartStore.ts
// Zustand store for the sale cart — persisted to IndexedDB so
// mid-sale crashes never lose the cart.
// ============================================================
"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { CartItem, Cart, Medicine, Batch, SellType, PaymentMode } from "@/types/database";
import { calcLineTotal, applyDiscount } from "@/lib/utils/stock";

interface CartState extends Cart {
  // ── Derived ─────────────────────────────────────────────────
  subtotal: number;
  total: number;

  // ── Actions ─────────────────────────────────────────────────
  addItem: (medicine: Medicine, batch: Batch, sellType: SellType, qty: number) => void;
  removeItem: (index: number) => void;
  updateItemQty: (index: number, qty: number) => void;
  setItemDiscount: (index: number, flat?: number, pct?: number) => void;
  setPaymentMode: (mode: PaymentMode) => void;
  setCustomer: (customerId?: string) => void;
  setBillDiscount: (flat?: number, pct?: number, reason?: string) => void;
  clearCart: () => void;

  // ── Persistence ─────────────────────────────────────────────
  persistCart: () => Promise<void>;
  restoreCart: () => Promise<void>;
}

const CART_PERSIST_KEY = "medishop_cart";

function computeLineTotal(item: CartItem, medicine: Medicine): number {
  return calcLineTotal(
    item.sell_type,
    item.quantity_tablets,
    medicine.tablets_per_strip,
    item.price_at_sale
  );
}

function computeTotals(
  items: CartItem[],
  medicines: Record<string, Medicine>,
  billDiscountFlat?: number,
  billDiscountPct?: number
): { subtotal: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
  const total = applyDiscount(subtotal, billDiscountFlat, billDiscountPct);
  return { subtotal: parseFloat(subtotal.toFixed(2)), total: parseFloat(total.toFixed(2)) };
}

export const useCartStore = create<CartState>()(
  subscribeWithSelector((set, get) => ({
    items: [],
    payment_mode: "cash",
    customer_id: undefined,
    bill_discount_flat: undefined,
    bill_discount_pct: undefined,
    discount_reason: undefined,
    subtotal: 0,
    total: 0,

    addItem: (medicine, batch, sellType, qty) => {
      const priceAtSale =
        sellType === "loose" ? (medicine.loose_price ?? medicine.selling_price) : medicine.selling_price;
      const quantityTablets =
        sellType === "strip" ? qty * medicine.tablets_per_strip : qty;

      const lineTotal = calcLineTotal(sellType, quantityTablets, medicine.tablets_per_strip, priceAtSale);

      const newItem: CartItem = {
        medicine,
        batch,
        quantity_tablets: quantityTablets,
        sell_type: sellType,
        price_at_sale: priceAtSale,
        line_total: lineTotal,
      };

      set((state) => {
        const items = [...state.items, newItem];
        const subtotal = items.reduce((s, i) => s + i.line_total, 0);
        const total = applyDiscount(subtotal, state.bill_discount_flat, state.bill_discount_pct);
        return {
          items,
          subtotal: parseFloat(subtotal.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        };
      });

      get().persistCart();
    },

    removeItem: (index) => {
      set((state) => {
        const items = state.items.filter((_, i) => i !== index);
        const subtotal = items.reduce((s, i) => s + i.line_total, 0);
        const total = applyDiscount(subtotal, state.bill_discount_flat, state.bill_discount_pct);
        return {
          items,
          subtotal: parseFloat(subtotal.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        };
      });
      get().persistCart();
    },

    updateItemQty: (index, qty) => {
      set((state) => {
        const items = state.items.map((item, i) => {
          if (i !== index) return item;
          const quantityTablets =
            item.sell_type === "strip"
              ? qty * item.medicine.tablets_per_strip
              : qty;
          const lineTotal = calcLineTotal(
            item.sell_type,
            quantityTablets,
            item.medicine.tablets_per_strip,
            item.price_at_sale
          );
          return { ...item, quantity_tablets: quantityTablets, line_total: lineTotal };
        });
        const subtotal = items.reduce((s, i) => s + i.line_total, 0);
        const total = applyDiscount(subtotal, state.bill_discount_flat, state.bill_discount_pct);
        return {
          items,
          subtotal: parseFloat(subtotal.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        };
      });
      get().persistCart();
    },

    setItemDiscount: (index, flat, pct) => {
      set((state) => {
        const items = state.items.map((item, i) => {
          if (i !== index) return item;
          return { ...item, item_discount_flat: flat, item_discount_pct: pct };
        });
        return { items };
      });
      get().persistCart();
    },

    setPaymentMode: (mode) => {
      set({ payment_mode: mode });
      get().persistCart();
    },

    setCustomer: (customerId) => {
      set({ customer_id: customerId });
      get().persistCart();
    },

    setBillDiscount: (flat, pct, reason) => {
      set((state) => {
        const subtotal = state.items.reduce((s, i) => s + i.line_total, 0);
        const total = applyDiscount(subtotal, flat, pct);
        return {
          bill_discount_flat: flat,
          bill_discount_pct: pct,
          discount_reason: reason,
          total: parseFloat(total.toFixed(2)),
        };
      });
      get().persistCart();
    },

    clearCart: () => {
      set({
        items: [],
        payment_mode: "cash",
        customer_id: undefined,
        bill_discount_flat: undefined,
        bill_discount_pct: undefined,
        discount_reason: undefined,
        subtotal: 0,
        total: 0,
      });
      // Clear persisted cart
      if (typeof window !== "undefined") {
        localStorage.removeItem(CART_PERSIST_KEY);
      }
    },

    persistCart: async () => {
      if (typeof window === "undefined") return;
      const { items, payment_mode, customer_id, bill_discount_flat, bill_discount_pct, discount_reason } = get();
      const payload: Cart = { items, payment_mode, customer_id, bill_discount_flat, bill_discount_pct, discount_reason };
      try {
        localStorage.setItem(CART_PERSIST_KEY, JSON.stringify(payload));
      } catch {
        // localStorage full — fall back silently
      }
    },

    restoreCart: async () => {
      if (typeof window === "undefined") return;
      try {
        const raw = localStorage.getItem(CART_PERSIST_KEY);
        if (!raw) return;
        const cart: Cart = JSON.parse(raw);
        if (!cart.items?.length) return;
        const subtotal = cart.items.reduce((s, i) => s + i.line_total, 0);
        const total = applyDiscount(subtotal, cart.bill_discount_flat, cart.bill_discount_pct);
        set({
          ...cart,
          subtotal: parseFloat(subtotal.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
        });
      } catch {
        // Corrupt data — ignore
      }
    },
  }))
);
