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
