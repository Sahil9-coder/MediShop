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
