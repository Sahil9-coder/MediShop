"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  ["MediShop keeps the counter simple.", "Sell medicines, add stock, and catch expiries before they become a loss."],
  ["Sell in seconds.", "Search or scan a barcode, confirm the bill, and choose cash, UPI, or credit."],
  ["Add stock without the paperwork.", "Save the medicine, batch, expiry, prices, and quantity in one short form."],
  ["Check expiries before they cost you.", "The expiry dashboard puts urgent batches and safe stock in separate views."],
  ["You’re ready.", "Your daily counter tools are now one tap away."],
];

export default function WalkthroughPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const finish = async () => {
    setSaving(true);
    try { await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ first_run_done: true }) }); } finally { router.push("/"); }
  };
  const [heading, copy] = steps[step];
  return <main className="min-h-screen max-w-md mx-auto bg-primary text-white flex flex-col px-6 py-safe-top pb-8">
    <button type="button" onClick={() => router.push("/")} className="self-end min-h-11 px-3 text-sm text-white/75">Skip</button>
    <section className="flex-1 flex flex-col justify-center"><p className="text-xs font-bold tracking-[.18em] text-white/60">MEDISHOP · {step + 1} / {steps.length}</p><div className="flex gap-2 mt-5">{steps.map((_, index) => <span key={index} className={`h-1 rounded-full transition-all ${index === step ? "w-10 bg-white" : "w-3 bg-white/30"}`} />)}</div><h1 className="text-4xl font-semibold leading-tight tracking-tight mt-8">{heading}</h1><p className="text-white/80 leading-7 mt-5 text-base">{copy}</p></section>
    <button type="button" onClick={() => step === steps.length - 1 ? void finish() : setStep((value) => value + 1)} disabled={saving} className="min-h-14 rounded-2xl bg-white text-primary font-bold disabled:opacity-60">{step === steps.length - 1 ? (saving ? "Opening dashboard…" : "Open dashboard") : "Continue"}</button>
  </main>;
}
