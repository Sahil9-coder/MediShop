-- ============================================================
-- 002_tables.sql
-- Core tables for the Medical Shop App
-- Run after 001_enums.sql
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ───────────────────────────────────────────
-- SUPPLIERS
-- ───────────────────────────────────────────
CREATE TABLE suppliers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  phone                 TEXT,                          -- for one-tap call/WhatsApp
  return_window_days    INT DEFAULT 90,                -- days before expiry supplier accepts returns
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- MEDICINES (Inventory Master)
-- ───────────────────────────────────────────
CREATE TABLE medicines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  generic_name          TEXT,                          -- salt/generic name for symptom search
  category              medicine_category NOT NULL DEFAULT 'tablet',
  loose_eligible        BOOLEAN NOT NULL DEFAULT false, -- can be sold per-tablet
  tablets_per_strip     INT NOT NULL DEFAULT 10,       -- for strip↔tablet unit conversion
  rx_required           BOOLEAN NOT NULL DEFAULT false, -- prescription required
  barcode               TEXT UNIQUE,                   -- QR/barcode scan value
  cost_price            NUMERIC(10,2) NOT NULL DEFAULT 0,  -- per strip/box
  selling_price         NUMERIC(10,2) NOT NULL DEFAULT 0,  -- per strip/box
  loose_price           NUMERIC(10,2),                 -- per tablet (only if loose_eligible)
  reorder_level         INT NOT NULL DEFAULT 10,       -- in tablet units; triggers low-stock alert
  is_critical           BOOLEAN NOT NULL DEFAULT false, -- never auto-flagged for discount (e.g. insulin)
  supplier_id           UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  symptoms              TEXT[],                        -- array of symptom keywords for symptom search
  is_active             BOOLEAN NOT NULL DEFAULT true, -- soft delete
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- BATCHES
-- Each medicine can have multiple batches (different expiry/purchase dates)
-- ───────────────────────────────────────────
CREATE TABLE batches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id           UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  batch_number          TEXT NOT NULL,
  expiry_date           DATE NOT NULL,
  -- Quantity stored in TABLET UNITS internally even for strip-only medicines.
  -- For strip-only: quantity_tablets = strips * tablets_per_strip
  -- For loose-eligible: tracks exact tablets remaining
  quantity_tablets      INT NOT NULL DEFAULT 0 CHECK (quantity_tablets >= 0),
  -- opened_strips: how many strips have been broken open for loose sales.
  -- An open strip is drawn from first before opening a new one.
  opened_strips         INT NOT NULL DEFAULT 0 CHECK (opened_strips >= 0),
  date_received         DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT batch_medicine_unique UNIQUE (medicine_id, batch_number)
);

-- ───────────────────────────────────────────
-- CUSTOMERS (Khata/Credit Book)
-- ───────────────────────────────────────────
CREATE TABLE customers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  phone                 TEXT,
  balance_owed          NUMERIC(10,2) NOT NULL DEFAULT 0, -- running credit balance
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- CUSTOMER PAYMENTS
-- History of payments received from credit customers
-- ───────────────────────────────────────────
CREATE TABLE customer_payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount                NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  notes                 TEXT,
  paid_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- SALES (Transactions)
-- ───────────────────────────────────────────
CREATE TABLE sales (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Subtotal before discount
  subtotal              NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Discount: either flat rupee amount OR percentage (not both)
  discount_flat         NUMERIC(10,2),
  discount_pct          NUMERIC(5,2),
  discount_reason       TEXT,
  -- Final total after discount
  total_amount          NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_mode          payment_mode NOT NULL DEFAULT 'cash',
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  receipt_generated     BOOLEAN NOT NULL DEFAULT false,
  -- Completed sales are immutable — this flag marks them as done
  is_completed          BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at — completed sales are NEVER edited (spec: historical sales immutable)
);

-- ───────────────────────────────────────────
-- SALE ITEMS
-- Each line item in a sale. Price is snapshotted at sale time — immutable.
-- ───────────────────────────────────────────
CREATE TABLE sale_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id               UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  medicine_id           UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  batch_id              UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  -- Quantity in tablet units (even for strip sales)
  quantity_tablets      INT NOT NULL CHECK (quantity_tablets > 0),
  sell_type             sell_type NOT NULL DEFAULT 'strip',
  -- SNAPSHOT of price at time of sale — never changes even if medicine price changes later
  price_at_sale         NUMERIC(10,2) NOT NULL,
  -- Computed line total (price * qty / tablets_per_strip for strips, or price * qty for loose)
  line_total            NUMERIC(10,2) NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- RETURNS
-- Completely separate from write-offs. Can be linked to original sale or standalone.
-- ───────────────────────────────────────────
CREATE TABLE returns (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id               UUID REFERENCES sales(id) ON DELETE SET NULL, -- nullable — standalone return
  -- JSONB for simplicity: [{ medicine_id, batch_id, quantity_tablets, sell_type }]
  items                 JSONB NOT NULL DEFAULT '[]',
  reason                TEXT,
  refund_amount         NUMERIC(10,2),
  returned_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- WRITE-OFFS (Damaged / Expired Stock)
-- Distinct from returns — no customer, no refund. Inventory adjustment only.
-- ───────────────────────────────────────────
CREATE TABLE writeoffs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id           UUID NOT NULL REFERENCES medicines(id) ON DELETE RESTRICT,
  batch_id              UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  quantity_tablets      INT NOT NULL CHECK (quantity_tablets > 0),
  reason                writeoff_reason NOT NULL DEFAULT 'expired',
  notes                 TEXT,
  written_off_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ───────────────────────────────────────────
-- AUDIT LOG
-- View-only. Every field change on every tracked table is recorded here.
-- Cannot be deleted or updated — enforced via RLS (no DELETE/UPDATE policy).
-- ───────────────────────────────────────────
CREATE TABLE audit_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type           audit_record_type NOT NULL,
  record_id             UUID NOT NULL,
  field_name            TEXT NOT NULL,
  old_value             TEXT,                          -- stored as text for simplicity
  new_value             TEXT,
  -- NULL in v1 (single owner). Add user ID here when staff logins are added.
  changed_by            UUID,
  changed_at            TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Intentionally no FKs to allow log of deleted records
);

-- ───────────────────────────────────────────
-- APP SETTINGS (Single-row table for owner config)
-- ───────────────────────────────────────────
CREATE TABLE app_settings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- PIN stored as bcrypt hash, not plain text
  pin_hash              TEXT,
  auto_lock_minutes     INT NOT NULL DEFAULT 2,
  language              TEXT NOT NULL DEFAULT 'en', -- 'en', 'hi', 'mr'
  last_backup_at        TIMESTAMPTZ,
  whatsapp_number       TEXT,                         -- for alerts/summaries
  first_run_done        BOOLEAN NOT NULL DEFAULT false,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings row
INSERT INTO app_settings (id) VALUES (gen_random_uuid());
