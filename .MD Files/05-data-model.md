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
