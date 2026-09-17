# Tech Stack (Proposed)

This is a recommendation based on everything scoped so far — offline-first, single owner, needs to feel fast and reliable, plus WhatsApp/barcode/PWA requirements. Open to changing any piece of this before we start building.

## Frontend
- **Framework:** React (with Next.js) — good PWA support, large ecosystem, easy to make it installable on the owner's phone like a native app.
- **Styling:** Tailwind CSS, but with a fully custom color palette/typography (not default theme) so it doesn't look templated.
- **Offline support:** Service workers + local-first data storage (e.g. IndexedDB) so sales/stock actions work with no internet and sync later.
- **Barcode/QR scanning:** Browser-based camera scanning library (no extra hardware needed — owner's phone camera is enough).
- **Voice input:** Browser's built-in speech-to-text API for the voice-add feature.

## Backend
- **Database + backend:** Supabase (Postgres database + built-in auth + real-time sync + storage) — good fit since it handles auth, encrypted storage, and backups without building that infrastructure from scratch.
- **Sync strategy:** Local-first writes (instant, offline-safe) → background sync to Supabase when online.
- **Hosting:** Vercel or Netlify for the frontend; Supabase hosts the backend/database.

## Integrations
- **WhatsApp alerts:** WhatsApp Business API (or a service like Twilio/WhatsApp Cloud API) for daily summaries and expiry alerts.
- **PDF/Excel export:** Client-side generation (e.g. libraries for PDF and spreadsheet export) — no need for a heavy backend service.
- **Receipts:** Simple printable HTML receipt (print-to-PDF or connect to a basic thermal printer later if needed).

## Why This Combo
- Everything here supports the offline-first + simple + reliable requirements without needing a large team or expensive infrastructure.
- Supabase in particular keeps auth, encryption, and backups mostly "handled," which matters since this is a solo build for a real business that can't afford downtime or lost data.
- This stack is also consistent with tools already used across your other projects (React/Supabase pairing), so it should be a smooth build.

## Open Decision
- Whether to package this as an installable PWA only, or also wrap it later as a proper Android app (e.g. via Capacitor) if the owner prefers something from the Play Store — doesn't change the core stack either way.
