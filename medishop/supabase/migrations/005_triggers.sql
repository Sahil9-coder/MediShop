-- ============================================================
-- 005_triggers.sql
-- Database triggers for the Medical Shop App
-- ============================================================

-- ───────────────────────────────────────────
-- HELPER: updated_at auto-stamp
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all mutable tables
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_medicines_updated_at
  BEFORE UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_batches_updated_at
  BEFORE UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ───────────────────────────────────────────
-- AUDIT LOG TRIGGER — medicines
-- Logs changes to key fields: name, cost_price, selling_price, loose_price,
-- quantity fields (via batch), barcode, supplier_id, is_active
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_medicines()
RETURNS TRIGGER AS $$
DECLARE
  col TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['name','generic_name','cost_price','selling_price',
    'loose_price','tablets_per_strip','loose_eligible','rx_required','barcode',
    'reorder_level','is_critical','is_active','supplier_id'] LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col, col)
      INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO audit_log (record_type, record_id, field_name, old_value, new_value)
      VALUES ('medicine', NEW.id, col, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_medicines
  AFTER UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION audit_medicines();

-- ───────────────────────────────────────────
-- AUDIT LOG TRIGGER — batches
-- Logs quantity changes (stock edits) and expiry date edits
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_batches()
RETURNS TRIGGER AS $$
DECLARE
  col TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['quantity_tablets','opened_strips','expiry_date',
    'batch_number','is_active'] LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col, col)
      INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO audit_log (record_type, record_id, field_name, old_value, new_value)
      VALUES ('batch', NEW.id, col, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_batches
  AFTER UPDATE ON batches
  FOR EACH ROW EXECUTE FUNCTION audit_batches();

-- ───────────────────────────────────────────
-- CUSTOMER BALANCE TRIGGER
-- Auto-updates customers.balance_owed when a payment is recorded
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_customer_balance_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Subtract the payment amount from the customer's balance
  UPDATE customers
  SET balance_owed = GREATEST(0, balance_owed - NEW.amount)
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_customer_payment_balance
  AFTER INSERT ON customer_payments
  FOR EACH ROW EXECUTE FUNCTION update_customer_balance_on_payment();

-- ───────────────────────────────────────────
-- CUSTOMER BALANCE TRIGGER — on credit sale (INSERT)
-- Sales are inserted directly as is_completed=true, so we need an INSERT trigger.
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_customer_balance_on_sale_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = true AND NEW.payment_mode = 'credit' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET balance_owed = balance_owed + NEW.total_amount
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sale_credit_balance_insert
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION update_customer_balance_on_sale_insert();

-- Also keep an UPDATE trigger for any future draft → complete flow
CREATE OR REPLACE FUNCTION update_customer_balance_on_sale_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = true AND OLD.is_completed = false
     AND NEW.payment_mode = 'credit' AND NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET balance_owed = balance_owed + NEW.total_amount
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sale_credit_balance_update
  AFTER UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_customer_balance_on_sale_update();

-- ───────────────────────────────────────────
-- BLOCK EDITS ON COMPLETED SALES (immutability enforcement)
-- Spec: completed sales must be immutable
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_completed_sale_edit()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_completed = true THEN
    RAISE EXCEPTION 'Completed sales cannot be edited. Create an adjustment entry instead.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_immutable_sales
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION prevent_completed_sale_edit();

-- ───────────────────────────────────────────
-- BLOCK DELETES ON AUDIT LOG (integrity enforcement)
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries cannot be deleted.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

-- ───────────────────────────────────────────
-- AUDIT LOG TRIGGER — customers
-- Logs balance and name changes
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_customers()
RETURNS TRIGGER AS $$
DECLARE
  col TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['name','phone','balance_owed','notes'] LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col, col)
      INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO audit_log (record_type, record_id, field_name, old_value, new_value)
      VALUES ('customer', NEW.id, col, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_customers
  AFTER UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_customers();

-- ───────────────────────────────────────────
-- AUDIT LOG TRIGGER — suppliers
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION audit_suppliers()
RETURNS TRIGGER AS $$
DECLARE
  col TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY['name','phone','return_window_days','notes'] LOOP
    EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', col, col)
      INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO audit_log (record_type, record_id, field_name, old_value, new_value)
      VALUES ('supplier', NEW.id, col, old_val, new_val);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_suppliers
  AFTER UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION audit_suppliers();
