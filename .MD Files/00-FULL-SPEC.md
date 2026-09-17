# Medical Shop Inventory & Billing App — Full Spec

_Combined document — everything from planning: overview, features, business rules, security, data model, tech stack, UX screens, and roadmap._

---

# Medical Shop Inventory & Billing App — Project Overview

## What This Is
A web app (PWA) for a friend's medical/pharmacy shop, replacing manual expiry checks and paper-based tracking. Built for a **single owner/operator** (no staff logins needed for v1).

## The Core Problem
- Owner currently checks expiry dates manually every 3 months across the whole shop's inventory — slow, error-prone, and easy to miss things.
- No easy way to track loose (per-tablet) sales, discounts, credit customers, or daily cash reconciliation.

## Who Uses It
- **Primary user:** The shop owner, day-to-day.
- **Tech comfort level:** Mixed — has never used technical/tech-heavy tools before. Every design decision must favor simplicity over feature density on-screen.

## Design Philosophy
1. **Should not look "AI-made"** — a custom, distinct visual identity (palette, typography, micro-interactions), not a generic template.
2. **One clear action per screen** — never force two decisions at once.
3. **Real words, not tech jargon** — "Add Medicine" not "Create Entry."
4. **Fast and error-proof at the counter** — a customer standing there should never see the app struggle. Offline-first, auto-save, undo everywhere.
5. **Everything editable** — prices, quantities, expiry dates, batches — nothing locked in after entry (mistakes happen at a counter).

## v1 Scope
Owner wants the **full feature set in v1** (not a phased minimal launch) — see `02-features.md` for the complete list.

## Status
📋 Planning phase — features and business rules fully scoped. Next steps: data structure design and tech stack selection.

---

# Feature List

## 1. Inventory & Expiry
- Add medicine: name, batch no., quantity, cost price, selling price, expiry date, supplier
- Barcode/QR scan-to-add for fast entry
- Voice-add mode (speak the details instead of typing)
- Expiry dashboard — color-coded: red (<30 days), orange (<90 days), green (safe)
- Calendar heatmap view of upcoming expiries
- Predictive expiry risk — flags slow-moving stock likely to expire unsold (based on sales pace)
- Near-expiry return automation — tracks each supplier's return window and reminds owner before it closes
- Expiry-linked discount suggestion — suggests a % discount to move stock nearing expiry
- Damaged/expired write-off button — separate from customer returns, keeps inventory accurate
- Emergency/rare stock flag — critical medicines (e.g., insulin) never auto-flagged for discount

## 2. Selling / Billing (Scan-to-Sell)
- **Default mode = Sell.** Scan QR/barcode → item appears with price → scan next → "Complete Sale" → stock auto-deducts, sale logged at that price.
- **Return mode** — manual toggle (clearly visible, e.g. red when active); scanning in this mode adds stock back. Auto-resets to Sell mode after each return.
- Receipt is **optional** — after a sale: "Done" (no receipt) or "Print/Share Receipt," so small purchases stay fast.
- FIFO sell-first suggestion — nudges to sell the batch expiring soonest when multiple batches exist.
- Quick-sell shortcuts — top 10 fastest-moving items as one-tap buttons (no scanning needed).
- Common combo bundling — e.g. a "fever kit" bundle sold as one tap.
- Auto-save cart — if the app closes mid-sale, it resumes exactly where it left off.

## 3. Loose (Per-Tablet) Sales
- **Per-medicine toggle**, off by default: "Can this be sold loose? Yes/No." Only relevant medicines (tablets/capsules) get this option — not a global setting.
- If "No" — sell screen only shows whole strip/box; no loose option shown at all.
- If "Yes" — sell screen shows **"Sell Strip"** and **"Sell Loose (tablets)"**.
- Internally tracked in tablet units for accuracy, but the owner only ever sees plain language like "3 strips + 4 loose tablets left."
- Loose sales draw from an already-opened strip first; a new strip is only opened when no opened one remains.
- Loose (per-tablet) price is typically set higher per unit than the strip price — both set by the owner when adding stock.

