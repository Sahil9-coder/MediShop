"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const reports = {
  Sales: [["Today's sales", "Cash ₹4,240 · UPI ₹2,180", "₹6,420"], ["Yesterday", "43 completed bills", "₹8,420"], ["This month", "1–17 September", "₹1,04,680"]],
  "Top sellers": [["Paracetamol 650", "38 strips sold", "₹1,444"], ["Cetirizine 10", "31 strips sold", "₹744"], ["ORS Sachet", "26 sold", "₹572"]],
  "Expiry losses": [["This month", "No written-off stock", "₹0"], ["Last month", "2 batches", "₹640"], ["At risk", "Review the expiry dashboard", "₹2,180"]],
  "Dead stock": [["Vitamin B Complex", "No sale in 60 days", "₹980"], ["Antacid gel", "No sale in 45 days", "₹560"], ["Cough lozenges", "No sale in 40 days", "₹340"]],
};

export default function ReportsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<keyof typeof reports>("Sales");
  return <main style={{ minHeight: "100dvh", maxWidth: 560, margin: "auto", padding: "1.5rem 1.25rem", background: "#F8FAFB", color: "#1A2332" }}>
    <button type="button" onClick={() => router.push("/")} style={backStyle}>← Back to dashboard</button>
    <p style={eyebrow}>BUSINESS REPORTS</p><h1 style={titleStyle}>Know what moved.</h1><p style={copyStyle}>Sales, losses, and stock signals in one place.</p>
    <div role="tablist" aria-label="Report type" style={{ display: "flex", gap: 8, overflowX: "auto", margin: "1.5rem 0" }}>{(Object.keys(reports) as (keyof typeof reports)[]).map((name) => <button key={name} type="button" onClick={() => setTab(name)} role="tab" aria-selected={tab === name} style={{ ...tabStyle, ...(tab === name ? activeTabStyle : {}) }}>{name}</button>)}</div>
    <section aria-label={tab} style={{ background: "white", border: "1px solid #E2E8F0", borderRadius: 18, overflow: "hidden" }}>{reports[tab].map(([name, detail, value]) => <div key={name} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, padding: "1rem", borderBottom: "1px solid #E2E8F0" }}><span><strong style={{ display: "block" }}>{name}</strong><small style={{ color: "#64748B" }}>{detail}</small></span><strong style={{ alignSelf: "center", color: "#0F7B6C" }}>{value}</strong></div>)}</section>
    <button type="button" style={primaryStyle}>Export {tab} report</button>
  </main>;
}

const backStyle = { border: 0, background: "transparent", color: "#0F7B6C", fontWeight: 700, padding: "0 0 1.75rem", cursor: "pointer" };
const eyebrow = { margin: 0, color: "#0F7B6C", fontSize: ".7rem", fontWeight: 800, letterSpacing: ".12em" };
const titleStyle = { margin: ".45rem 0", fontSize: "2rem", letterSpacing: "-.04em" };
const copyStyle = { margin: 0, color: "#64748B" };
const tabStyle = { whiteSpace: "nowrap" as const, border: "1px solid #D7E2DF", background: "white", color: "#46605A", borderRadius: 999, padding: ".6rem .85rem", cursor: "pointer", fontWeight: 700, fontSize: ".78rem" };
const activeTabStyle = { borderColor: "#0F7B6C", background: "#0F7B6C", color: "white" };
const primaryStyle = { width: "100%", minHeight: 52, marginTop: "1.5rem", border: 0, borderRadius: 14, background: "#0F7B6C", color: "white", fontWeight: 800, cursor: "pointer" };
