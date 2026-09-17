// ============================================================
// src/app/stock/page.tsx
// Phase 2 — Add / Edit Stock Screen
//
// Features:
//  • List all medicines with stock levels + expiry status
//  • Search by name
//  • "Add new medicine" → inline form (slide-up panel)
//  • Tap existing medicine → edit its fields
//  • Add batch to existing medicine
//  • All fields from spec: name, generic, category,
//    loose-eligible, loose price, rx flag, barcode,
//    cost price, selling price, reorder level, supplier,
//    batch number, expiry date, quantity
// ============================================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLockStore } from "@/store/lockStore";
import type { Medicine, Batch, MedicineCategory, Supplier } from "@/types/database";
import { formatCurrency, formatExpiry } from "@/lib/utils/format";
import { totalTabletsFromBatches, stockDisplay, getExpiryStatus } from "@/lib/utils/stock";
import Icon from "@/components/ui/Icon";
import Spinner from "@/components/ui/Spinner";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

// ─── Types ───────────────────────────────────────────────────
type MedicineWithBatches = Medicine & { batches: Batch[]; supplier?: Supplier };

const CATEGORIES: { value: MedicineCategory; label: string }[] = [
  { value: "tablet",  label: "Tablet" },
  { value: "capsule", label: "Capsule" },
  { value: "syrup",   label: "Syrup" },
  { value: "injection", label: "Injection" },
  { value: "ointment", label: "Ointment" },
  { value: "cream",   label: "Cream" },
  { value: "drops",   label: "Drops" },
  { value: "inhaler", label: "Inhaler" },
  { value: "powder",  label: "Powder" },
  { value: "other",   label: "Other" },
];

// ─── Medicine form (new or edit) ──────────────────────────────
interface MedForm {
  name: string;
  generic_name: string;
  category: MedicineCategory;
  loose_eligible: boolean;
  tablets_per_strip: string;
  rx_required: boolean;
  barcode: string;
  cost_price: string;
  selling_price: string;
  loose_price: string;
  reorder_level: string;
  is_critical: boolean;
  symptoms: string;
  // First batch fields
  batch_number: string;
  expiry_date: string;
  quantity: string;
}

const BLANK_FORM: MedForm = {
  name: "", generic_name: "", category: "tablet",
  loose_eligible: false, tablets_per_strip: "10",
  rx_required: false, barcode: "", cost_price: "", selling_price: "",
  loose_price: "", reorder_level: "10", is_critical: false, symptoms: "",
  batch_number: "", expiry_date: "", quantity: "",
};

// ─── Expiry pill ─────────────────────────────────────────────
function ExpiryPill({ expiry }: { expiry: string }) {
  const s = getExpiryStatus(expiry);
  const classes = {
    expired: "bg-red-100 text-red-700 border-red-200",
    red:     "bg-red-50 text-red-600 border-red-100",
    orange:  "bg-amber-50 text-amber-700 border-amber-100",
    green:   "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <span className={`text-2xs font-medium px-2 py-0.5 rounded-full border ${classes[s]}`}>
      {formatExpiry(expiry)}
    </span>
  );
}

