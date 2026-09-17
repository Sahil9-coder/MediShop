# Starter Prompt — Medical Shop App Build

Copy-paste this into Claude Code (or any AI coding assistant) along with the attached `00-FULL-SPEC.md` file to begin building.

---

I'm building a web app (PWA) for a friend who owns a medical/pharmacy shop. Full requirements are in the attached spec file — please read it fully before starting.

**Quick summary:**
- Single owner uses this daily (no staff logins needed yet), and they've never used technical tools before — every screen must be dead simple, one clear action at a time.
- Core loop: scan a medicine's barcode/QR to sell it (auto-deducts stock, uses selling price), with a manual "Return" toggle for the rare return case.
- Some medicines can be sold loose (per tablet) — this is a per-medicine setting, not global, and stock must stay accurate in tablet-level units under the hood even for strip-only medicines.
- Everything must be editable after entry (price, quantity, expiry, batch) — mistakes happen at a counter.
- Must be offline-first — a customer at the counter should never be blocked by a bad connection. Auto-save cart state, graceful scan failures, no crashes.
- Needs PIN/biometric lock, encrypted data, and automatic daily backups.
- Visual design should feel custom and intentional — not like a generic AI-generated template. Distinct color palette and typography, not default component library styling.

**What I want from you right now:**
1. Confirm you've reviewed the full spec and flag anything ambiguous or missing before we start.
2. Propose the initial project scaffold/folder structure based on the tech stack in the spec (React/Next.js frontend, Supabase backend, offline-first with local storage + background sync).
3. Start with Phase 1 from the roadmap: data model + auth/lock screen + home dashboard shell. Build one piece at a time — don't try to generate the whole app in one shot.
4. After each piece, tell me what to test before we move to the next phase.

Let's start with step 1 and 2 now.
