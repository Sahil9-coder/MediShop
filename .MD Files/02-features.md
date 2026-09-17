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