## 4. Pricing & Discounts
- Owner sets both cost price and selling price when adding stock.
- Selling price editable anytime — future sales use the new price, past sale records stay locked (for accurate reporting).
- Per-item discount (flat ₹ or %) and whole-bill discount.
- Optional discount reason field (e.g. "expiry clearance," "regular customer") for the owner's own records.
- MRP shown struck-through next to actual selling price (builds customer trust).

## 5. Customers & Payments
- Khata (credit book) — simple ledger per regular customer: amount owed, last paid.
- Multiple payment modes tracked per sale: cash / UPI / credit.
- Daily cash-in-hand summary — cash vs UPI vs credit, for end-of-day tallying.
- Prescription medicine flag — visual reminder to ask for a prescription on Rx-only items.
- Symptom-based search — e.g. searching "fever" surfaces relevant in-stock medicines.

## 6. Suppliers & Restocking
- Supplier directory with contact info.
- Purchase order tracking.
- Low-stock alerts with reorder suggestions.
- One-tap "call/WhatsApp supplier" from a low-stock item.
- Seasonal restock hints based on past sales patterns (e.g. cold/fever meds before monsoon).
- Substitute suggester — if a medicine is out of stock, suggests an in-stock equivalent.

## 7. Reports & Notifications
- WhatsApp/SMS alerts for medicines nearing expiry.
- Daily WhatsApp summary — expiring items this week, low stock, yesterday's sales total.
- Month-end auto report — profit, top sellers, expiry losses — sent via WhatsApp on the 1st.
- Reports exportable to Excel/PDF: sales, dead stock, expiry losses.
- Full sale/edit history log — who changed what, when (protects owner in disputes).

## 8. Reliability & Security
- Offline-first (PWA) — sale completes and saves locally instantly, syncs when back online.
- No hard crashes on bad scans — failed scan just says "try again," cart stays intact.
- PIN or fingerprint lock on open + auto-lock after inactivity.
- Data encrypted at rest and in transit.
- Automatic daily backup to cloud.

## 9. Language & Accessibility
- Hindi/Marathi UI toggle alongside English.
- Short one-time walkthrough on first open (max 5 screens) covering the 3 daily actions: sell, add stock, check expiries.

---

# Business Rules & Edge Cases

These are the precise behaviors the app must get right — mostly around stock accuracy and counter-side reliability.

## Stock Accuracy
- All quantities are tracked in the smallest sellable unit (tablet-level) internally, even for medicines sold only as whole strips — this is what keeps loose-sale math correct.
- The owner-facing display never shows raw "tablet unit" counts for strip-only medicines — only for loose-eligible ones, and even then in friendly terms ("3 strips + 4 loose").
- Opening a strip for a loose sale flags it as "opened" — opened strips are drawn from first before a new one is opened, and are tracked separately since they may degrade faster.
- Only medicines explicitly marked "loose-eligible" show the loose-sale option; this is a per-medicine setting, not global (most medicines — syrups, ointments, injections — cannot be split).

## Selling & Returns
- Default transaction mode is always **Sell**. Return mode is a manual, clearly-visible toggle — never the default — and automatically reverts to Sell mode after each return to avoid accidental misuse.
- A completed sale locks in the selling price used at that moment, even if the price is changed later — historical sales must never retroactively change.
- Receipts are opt-in per transaction, not automatic, so small/quick purchases aren't slowed down.
- Damaged/expired write-offs are a distinct action from customer returns and must not be mixed in the same log — they affect inventory differently (no refund, no customer record).

## Editing & Data Integrity
- Every field (price, quantity, expiry, batch, supplier) must remain editable after entry — mistakes at a counter are expected and should be a one-tap fix, not a locked record.
- All edits and sales are logged with who/what/when for dispute protection, even though there's currently only one user (future-proofing + trust).

## Reliability Requirements
- The app must never block or crash mid-sale — a customer standing at the counter is the worst-case moment for an error.
- Failed barcode/QR scans must fail gracefully (retry prompt) without losing the current cart.
- Offline sales must complete and save locally, syncing automatically once back online — internet dependency is not acceptable for a live sale.
- Cart state must persist automatically in case the app is accidentally closed mid-transaction.

## Security Requirements
- App must be protected by PIN or biometric lock, with auto-lock after inactivity (shop counter = semi-public device).
- All data must be encrypted at rest and in transit, with automatic daily backups.

---

# Security Specification

