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
