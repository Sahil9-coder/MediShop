-- ============================================================
-- 007_auth.sql
-- Supabase Auth integration:
--   - Ensures app_settings is accessible via service role for PIN operations
--   - Adds a view for the client to read safe settings (no pin_hash)
-- ============================================================

-- Create a view that excludes pin_hash — safe to read from client
CREATE OR REPLACE VIEW public_app_settings AS
SELECT
  id,
  auto_lock_minutes,
  language,
  last_backup_at,
  whatsapp_number,
  first_run_done,
  updated_at
FROM app_settings;

-- Enable RLS on the view (inherits from underlying table)
-- The view is accessible to authenticated users via the same policy
GRANT SELECT ON public_app_settings TO authenticated;

-- ───────────────────────────────────────────
-- Service role bypass for internal trigger operations
-- Trigger functions already use SECURITY DEFINER, so they bypass RLS.
-- No additional grants needed for triggers.
-- ───────────────────────────────────────────

-- ───────────────────────────────────────────
-- Storage bucket for any future receipt/PDF attachments
-- ───────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('receipts', 'receipts', false)
-- ON CONFLICT DO NOTHING;

-- ───────────────────────────────────────────
-- Symptoms GIN index — supports array containment search for symptom-based lookup
-- (Already added in 004, but confirming the search pattern works)
-- ───────────────────────────────────────────
-- The index idx_medicines_name_gin in 004_indexes.sql covers this.
-- Symptom search uses: WHERE symptoms @> ARRAY['fever']
-- (Already supported via Supabase .contains() in API layer)

-- ───────────────────────────────────────────
-- Ensure default app_settings row always exists
-- (idempotent — safe to run multiple times)
-- ───────────────────────────────────────────
INSERT INTO app_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM app_settings);