## Access Control
- **App lock:** PIN (4-6 digit) or biometric (fingerprint/face, where device supports it) required to open the app.
- **Auto-lock:** App locks itself after a short period of inactivity (e.g. 2-5 minutes), configurable by the owner.
- **No multi-user accounts in v1** — single owner login, so no role/permission complexity needed yet. Built so a staff-login layer can be added later without a rebuild.

## Data Protection
- **Encryption in transit:** All data sent between the app and server uses HTTPS/TLS — no exceptions, including on local wifi.
- **Encryption at rest:** Database and backups encrypted, so a compromised server or stolen backup file isn't readable.
- **No sensitive data in plain text:** Even locally cached offline data (for offline-first mode) is stored encrypted on the device, not as a plain readable file.

## Backup & Recovery
- **Automatic daily backup** to cloud storage — no manual step required from the owner.
- **Point-in-time recovery** — ability to restore inventory/sales data to an earlier day if something gets corrupted or accidentally wiped.
- A lost, stolen, or broken phone/device should never mean lost business data.

## Audit Trail
- Every sale, stock edit, price change, and write-off is logged with **what changed, the old and new values, and when** — even with a single user, this protects the owner in disputes (e.g. a customer claiming they were overcharged) and creates a record if a second user is ever added.
- Audit log is view-only — cannot be edited or deleted, even by the owner, to preserve its integrity.

## Operational Safety
- **Return mode auto-reverts to Sell mode** after each use — prevents an entire day of sales being accidentally logged as returns.
- **Historical sales are immutable** — once a sale is completed, its recorded price and items cannot be changed, even if the medicine's price changes later. Corrections happen via a separate adjustment entry, never by editing history.
- **Confirmation on destructive actions only** — deleting a medicine record or clearing data asks for confirmation; everyday actions (editing price, quantity) do not, to keep the counter experience fast.

## Future-Proofing (not needed for v1, but designed for)
- Architecture should allow adding staff logins with restricted permissions (e.g. "can sell, cannot edit prices") without a redesign.
- Should allow adding a second shop/branch later without restructuring the data model.

---

# Data Model

Plain-language definition of the core records the app needs. (Exact database schema/types can be finalized when coding begins — this defines what each record must hold.)

## Medicine (Inventory Item)
- Name (and generic/salt name, for symptom-based search)
- Category (tablet, syrup, injection, ointment, etc.)
- Loose-eligible? (yes/no — only relevant for tablets/capsules)
- Prescription-required? (yes/no)
- Barcode/QR code value
- Cost price (per strip/box)
- Selling price (per strip/box)
- Loose selling price (per tablet, only if loose-eligible)
- Emergency/critical stock flag (yes/no — excludes from auto-discount suggestions)
- Supplier (linked record)

## Batch
A medicine can have multiple batches in stock at once (different expiry dates/purchase dates).
- Linked medicine
- Batch number
- Expiry date
- Quantity in stock (tracked in smallest sellable unit — tablets — even for strip-only medicines)
- Opened? (yes/no — for loose-eligible medicines, tracks whether this batch has a strip already broken)
- Date received

## Sale (Transaction)
- Date/time
- Items sold — each line: medicine, batch used, quantity, sell type (strip or loose), price charged at time of sale
- Discount applied (flat ₹ or %, plus optional reason)
- Payment mode (cash / UPI / credit)
- Customer (linked, optional — only needed for credit/khata sales)
- Receipt generated? (yes/no)
- Total amount

## Return
- Linked original sale (if available) or standalone
- Items returned, quantity
- Reason (optional)
- Date/time

## Write-off (Damaged/Expired Stock)
- Linked medicine + batch
- Quantity
- Reason (damaged / expired / other)
- Date/time
- Distinct from Returns — no customer or refund involved

## Supplier
- Name, contact number (for one-tap call/WhatsApp)
- Linked medicines supplied
- Return window policy (e.g. "accepts returns up to 3 months before expiry") — powers the near-expiry return reminders

## Customer (Khata/Credit)
- Name, contact number
- Running balance owed
- Payment history (date, amount paid)

## Audit Log Entry
- Linked record type + ID (which sale/medicine/batch was affected)
- Field changed, old value, new value
- Date/time
- (Single-user in v1, but structure supports adding "changed by" once staff logins exist)

