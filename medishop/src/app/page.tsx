"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLockStore } from "@/store/lockStore";
import type { DashboardSummary } from "@/types/database";
import { formatCurrency } from "@/lib/utils/format";

type IconName = "lock" | "sell" | "stock" | "expiry" | "alert" | "sales" | "reports" | "customers" | "suppliers" | "settings" | "arrow";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    lock:      <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    sell:      <><path d="M4 7h16l-1 13H5L4 7Z" /><path d="M8 7a4 4 0 0 1 8 0M12 11v5M9.5 13.5h5" /></>,
    stock:     <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    expiry:    <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h.01M12 14h.01M16 14h.01" /></>,
    alert:     <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
    sales:     <><path d="M4 19V5M4 19h16M8 16v-5M12 16V7M16 16v-8" /></>,
    reports:   <><path d="M5 3h10l4 4v14H5V3Z" /><path d="M15 3v5h5M8 13h8M8 17h6" /></>,
    customers: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20v-1.5a5.5 5.5 0 0 1 11 0V20M17 10a3 3 0 0 1 0 5.8M17 14h1a3.5 3.5 0 0 1 3.5 3.5V20" /></>,
    suppliers: <><path d="M4 21V8l8-5 8 5v13M8 21v-6h8v6M8 10h.01M12 10h.01M16 10h.01" /></>,
    settings:  <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.3 2.3-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.1h-3.06v-.1a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.3-2.3.06-.06A1.7 1.7 0 0 0 6.6 15a1.7 1.7 0 0 0-1.56-1.03h-.1v-3.06h.1A1.7 1.7 0 0 0 6.6 9.88 1.7 1.7 0 0 0 6.26 8l-.06-.06 2.3-2.3.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.1h3.06v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.3 2.3-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.1v3.06h-.1A1.7 1.7 0 0 0 19.4 15Z" /></>,
    arrow:     <path d="M5 12h14M13 6l6 6-6 6" />,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

