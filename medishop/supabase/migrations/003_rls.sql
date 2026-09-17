-- ============================================================
-- 003_rls.sql
-- Row Level Security policies for the Medical Shop App
-- All tables locked to authenticated users only (owner-only in v1).
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines          ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_payments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns            ENABLE ROW LEVEL SECURITY;
ALTER TABLE writeoffs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings       ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────
-- SUPPLIERS — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "suppliers_all" ON suppliers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────
-- MEDICINES — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "medicines_all" ON medicines
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────
-- BATCHES — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "batches_all" ON batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────
-- CUSTOMERS — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "customers_all" ON customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────
-- CUSTOMER PAYMENTS — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "customer_payments_all" ON customer_payments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────
-- SALES — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "sales_all" ON sales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────
-- SALE ITEMS — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "sale_items_all" ON sale_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────
-- RETURNS — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "returns_all" ON returns
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────
-- WRITEOFFS — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "writeoffs_all" ON writeoffs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────
-- AUDIT LOG — READ ONLY. No update or delete ever allowed.
-- INSERT allowed via trigger (service role) and by authenticated user for manual entries.
-- ───────────────────────────────────────────
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "audit_log_insert" ON audit_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- NOTE: No UPDATE or DELETE policy on audit_log.
-- This means even the authenticated owner cannot alter the audit trail.

-- ───────────────────────────────────────────
-- APP SETTINGS — full CRUD for authenticated users
-- ───────────────────────────────────────────
CREATE POLICY "app_settings_all" ON app_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