---

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

---

# Screen-by-Screen Flow

Maps every feature to an actual screen, following the "one clear action per screen" rule.

## 1. Lock Screen
- PIN/biometric entry. Nothing else visible until unlocked.

## 2. Home Dashboard
The only screen the owner needs for 90% of their day. Shows, at a glance:
- **Sell** (big, primary button — opens scan-to-sell)
- **Add Stock** (second button)
- **Today's Expiries** (small card: "3 medicines expiring this week")
- **Low Stock** (small card: "2 items running low")
- **Yesterday's Sales Total** (small card)
- Small icon-only nav for: Reports, Customers (Khata), Suppliers, Settings

## 3. Sell Screen (Scan-to-Sell)
- Mode indicator at top: **Sell** (default, green) / **Return** (toggle, turns red when active)
- Scan area (camera) or manual search bar as fallback
- Quick-sell shortcuts (top 10 items) shown below scan area
- As items are scanned: running cart list appears, each line shows medicine, qty, price, editable inline
- If a loose-eligible medicine is scanned: prompt "Sell Strip / Sell Loose (tablets)"
- Discount button (per item or whole bill) available on this screen
- Payment mode selector (Cash / UPI / Credit) before completing
- "Complete Sale" → then "Done" or "Print/Share Receipt"
- Failed scan → inline "Try again" message, cart untouched

## 4. Add/Edit Stock Screen
- Search existing medicine or "New Medicine"
- Fields: name, category, cost price, selling price, loose-eligible toggle (+ loose price if yes), prescription flag, batch number, expiry date, quantity, supplier
- Barcode/QR scan option to auto-fill if code already exists
- Voice-add option
- Every field editable later from the same screen (search medicine → edit)

## 5. Expiry Dashboard
- Color-coded list: red (<30 days) / orange (<90 days) / green (safe)
- Calendar heatmap view toggle
- Tap an item → suggested action: "Suggest discount," "Check return window," "Write off"

## 6. Reports
- Simple tabs: Sales, Expiry Losses, Dead Stock, Top Sellers
- Date range selector
- Export to Excel/PDF button

## 7. Customers (Khata)
- List of customers with outstanding balance
- Tap a customer → payment history, "Record Payment" button

## 8. Suppliers
- List with contact info
- Tap → linked medicines, return window policy, one-tap call/WhatsApp

## 9. Settings
- Language toggle (English/Hindi/Marathi)
- Auto-lock timer
- Backup status ("Last backup: today, 3:00 AM")
- Re-run first-time walkthrough

## First-Time Walkthrough (max 5 screens)
1. Welcome + what this app does in one line
2. How to sell (scan → complete)
3. How to add stock
4. Where to check expiries
5. "You're ready" — lands on Home Dashboard

---

# Build Roadmap

Owner wants everything in v1 — this doesn't change scope, just gives a sane build order so nothing breaks along the way.

## Phase 1 — Foundation
- Data model set up (Medicine, Batch, Sale, Supplier, Customer)
- Auth/lock screen (PIN/biometric)
- Home Dashboard shell

## Phase 2 — Core Selling Flow
- Add/Edit Stock screen
- Barcode/QR scan-to-sell (Sell mode only first)
- Cart, discounts, payment modes, "Complete Sale"
- Loose/strip logic for loose-eligible medicines

## Phase 3 — Expiry & Stock Intelligence
- Expiry dashboard (color-coded + calendar heatmap)
- Low-stock alerts
- Predictive expiry risk
- Write-off flow

## Phase 4 — Returns, Reports, Customers
- Return mode toggle
- Reports (sales, dead stock, expiry losses) + export
- Khata/credit customer tracking
- Supplier directory + return-window tracking

## Phase 5 — Automation & Polish
- WhatsApp daily summary + expiry alerts
- Month-end auto report
- Voice-add, symptom search, combo bundling, quick-sell shortcuts
- Hindi/Marathi toggle
- First-time walkthrough

## Phase 6 — Reliability Hardening
- Offline-first sync testing
- Auto-backup + recovery testing
- Audit log verification
- Real-world testing at the actual shop counter with the owner

## Note
Phases 1-2 alone already make the app usable for daily selling and stock entry — everything else layers on top without needing a rebuild.