// Get current day greeting
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const router = useRouter();
  const { isLocked, unlock, lock, resetTimer } = useLockStore();

  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // Fetch dashboard data once unlocked
  useEffect(() => {
    if (!isLocked) {
      fetch("/api/dashboard")
        .then((r) => r.json())
        .then((j) => { if (j.data) setSummary(j.data); })
        .catch(() => {});
      fetch("/api/settings")
        .then((r) => r.json())
        .then((j) => { if (j.data && !j.data.first_run_done) router.replace("/walkthrough"); })
        .catch(() => {});
    }
  }, [isLocked, router]);

  // Track user activity to reset auto-lock timer
  useEffect(() => {
    if (isLocked) return;
    const events = ["click", "keydown", "touchstart", "scroll"];
    const handler = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [isLocked, resetTimer]);

  const enterDigit = (digit: string) => {
    if (pin.length < 6) { setPin((v) => v + digit); setMessage(""); }
  };

  const handleUnlock = async () => {
    if (pin.length < 4) return setMessage("Enter your 4–6 digit PIN.");
    setIsVerifying(true); setMessage("");
    try {
      const res = await fetch("/api/auth/pin?action=verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const result = await res.json();
      if (!res.ok || !result.valid) throw new Error(result.error || "That PIN is not correct.");
      unlock();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify PIN. Try again.");
      setPin("");
    } finally { setIsVerifying(false); }
  };

  // ── Lock screen ────────────────────────────────────────────
  if (isLocked) {
    return (
      <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0F7B6C", padding: "1.5rem" }}>
        <section style={{ background: "white", borderRadius: "1.5rem", padding: "2rem 1.5rem", width: "100%", maxWidth: "360px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E8F5F3", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: "#0F7B6C" }}>
            <Icon name="lock" size={26} />
          </div>
          <p style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.1em", color: "#0F7B6C", marginBottom: "0.25rem" }}>MEDISHOP</p>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1A2332", margin: "0 0 0.5rem" }}>Good to see you.</h1>
          <p style={{ color: "#64748B", fontSize: "0.875rem", marginBottom: "1.5rem" }}>Enter your PIN to open the counter.</p>

          {/* PIN dots */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginBottom: "0.75rem" }}>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} style={{
                width: 14, height: 14, borderRadius: "50%",
                background: i < pin.length ? "#0F7B6C" : "#E2E8F0",
                transition: "background 0.15s",
              }} />
            ))}
          </div>
          <p style={{ color: "#DC2626", fontSize: "0.8rem", minHeight: "1.2em", marginBottom: "1rem" }} role="status">
            {message || " "}
          </p>

          {/* Keypad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
            {["1","2","3","4","5","6","7","8","9"].map((d) => (
              <button key={d} onClick={() => enterDigit(d)}
                style={{ padding: "0.9rem", borderRadius: "0.75rem", border: "1px solid #E2E8F0", background: "#F8FAFB", fontSize: "1.2rem", fontWeight: 600, color: "#1A2332", cursor: "pointer" }}>
                {d}
              </button>
            ))}
            <button onClick={() => { setPin(""); setMessage(""); }}
              style={{ padding: "0.9rem", borderRadius: "0.75rem", border: "1px solid #E2E8F0", background: "#F8FAFB", fontSize: "0.8rem", color: "#64748B", cursor: "pointer" }}>
              Clear
            </button>
            <button onClick={() => enterDigit("0")}
              style={{ padding: "0.9rem", borderRadius: "0.75rem", border: "1px solid #E2E8F0", background: "#F8FAFB", fontSize: "1.2rem", fontWeight: 600, color: "#1A2332", cursor: "pointer" }}>
              0
            </button>
            <button onClick={() => setPin((v) => v.slice(0, -1))}
              style={{ padding: "0.9rem", borderRadius: "0.75rem", border: "1px solid #E2E8F0", background: "#F8FAFB", fontSize: "0.9rem", color: "#64748B", cursor: "pointer" }}>
              ⌫
            </button>
          </div>

          <button onClick={handleUnlock} disabled={isVerifying}
            style={{ width: "100%", padding: "0.9rem", borderRadius: "0.875rem", background: "#0F7B6C", color: "white", fontWeight: 700, fontSize: "1rem", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", opacity: isVerifying ? 0.7 : 1 }}>
            {isVerifying ? "Checking PIN…" : "Unlock MediShop"}
            {!isVerifying && <Icon name="arrow" size={18} />}
          </button>
        </section>
      </main>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const notices = [
    {
      icon: "expiry" as IconName,
      label: "Expiring this week",
      value: summary ? String(summary.expiring_this_week).padStart(2, "0") : "–",
      note: "Review medicines",
      tone: "warm",
      route: "/expiry",
    },
    {
      icon: "alert" as IconName,
      label: "Low stock",
      value: summary ? String(summary.low_stock_count).padStart(2, "0") : "–",
      note: "Need attention",
      tone: "rose",
      route: "/stock",
    },
    {
      icon: "sales" as IconName,
      label: "Yesterday's sales",
      value: summary ? formatCurrency(summary.yesterday_total) : "–",
      note: "View report",
      tone: "blue",
      route: "/reports",
    },
  ];

  const nav = [
    { icon: "reports" as IconName,   label: "Reports",   route: "/reports" },
    { icon: "customers" as IconName, label: "Khata",     route: "/customers" },
    { icon: "suppliers" as IconName, label: "Suppliers", route: "/suppliers" },
    { icon: "settings" as IconName,  label: "Settings",  route: "/settings" },
  ];

  const toneStyle: Record<string, { bg: string; icon: string; border: string }> = {
    warm: { bg: "#FFFBEB", icon: "#D97706", border: "#FDE68A" },
    rose: { bg: "#FFF1F2", icon: "#E11D48", border: "#FECDD3" },
    blue: { bg: "#EFF6FF", icon: "#2563EB", border: "#BFDBFE" },
  };

  return (
    <main style={{ minHeight: "100dvh", background: "#F8FAFB", maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #E2E8F0", padding: "1rem 1.25rem 0.875rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "0.08em", color: "#0F7B6C" }}>MEDISHOP</p>
          <p style={{ fontSize: "0.75rem", color: "#64748B", marginTop: 2 }}>{today}</p>
        </div>
        <button
          onClick={() => lock()}
          style={{ width: 38, height: 38, borderRadius: "50%", background: "#E8F5F3", color: "#0F7B6C", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          aria-label="Lock app"
        >
          <Icon name="lock" size={18} />
        </button>
      </header>

      {/* Greeting */}
      <section style={{ padding: "1.5rem 1.25rem 1rem" }}>
        <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "#94A3B8", textTransform: "uppercase", marginBottom: "0.25rem" }}>COUNTER OVERVIEW</p>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1A2332", margin: 0 }}>{greeting()}, Happy.</h1>
        <p style={{ color: "#64748B", fontSize: "0.875rem", marginTop: "0.25rem" }}>Everything important for today, in one place.</p>
      </section>

      {/* Main actions */}
      <section style={{ padding: "0 1.25rem 1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        <button
          onClick={() => { resetTimer(); router.push("/sell"); }}
          style={{ display: "flex", alignItems: "center", gap: "1rem", background: "#0F7B6C", color: "white", border: "none", borderRadius: "1rem", padding: "1.1rem 1.25rem", cursor: "pointer", textAlign: "left" }}
        >
          <span style={{ width: 44, height: 44, borderRadius: "0.75rem", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="sell" size={22} />
          </span>
          <span style={{ flex: 1 }}>
            <strong style={{ display: "block", fontSize: "1rem", fontWeight: 700 }}>Start selling</strong>
            <small style={{ fontSize: "0.8rem", opacity: 0.85 }}>Scan or find a medicine</small>
          </span>
          <Icon name="arrow" size={18} />
        </button>

        <button
          onClick={() => { resetTimer(); router.push("/stock"); }}
          style={{ display: "flex", alignItems: "center", gap: "1rem", background: "white", color: "#1A2332", border: "1px solid #E2E8F0", borderRadius: "1rem", padding: "1.1rem 1.25rem", cursor: "pointer", textAlign: "left", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <span style={{ width: 44, height: 44, borderRadius: "0.75rem", background: "#E8F5F3", color: "#0F7B6C", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="stock" size={22} />
          </span>
          <span style={{ flex: 1 }}>
            <strong style={{ display: "block", fontSize: "1rem", fontWeight: 700 }}>Add stock</strong>
            <small style={{ fontSize: "0.8rem", color: "#64748B" }}>Receive a new batch</small>
          </span>
          <Icon name="arrow" size={18} />
        </button>
      </section>

      {/* At a glance */}
      <section style={{ padding: "0 1.25rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <div>
            <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", color: "#94A3B8", textTransform: "uppercase", marginBottom: 2 }}>AT A GLANCE</p>
            <p style={{ fontSize: "1rem", fontWeight: 700, color: "#1A2332", margin: 0 }}>Keep the counter moving</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {notices.map((notice) => {
            const ts = toneStyle[notice.tone];
            return (
              <button key={notice.label}
                onClick={() => { resetTimer(); router.push(notice.route); }}
                style={{ display: "flex", alignItems: "center", gap: "0.875rem", background: ts.bg, border: `1px solid ${ts.border}`, borderRadius: "0.875rem", padding: "0.875rem 1rem", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ width: 36, height: 36, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: ts.icon }}>
                  <Icon name={notice.icon} size={18} />
                </span>
                <span style={{ flex: 1 }}>
                  <small style={{ fontSize: "0.72rem", color: "#64748B", display: "block" }}>{notice.label}</small>
                  <strong style={{ fontSize: "1.05rem", color: "#1A2332", display: "block" }}>{notice.value}</strong>
                  <em style={{ fontSize: "0.72rem", color: "#94A3B8", fontStyle: "normal" }}>{notice.note}</em>
                </span>
                <Icon name="arrow" size={17} />
              </button>
            );
          })}
        </div>
      </section>

      {/* Bottom nav */}
      <nav style={{ marginTop: "auto", borderTop: "1px solid #E2E8F0", background: "white", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "0.5rem 0 env(safe-area-inset-bottom)" }}>
        {nav.map(({ icon, label, route }) => (
          <button key={label} onClick={() => { resetTimer(); router.push(route); }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", padding: "0.6rem 0.25rem", border: "none", background: "transparent", color: "#64748B", cursor: "pointer", fontSize: "0.7rem", fontWeight: 500 }}>
            <Icon name={icon} size={22} />
            {label}
          </button>
        ))}
      </nav>
    </main>
  );
}
