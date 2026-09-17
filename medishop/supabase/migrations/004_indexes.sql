-- ============================================================
-- 004_indexes.sql
-- Performance indexes for the Medical Shop App
-- ============================================================

-- ───────────────────────────────────────────
-- MEDICINES indexes
-- ───────────────────────────────────────────

-- Fast barcode scan lookup (the most frequent query at the counter)
CREATE INDEX idx_medicines_barcode ON medicines(barcode) WHERE barcode IS NOT NULL;

-- Active medicines only (soft delete)
CREATE INDEX idx_medicines_active ON medicines(is_active) WHERE is_active = true;

-- Supplier lookup
CREATE INDEX idx_medicines_supplier ON medicines(supplier_id);

-- Full-text search on name + generic_name for symptom search
CREATE INDEX idx_medicines_name_gin ON medicines USING gin(to_tsvector('english', name || ' ' || COALESCE(generic_name, '')));

-- ───────────────────────────────────────────
-- BATCHES indexes
-- ───────────────────────────────────────────

-- Most important: expiry date for the expiry dashboard (heavily queried)
CREATE INDEX idx_batches_expiry ON batches(expiry_date);

-- Lookup all batches for a medicine (FIFO sell-first needs ordering by expiry_date)
CREATE INDEX idx_batches_medicine_expiry ON batches(medicine_id, expiry_date ASC);

-- Active batches only
CREATE INDEX idx_batches_active ON batches(is_active) WHERE is_active = true;

-- Low stock alert: quantity below threshold (partial index — only non-zero batches)
CREATE INDEX idx_batches_quantity ON batches(medicine_id, quantity_tablets) WHERE quantity_tablets > 0;

-- ───────────────────────────────────────────
-- SALES indexes
-- ───────────────────────────────────────────

-- Reports query by date range — most common report access pattern
CREATE INDEX idx_sales_created_at ON sales(created_at DESC);

-- Completed vs draft sales
CREATE INDEX idx_sales_completed ON sales(is_completed, created_at DESC);

-- Customer credit sales
CREATE INDEX idx_sales_customer ON sales(customer_id) WHERE customer_id IS NOT NULL;

-- ───────────────────────────────────────────
-- SALE ITEMS indexes
-- ───────────────────────────────────────────

-- Lookup all items in a sale
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- Find all sales containing a specific medicine (for "top sellers" report)
CREATE INDEX idx_sale_items_medicine ON sale_items(medicine_id, created_at DESC);

-- ───────────────────────────────────────────
-- CUSTOMER PAYMENTS indexes
-- ───────────────────────────────────────────

CREATE INDEX idx_customer_payments_customer ON customer_payments(customer_id, paid_at DESC);

-- ───────────────────────────────────────────
-- AUDIT LOG indexes
-- ───────────────────────────────────────────

-- Look up all changes to a specific record
CREATE INDEX idx_audit_log_record ON audit_log(record_type, record_id, changed_at DESC);

-- ───────────────────────────────────────────
-- WRITEOFFS indexes
-- ───────────────────────────────────────────

CREATE INDEX idx_writeoffs_medicine ON writeoffs(medicine_id, written_off_at DESC);
CREATE INDEX idx_writeoffs_batch ON writeoffs(batch_id);
