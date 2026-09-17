-- ============================================================
-- 001_enums.sql
-- All custom ENUM types for the Medical Shop App
-- Run this FIRST before any other migrations.
-- ============================================================

-- Medicine category — controls whether loose-eligible toggle is shown in UI
CREATE TYPE medicine_category AS ENUM (
  'tablet',
  'capsule',
  'syrup',
  'injection',
  'ointment',
  'cream',
  'drops',
  'inhaler',
  'patch',
  'powder',
  'other'
);

-- Payment mode per sale
CREATE TYPE payment_mode AS ENUM (
  'cash',
  'upi',
  'credit'
);

-- How a medicine was sold in a sale_item
CREATE TYPE sell_type AS ENUM (
  'strip',   -- whole strip/box sold
  'loose'    -- per-tablet sale (only for loose-eligible medicines)
);

-- Reason for a stock write-off (distinct from customer returns)
CREATE TYPE writeoff_reason AS ENUM (
  'expired',
  'damaged',
  'other'
);

-- Audit log record types — identifies which table an audit entry refers to
CREATE TYPE audit_record_type AS ENUM (
  'medicine',
  'batch',
  'sale',
  'sale_item',
  'return',
  'writeoff',
  'supplier',
  'customer',
  'customer_payment'
);
