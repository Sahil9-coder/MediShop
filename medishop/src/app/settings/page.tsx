"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState("English");
  const [minutes, setMinutes] = useState("5");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true); setNotice("");
    const codes = { English: "en", "हिन्दी": "hi", "मराठी": "mr" } as const;
    try {
      const response = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: codes[language as keyof typeof codes], auto_lock_minutes: Number(minutes) }) });
      if (!response.ok) throw new Error();
      setNotice("Settings saved.");
    } catch { setNotice("Could not save settings. Check your connection and try again."); } finally { setSaving(false); }
  };
  return <main style={{ minHeight: "100dvh", maxWidth: 560, margin: "auto", padding: "1.5rem 1.25rem", background: "#F8FAFB", color: "#1A2332" }}>
    <button type="button" onClick={() => router.push("/")} style={backStyle}>← Back to dashboard</button>
    <p style={eyebrow}>PREFERENCES</p><h1 style={titleStyle}>Settings</h1><p style={{ color: "#64748B", margin: 0 }}>Keep the counter secure and ready for work.</p>
    <section style={sectionStyle}><h2>General</h2><label style={labelStyle}>Language<select value={language} onChange={(event) => setLanguage(event.target.value)} style={inputStyle}><option>English</option><option>हिन्दी</option><option>मराठी</option></select></label></section>
    <section style={sectionStyle}><h2>Security</h2><label style={labelStyle}>Auto-lock after<select value={minutes} onChange={(event) => setMinutes(event.target.value)} style={inputStyle}><option value="2">2 minutes</option><option value="5">5 minutes</option><option value="10">10 minutes</option></select></label><button type="button" style={rowButton}>Change PIN <span>›</span></button></section>
    <section style={sectionStyle}><h2>Backup</h2><div style={statusRow}><span><strong>Cloud backup</strong><small>Last backup: today, 3:00 AM</small></span><b>Connected</b></div></section>
    <section style={sectionStyle}><h2>Getting started</h2><button type="button" style={rowButton} onClick={() => router.push("/walkthrough")}>Run the walkthrough again <span>›</span></button></section>
    <p role="status" style={{ minHeight: 22, color: "#0F7B6C", fontSize: ".82rem" }}>{notice}</p><button type="button" disabled={saving} onClick={() => void save()} style={primaryStyle}>{saving ? "Saving…" : "Save settings"}</button>
  </main>;
}

const backStyle = { border: 0, background: "transparent", color: "#0F7B6C", fontWeight: 700, padding: "0 0 1.75rem", cursor: "pointer" };
const eyebrow = { margin: 0, color: "#0F7B6C", fontSize: ".7rem", fontWeight: 800, letterSpacing: ".12em" };
const titleStyle = { margin: ".45rem 0", fontSize: "2rem", letterSpacing: "-.04em" };
const sectionStyle = { marginTop: "1.25rem", padding: "1rem", background: "white", border: "1px solid #E2E8F0", borderRadius: 16 };
const labelStyle = { display: "grid", gap: 8, color: "#46605A", fontSize: ".8rem", fontWeight: 700 };
const inputStyle = { minHeight: 48, padding: "0 .75rem", border: "1px solid #CBD5E1", borderRadius: 10, background: "#fff", color: "#1A2332" };
const rowButton = { width: "100%", minHeight: 48, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", border: 0, background: "transparent", color: "#1A2332", textAlign: "left" as const, cursor: "pointer", fontWeight: 700 };
const statusRow = { display: "flex", alignItems: "center", justifyContent: "space-between" };
const primaryStyle = { width: "100%", minHeight: 52, marginTop: "1rem", border: 0, borderRadius: 14, background: "#0F7B6C", color: "white", fontWeight: 800, cursor: "pointer" };
