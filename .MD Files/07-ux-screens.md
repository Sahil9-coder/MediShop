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