// ─── Add batch modal ─────────────────────────────────────────
function AddBatchModal({
  medicine,
  onClose,
  onAdded,
}: {
  medicine: MedicineWithBatches;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [batchNo, setBatchNo] = useState("");
  const [expiry, setExpiry] = useState("");
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    if (!batchNo || !expiry || !qty) { setErr("All fields are required."); return; }
    setSaving(true);
    setErr("");
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicine_id: medicine.id,
          batch_number: batchNo,
          expiry_date: expiry,
          quantity_tablets: parseInt(qty) * medicine.tablets_per_strip,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not add batch.");
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 animate-slide-up shadow-float" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Add Batch — {medicine.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><Icon name="x" size={20} /></button>
        </div>

        {err && <p className="text-sm text-danger mb-3">{err}</p>}

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-text-muted font-medium">Batch Number</span>
            <input value={batchNo} onChange={(e) => setBatchNo(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. BT2024001" />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted font-medium">Expiry Date</span>
            <input type="month" value={expiry} onChange={(e) => setExpiry(e.target.value + "-01")}
              className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="text-xs text-text-muted font-medium">Quantity (strips)</span>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder="Number of strips received" />
          </label>
        </div>

        <button onClick={save} disabled={saving}
          className="mt-5 w-full bg-primary text-white rounded-2xl py-3.5 font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Spinner size="sm" className="text-white" /> : <Icon name="plus" size={18} />}
          {saving ? "Saving…" : "Add Batch"}
        </button>
      </div>
    </div>
  );
}

// ─── Medicine form panel ──────────────────────────────────────
function MedFormPanel({
  initial,
  suppliers,
  onClose,
  onSaved,
}: {
  initial?: MedicineWithBatches;
  suppliers: Supplier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<MedForm>({
    ...BLANK_FORM,
    ...(initial
      ? {
          name: initial.name,
          generic_name: initial.generic_name ?? "",
          category: initial.category,
          loose_eligible: initial.loose_eligible,
          tablets_per_strip: String(initial.tablets_per_strip),
          rx_required: initial.rx_required,
          barcode: initial.barcode ?? "",
          cost_price: String(initial.cost_price),
          selling_price: String(initial.selling_price),
          loose_price: initial.loose_price ? String(initial.loose_price) : "",
          reorder_level: String(initial.reorder_level),
          is_critical: initial.is_critical,
          symptoms: (initial.symptoms ?? []).join(", "),
        }
      : {}),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const isEdit = !!initial;
  const canBeLoose = ["tablet", "capsule"].includes(form.category);

  function set<K extends keyof MedForm>(key: K, val: MedForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function voiceAddName() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) { setErr("Voice input is not supported in this browser. Type the medicine name instead."); return; }
    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (event) => set("name", event.results[0][0].transcript.trim());
    recognition.onerror = () => setErr("Voice input could not hear a medicine name. Please try again.");
    recognition.start();
  }

  async function save() {
    if (!form.name || !form.cost_price || !form.selling_price) {
      setErr("Name, cost price, and selling price are required.");
      return;
    }
    if (form.loose_eligible && !form.loose_price) {
      setErr("Set a per-tablet price for loose selling.");
      return;
    }
    if (!isEdit && (!form.batch_number || !form.expiry_date || !form.quantity)) {
      setErr("Batch number, expiry date, and quantity are required for the first batch.");
      return;
    }

    setSaving(true);
    setErr("");

    try {
      const payload = {
        name: form.name.trim(),
        generic_name: form.generic_name.trim() || null,
        category: form.category,
        loose_eligible: canBeLoose ? form.loose_eligible : false,
        tablets_per_strip: parseInt(form.tablets_per_strip) || 10,
        rx_required: form.rx_required,
        barcode: form.barcode.trim() || null,
        cost_price: parseFloat(form.cost_price),
        selling_price: parseFloat(form.selling_price),
        loose_price: form.loose_eligible && form.loose_price ? parseFloat(form.loose_price) : null,
        reorder_level: parseInt(form.reorder_level) || 10,
        is_critical: form.is_critical,
        symptoms: form.symptoms ? form.symptoms.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : null,
      };

      let medicineId = initial?.id;

      if (isEdit) {
        const res = await fetch(`/api/medicines/${initial!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not update medicine.");
      } else {
        const res = await fetch("/api/medicines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not save medicine.");
        medicineId = json.data?.id;

        // Add first batch
        if (medicineId) {
          const bRes = await fetch("/api/batches", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              medicine_id: medicineId,
              batch_number: form.batch_number,
              expiry_date: form.expiry_date,
              quantity_tablets: parseInt(form.quantity) * (parseInt(form.tablets_per_strip) || 10),
            }),
          });
          const bJson = await bRes.json();
          if (!bRes.ok) throw new Error(bJson.error ?? "Medicine saved but batch failed.");
        }
      }

      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg animate-fade-in">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <Icon name="arrow-left" size={20} />
        </button>
        <h1 className="flex-1 text-base font-semibold text-text-primary">
          {isEdit ? "Edit Medicine" : "Add New Medicine"}
        </h1>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {saving ? <Spinner size="sm" className="text-white" /> : null}
          {saving ? "Saving…" : "Save"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-md mx-auto w-full">
        {err && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <Icon name="warning" size={16} className="shrink-0" />
            {err}
          </div>
        )}

        {/* ── Medicine details ───── */}
        <section className="bg-white rounded-2xl p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between"><p className="text-xs font-semibold text-text-light uppercase tracking-wide">Medicine Details</p><button type="button" onClick={voiceAddName} className="text-xs font-semibold text-primary">Voice add</button></div>

          <label className="block">
            <span className="text-xs text-text-muted font-medium">Name *</span>
            <input value={form.name} onChange={(e) => set("name", e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. Paracetamol 500mg" />
          </label>

          <label className="block">
            <span className="text-xs text-text-muted font-medium">Generic / Salt Name</span>
            <input value={form.generic_name} onChange={(e) => set("generic_name", e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. Paracetamol (optional)" />
          </label>

          <label className="block">
            <span className="text-xs text-text-muted font-medium">Category *</span>
            <select value={form.category} onChange={(e) => set("category", e.target.value as MedicineCategory)}
              className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary bg-white">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-text-muted font-medium">Barcode / QR value</span>
            <input value={form.barcode} onChange={(e) => set("barcode", e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder="Scan or type barcode (optional)" />
          </label>

          <label className="block">
            <span className="text-xs text-text-muted font-medium">Symptoms (for search)</span>
            <input value={form.symptoms} onChange={(e) => set("symptoms", e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
              placeholder="fever, headache, cold (comma-separated)" />
          </label>

          {/* Toggles */}
          <div className="space-y-2 pt-1">
            {canBeLoose && (
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">Can be sold loose?</p>
                  <p className="text-xs text-text-muted">Enables per-tablet selling</p>
                </div>
                <button
                  type="button"
                  onClick={() => set("loose_eligible", !form.loose_eligible)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.loose_eligible ? "bg-primary" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.loose_eligible ? "translate-x-5.5" : "translate-x-0.5"}`} />
                </button>
              </label>
            )}
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Prescription required (Rx)</p>
                <p className="text-xs text-text-muted">Shows reminder on sell screen</p>
              </div>
              <button
                type="button"
                onClick={() => set("rx_required", !form.rx_required)}
                className={`w-11 h-6 rounded-full transition-colors relative ${form.rx_required ? "bg-primary" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.rx_required ? "translate-x-5.5" : "translate-x-0.5"}`} />
              </button>
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Critical / Emergency stock</p>
                <p className="text-xs text-text-muted">Never auto-suggested for discount</p>
              </div>
              <button
                type="button"
                onClick={() => set("is_critical", !form.is_critical)}
                className={`w-11 h-6 rounded-full transition-colors relative ${form.is_critical ? "bg-accent" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_critical ? "translate-x-5.5" : "translate-x-0.5"}`} />
              </button>
            </label>
          </div>
        </section>

        {/* ── Pricing ────────────────── */}
        <section className="bg-white rounded-2xl p-4 shadow-card space-y-3">
          <p className="text-xs font-semibold text-text-light uppercase tracking-wide">Pricing</p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-text-muted font-medium">Cost Price (₹) *</span>
              <input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => set("cost_price", e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="0.00" />
            </label>
            <label className="block">
              <span className="text-xs text-text-muted font-medium">Selling Price (₹) *</span>
              <input type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => set("selling_price", e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="0.00" />
            </label>
          </div>

          {form.loose_eligible && (
            <label className="block">
              <span className="text-xs text-text-muted font-medium">Loose Price per tablet (₹) *</span>
              <input type="number" min="0" step="0.01" value={form.loose_price} onChange={(e) => set("loose_price", e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="0.00" />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-text-muted font-medium">Tablets per Strip</span>
              <input type="number" min="1" value={form.tablets_per_strip} onChange={(e) => set("tablets_per_strip", e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="text-xs text-text-muted font-medium">Reorder Level (tablets)</span>
              <input type="number" min="0" value={form.reorder_level} onChange={(e) => set("reorder_level", e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
            </label>
          </div>
        </section>

        {/* ── First batch (new only) ── */}
        {!isEdit && (
          <section className="bg-white rounded-2xl p-4 shadow-card space-y-3">
            <p className="text-xs font-semibold text-text-light uppercase tracking-wide">First Batch</p>

            <label className="block">
              <span className="text-xs text-text-muted font-medium">Batch Number *</span>
              <input value={form.batch_number} onChange={(e) => set("batch_number", e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. BT2024001" />
            </label>

            <label className="block">
              <span className="text-xs text-text-muted font-medium">Expiry Date *</span>
              <input type="month" onChange={(e) => set("expiry_date", e.target.value ? e.target.value + "-01" : "")}
                className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary" />
            </label>

            <label className="block">
              <span className="text-xs text-text-muted font-medium">Quantity (strips) *</span>
              <input type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
                placeholder="Number of strips received" />
            </label>
          </section>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export default function StockPage() {
  const router = useRouter();
  const resetTimer = useLockStore((s) => s.resetTimer);

  const [medicines, setMedicines] = useState<MedicineWithBatches[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMed, setEditMed] = useState<MedicineWithBatches | null>(null);
  const [addBatchMed, setAddBatchMed] = useState<MedicineWithBatches | null>(null);

  const load = useCallback(async (q = "") => {
    setLoading(true);
    try {
      const param = q ? `?q=${encodeURIComponent(q)}` : "";
      const [mRes, sRes] = await Promise.all([
        fetch(`/api/medicines${param}`),
        fetch("/api/suppliers"),
      ]);
      const mJson = await mRes.json();
      const sJson = await sRes.json();
      setMedicines(mJson.data ?? []);
      setSuppliers(sJson.data ?? []);
    } catch { /* swallow */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(query), 350);
    return () => clearTimeout(t);
  }, [query, load]);

  function onSaved() {
    setShowForm(false);
    setEditMed(null);
    load(query);
  }

  function onBatchAdded() {
    setAddBatchMed(null);
    load(query);
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col max-w-md mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100" aria-label="Back">
            <Icon name="arrow-left" size={20} />
          </button>
          <h1 className="flex-1 text-base font-semibold text-text-primary">Stock</h1>
          <button
            onClick={() => { setEditMed(null); setShowForm(true); resetTimer(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-sm font-semibold"
          >
            <Icon name="plus" size={16} />
            Add medicine
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light" />
          <input
            type="text" value={query}
            onChange={(e) => { setQuery(e.target.value); resetTimer(); }}
            placeholder="Search by name…"
            className="w-full pl-9 pr-4 py-2.5 bg-bg border border-border rounded-xl text-sm focus:outline-none focus:border-primary placeholder:text-text-light"
          />
        </div>
      </header>

      {/* ── List ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : medicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
              <Icon name="stock" size={28} className="text-primary" />
            </div>
            <p className="text-text-primary font-medium">
              {query ? "No medicines found" : "No stock added yet"}
            </p>
            <p className="text-text-muted text-sm mt-1">
              {query ? "Try a different search" : `Tap "Add medicine" to get started`}
            </p>
          </div>
        ) : (
          medicines.map((med) => {
            const totalTablets = totalTabletsFromBatches(med.batches ?? []);
            const outOfStock = totalTablets <= 0;
            const activeBatches = (med.batches ?? []).filter((b) => b.is_active && b.quantity_tablets > 0);
            const nearestExpiry = activeBatches.sort(
              (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
            )[0];

            return (
              <div key={med.id} className="bg-white rounded-2xl p-4 shadow-card animate-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-text-primary text-sm">{med.name}</p>
                      {med.rx_required && (
                        <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">Rx</span>
                      )}
                      {med.is_critical && (
                        <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600">Critical</span>
                      )}
                    </div>
                    {med.generic_name && (
                      <p className="text-xs text-text-light mt-0.5">{med.generic_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-xs font-medium ${outOfStock ? "text-danger" : "text-text-muted"}`}>
                        {outOfStock ? "Out of stock" : stockDisplay(totalTablets, med)}
                      </span>
                      {nearestExpiry && (
                        <>
                          <span className="text-text-light text-xs">·</span>
                          <ExpiryPill expiry={nearestExpiry.expiry_date} />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(med.selling_price)}</p>
                    <p className="text-xs text-text-light">cost {formatCurrency(med.cost_price)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <button
                    onClick={() => { setEditMed(med); setShowForm(true); resetTimer(); }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg text-xs text-text-muted hover:bg-gray-50"
                  >
                    <Icon name="edit" size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => { setAddBatchMed(med); resetTimer(); }}
                    className="flex items-center gap-1 px-3 py-1.5 border border-primary-100 bg-primary-50 rounded-lg text-xs text-primary hover:bg-primary-100"
                  >
                    <Icon name="plus" size={14} />
                    Add batch
                  </button>
                  {activeBatches.length > 0 && (
                    <span className="ml-auto text-xs text-text-light self-center">
                      {activeBatches.length} batch{activeBatches.length !== 1 ? "es" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* ── Form panel ──────────────────────────────────────── */}
      {(showForm || editMed) && (
        <MedFormPanel
          initial={editMed ?? undefined}
          suppliers={suppliers}
          onClose={() => { setShowForm(false); setEditMed(null); }}
          onSaved={onSaved}
        />
      )}

      {/* ── Add batch modal ──────────────────────────────────── */}
      {addBatchMed && (
        <AddBatchModal
          medicine={addBatchMed}
          onClose={() => setAddBatchMed(null)}
          onAdded={onBatchAdded}
        />
      )}
    </div>
  );
}
