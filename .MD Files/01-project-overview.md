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
