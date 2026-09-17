-- ============================================================
-- 006_functions.sql
-- Postgres helper functions for the Medical Shop App
-- ============================================================

-- ───────────────────────────────────────────
-- get_expiry_status(expiry_date DATE) -> TEXT
-- Returns 'red' (<30 days), 'orange' (<90 days), 'green' (safe), 'expired'
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_expiry_status(expiry_date DATE)
RETURNS TEXT AS $$
DECLARE
  days_left INT;
BEGIN
  days_left := expiry_date - CURRENT_DATE;
  IF days_left < 0 THEN
    RETURN 'expired';
  ELSIF days_left < 30 THEN
    RETURN 'red';
  ELSIF days_left < 90 THEN
    RETURN 'orange';
  ELSE
    RETURN 'green';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ───────────────────────────────────────────
-- get_stock_display(p_medicine_id UUID) -> TEXT
-- Returns owner-friendly stock string, e.g.:
--   For loose-eligible: "3 strips + 4 loose tablets"
--   For strip-only:     "15 strips"
--   For zero stock:     "Out of stock"
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_stock_display(p_medicine_id UUID)
RETURNS TEXT AS $$
DECLARE
  med               RECORD;
  total_tablets     INT;
  full_strips       INT;
  loose_tablets     INT;
BEGIN
  -- Get medicine details
  SELECT tablets_per_strip, loose_eligible
  INTO med
  FROM medicines
  WHERE id = p_medicine_id;

  -- Sum all active batch quantities
  SELECT COALESCE(SUM(quantity_tablets), 0)
  INTO total_tablets
  FROM batches
  WHERE medicine_id = p_medicine_id AND is_active = true AND quantity_tablets > 0;

  IF total_tablets = 0 THEN
    RETURN 'Out of stock';
  END IF;

  IF med.loose_eligible THEN
    full_strips    := total_tablets / med.tablets_per_strip;
    loose_tablets  := total_tablets % med.tablets_per_strip;

    IF full_strips > 0 AND loose_tablets > 0 THEN
      RETURN full_strips || ' strip' || (CASE WHEN full_strips > 1 THEN 's' ELSE '' END)
        || ' + ' || loose_tablets || ' loose tablet' || (CASE WHEN loose_tablets > 1 THEN 's' ELSE '' END);
    ELSIF full_strips > 0 THEN
      RETURN full_strips || ' strip' || (CASE WHEN full_strips > 1 THEN 's' ELSE '' END);
    ELSE
      RETURN loose_tablets || ' loose tablet' || (CASE WHEN loose_tablets > 1 THEN 's' ELSE '' END);
    END IF;
  ELSE
    full_strips := total_tablets / med.tablets_per_strip;
    IF full_strips = 0 THEN
      RETURN 'Less than 1 strip';
    END IF;
    RETURN full_strips || ' strip' || (CASE WHEN full_strips > 1 THEN 's' ELSE '' END);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_low_stock_items() -> TABLE
-- Returns medicines where total stock (in tablets) is below reorder_level
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE (
  medicine_id   UUID,
  name          TEXT,
  total_tablets INT,
  reorder_level INT,
  stock_display TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.name,
    COALESCE(SUM(b.quantity_tablets)::INT, 0)    AS total_tablets,
    m.reorder_level,
    get_stock_display(m.id)                       AS stock_display
  FROM medicines m
  LEFT JOIN batches b ON b.medicine_id = m.id
    AND b.is_active = true
    AND b.quantity_tablets > 0
  WHERE m.is_active = true
  GROUP BY m.id, m.name, m.reorder_level
  HAVING COALESCE(SUM(b.quantity_tablets)::INT, 0) <= m.reorder_level
  ORDER BY total_tablets ASC;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_expiring_batches(p_days INT) -> TABLE
-- Returns batches expiring within p_days days, with expiry status
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_expiring_batches(p_days INT DEFAULT 90)
RETURNS TABLE (
  batch_id        UUID,
  medicine_id     UUID,
  medicine_name   TEXT,
  batch_number    TEXT,
  expiry_date     DATE,
  days_left       INT,
  status          TEXT,
  quantity_tablets INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    m.id,
    m.name,
    b.batch_number,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE)::INT  AS days_left,
    get_expiry_status(b.expiry_date)     AS status,
    b.quantity_tablets
  FROM batches b
  JOIN medicines m ON m.id = b.medicine_id
  WHERE b.is_active = true
    AND b.quantity_tablets > 0
    AND b.expiry_date <= CURRENT_DATE + p_days
  ORDER BY b.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_fifo_batch(p_medicine_id UUID) -> UUID
-- Returns the batch_id that should be sold first (FIFO — earliest expiry with stock)
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_fifo_batch(p_medicine_id UUID)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
BEGIN
  SELECT b.id
  INTO v_batch_id
  FROM batches b
  WHERE b.medicine_id = p_medicine_id
    AND b.is_active = true
    AND b.quantity_tablets > 0
  ORDER BY b.expiry_date ASC
  LIMIT 1;

  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_dashboard_summary() -> JSON
-- Returns all data needed for the Home Dashboard in one query
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    -- Yesterday's total sales
    'yesterday_total',
    (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM sales
      WHERE is_completed = true
        AND created_at::DATE = CURRENT_DATE - 1
    ),
    -- Today's total sales
    'today_total',
    (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM sales
      WHERE is_completed = true
        AND created_at::DATE = CURRENT_DATE
    ),
    -- Medicines expiring within 7 days (red alert)
    'expiring_this_week',
    (
      SELECT COUNT(*)
      FROM batches b
      WHERE b.is_active = true
        AND b.quantity_tablets > 0
        AND b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
    ),
    -- Medicines expiring within 30 days
    'expiring_this_month',
    (
      SELECT COUNT(*)
      FROM batches b
      WHERE b.is_active = true
        AND b.quantity_tablets > 0
        AND b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
    ),
    -- Low stock count
    'low_stock_count',
    (
      SELECT COUNT(*) FROM get_low_stock_items()
    ),
    -- Total credit owed across all customers
    'total_credit_owed',
    (
      SELECT COALESCE(SUM(balance_owed), 0) FROM customers
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_sales_report(p_from DATE, p_to DATE) -> JSON
-- Returns sales totals broken down by payment mode for a date range
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_sales_report(p_from DATE DEFAULT CURRENT_DATE - 30, p_to DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_sales',     COALESCE(SUM(total_amount), 0),
    'total_cash',      COALESCE(SUM(CASE WHEN payment_mode = 'cash'   THEN total_amount END), 0),
    'total_upi',       COALESCE(SUM(CASE WHEN payment_mode = 'upi'    THEN total_amount END), 0),
    'total_credit',    COALESCE(SUM(CASE WHEN payment_mode = 'credit' THEN total_amount END), 0),
    -- Discount: each sale has either discount_flat OR discount_pct, never both
    'total_discount',  COALESCE(
      SUM(
        CASE
          WHEN discount_flat IS NOT NULL THEN discount_flat
          WHEN discount_pct  IS NOT NULL THEN ROUND(subtotal * discount_pct / 100, 2)
          ELSE 0
        END
      ), 0
    ),
    'transaction_count', COUNT(*),
    'date_from',       p_from,
    'date_to',         p_to
  ) INTO result
  FROM sales
  WHERE is_completed = true
    AND created_at::DATE BETWEEN p_from AND p_to;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_top_sellers(p_from DATE, p_to DATE, p_limit INT) -> TABLE
-- Returns top-selling medicines by quantity in a date range
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_top_sellers(
  p_from  DATE DEFAULT CURRENT_DATE - 30,
  p_to    DATE DEFAULT CURRENT_DATE,
  p_limit INT  DEFAULT 10
)
RETURNS TABLE (
  medicine_id     UUID,
  medicine_name   TEXT,
  total_tablets   BIGINT,
  total_revenue   NUMERIC,
  sale_count      BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    si.medicine_id,
    m.name,
    SUM(si.quantity_tablets)  AS total_tablets,
    SUM(si.line_total)        AS total_revenue,
    COUNT(DISTINCT si.sale_id) AS sale_count
  FROM sale_items si
  JOIN medicines m ON m.id = si.medicine_id
  JOIN sales s ON s.id = si.sale_id
  WHERE s.is_completed = true
    AND s.created_at::DATE BETWEEN p_from AND p_to
  GROUP BY si.medicine_id, m.name
  ORDER BY total_tablets DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_expiry_losses(p_from DATE, p_to DATE) -> TABLE
-- Returns write-offs in a date range (for expiry loss report)
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_expiry_losses(
  p_from DATE DEFAULT CURRENT_DATE - 30,
  p_to   DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  writeoff_id       UUID,
  medicine_name     TEXT,
  batch_number      TEXT,
  quantity_tablets  INT,
  reason            TEXT,
  estimated_loss    NUMERIC,
  written_off_at    TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    m.name,
    b.batch_number,
    w.quantity_tablets,
    w.reason::TEXT,
    -- Estimated loss = quantity in strips * cost_price
    ROUND((w.quantity_tablets::NUMERIC / m.tablets_per_strip) * m.cost_price, 2) AS estimated_loss,
    w.written_off_at
  FROM writeoffs w
  JOIN medicines m ON m.id = w.medicine_id
  JOIN batches   b ON b.id = w.batch_id
  WHERE w.written_off_at::DATE BETWEEN p_from AND p_to
  ORDER BY w.written_off_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_dead_stock() -> TABLE
-- Returns medicines that have stock but no sales in the past 90 days
-- (Slow-moving / dead stock — likely to expire unsold)
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dead_stock()
RETURNS TABLE (
  medicine_id     UUID,
  medicine_name   TEXT,
  total_tablets   INT,
  stock_display   TEXT,
  earliest_expiry DATE,
  days_until_expiry INT,
  last_sold_at    TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.name,
    COALESCE(SUM(b.quantity_tablets)::INT, 0)  AS total_tablets,
    get_stock_display(m.id)                     AS stock_display,
    MIN(b.expiry_date)                          AS earliest_expiry,
    (MIN(b.expiry_date) - CURRENT_DATE)::INT    AS days_until_expiry,
    MAX(s.created_at)                           AS last_sold_at
  FROM medicines m
  JOIN batches b ON b.medicine_id = m.id AND b.is_active = true AND b.quantity_tablets > 0
  LEFT JOIN sale_items si ON si.medicine_id = m.id
  LEFT JOIN sales s ON s.id = si.sale_id AND s.is_completed = true
    AND s.created_at >= NOW() - INTERVAL '90 days'
  WHERE m.is_active = true
  GROUP BY m.id, m.name
  HAVING (
    -- No sales in last 90 days
    MAX(s.created_at) IS NULL
    OR MAX(s.created_at) < NOW() - INTERVAL '90 days'
  )
    -- Has stock left
    AND COALESCE(SUM(b.quantity_tablets)::INT, 0) > 0
  ORDER BY earliest_expiry ASC;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_daily_cash_summary(p_date DATE) -> JSON
-- Returns cash/UPI/credit breakdown for a given day (end-of-day tally)
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_daily_cash_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'date',            p_date,
    'cash_total',      COALESCE(SUM(CASE WHEN payment_mode = 'cash'   THEN total_amount END), 0),
    'upi_total',       COALESCE(SUM(CASE WHEN payment_mode = 'upi'    THEN total_amount END), 0),
    'credit_total',    COALESCE(SUM(CASE WHEN payment_mode = 'credit' THEN total_amount END), 0),
    'grand_total',     COALESCE(SUM(total_amount), 0),
    'transaction_count', COUNT(*)
  ) INTO result
  FROM sales
  WHERE is_completed = true
    AND created_at::DATE = p_date;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_near_expiry_return_reminders() -> TABLE
-- Returns batches that are within the supplier's return window
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_near_expiry_return_reminders()
RETURNS TABLE (
  batch_id          UUID,
  medicine_name     TEXT,
  batch_number      TEXT,
  expiry_date       DATE,
  days_left         INT,
  supplier_name     TEXT,
  supplier_phone    TEXT,
  return_window_days INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    m.name,
    b.batch_number,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE)::INT  AS days_left,
    s.name,
    s.phone,
    s.return_window_days
  FROM batches b
  JOIN medicines m ON m.id = b.medicine_id
  JOIN suppliers s ON s.id = m.supplier_id
  WHERE b.is_active = true
    AND b.quantity_tablets > 0
    -- Within return window: expiry is within return_window_days
    AND (b.expiry_date - CURRENT_DATE) <= s.return_window_days
    AND b.expiry_date >= CURRENT_DATE  -- not yet expired
  ORDER BY b.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_predictive_expiry_risk() -> TABLE
-- Spec: "Predictive expiry risk — flags slow-moving stock likely to expire unsold
--        (based on sales pace)"
-- Logic: average daily sales rate vs. days until expiry vs. current stock.
-- If stock / daily_rate > days_left, the batch is at risk.
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_predictive_expiry_risk()
RETURNS TABLE (
  medicine_id       UUID,
  medicine_name     TEXT,
  batch_id          UUID,
  batch_number      TEXT,
  expiry_date       DATE,
  days_left         INT,
  quantity_tablets  INT,
  stock_display     TEXT,
  daily_sales_rate  NUMERIC,
  days_to_sell_out  NUMERIC,
  risk_level        TEXT   -- 'high', 'medium', 'low'
) AS $$
BEGIN
  RETURN QUERY
  WITH batch_sales AS (
    -- Average daily tablets sold per medicine over last 90 days
    SELECT
      si.medicine_id,
      COALESCE(SUM(si.quantity_tablets)::NUMERIC / 90, 0) AS daily_rate
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.is_completed = true
      AND s.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY si.medicine_id
  )
  SELECT
    m.id,
    m.name,
    b.id,
    b.batch_number,
    b.expiry_date,
    (b.expiry_date - CURRENT_DATE)::INT                    AS days_left,
    b.quantity_tablets,
    get_stock_display(m.id)                                AS stock_display,
    COALESCE(bs.daily_rate, 0)                             AS daily_sales_rate,
    CASE
      WHEN COALESCE(bs.daily_rate, 0) = 0
        THEN 999  -- never sold = infinite days to sell (worst risk)
      ELSE ROUND(b.quantity_tablets::NUMERIC / bs.daily_rate, 1)
    END                                                    AS days_to_sell_out,
    CASE
      WHEN COALESCE(bs.daily_rate, 0) = 0 AND (b.expiry_date - CURRENT_DATE) < 90
        THEN 'high'   -- never sold, expiring within 90 days
      WHEN COALESCE(bs.daily_rate, 0) > 0
           AND (b.quantity_tablets::NUMERIC / bs.daily_rate) > (b.expiry_date - CURRENT_DATE)
        THEN 'high'   -- won't sell out before expiry
      WHEN COALESCE(bs.daily_rate, 0) > 0
           AND (b.quantity_tablets::NUMERIC / bs.daily_rate) > (b.expiry_date - CURRENT_DATE) * 0.8
        THEN 'medium' -- tight margin
      ELSE 'low'
    END                                                    AS risk_level
  FROM batches b
  JOIN medicines m ON m.id = b.medicine_id
  LEFT JOIN batch_sales bs ON bs.medicine_id = m.id
  WHERE b.is_active = true
    AND b.quantity_tablets > 0
    AND b.expiry_date > CURRENT_DATE
    AND b.expiry_date <= CURRENT_DATE + 180  -- only look at next 6 months
    AND m.is_active = true
    AND m.is_critical = false  -- never flag critical medicines for discount
  ORDER BY
    CASE risk_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    days_left ASC;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────────────────────────
-- get_seasonal_restock_hints(p_month INT) -> TABLE
-- Spec: "Seasonal restock hints based on past sales patterns
--        (e.g. cold/fever meds before monsoon)"
-- Returns top-selling medicines in the same calendar month from prior years.
-- Use this in advance (e.g., May → predict June/July monsoon stock needs).
-- ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_seasonal_restock_hints(p_month INT DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INT)
RETURNS TABLE (
  medicine_id     UUID,
  medicine_name   TEXT,
  category        TEXT,
  avg_monthly_tablets NUMERIC,
  current_stock   INT,
  stock_display   TEXT,
  recommended_reorder NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_sales AS (
    SELECT
      si.medicine_id,
      AVG(si.quantity_tablets) AS avg_tablets
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE s.is_completed = true
      AND EXTRACT(MONTH FROM s.created_at) = p_month
      AND s.created_at < DATE_TRUNC('month', CURRENT_DATE)  -- prior years only
    GROUP BY si.medicine_id
  ),
  current_stock_cte AS (
    SELECT
      medicine_id,
      COALESCE(SUM(quantity_tablets)::INT, 0) AS total
    FROM batches
    WHERE is_active = true AND quantity_tablets > 0
    GROUP BY medicine_id
  )
  SELECT
    m.id,
    m.name,
    m.category::TEXT,
    ROUND(ms.avg_tablets, 0)                             AS avg_monthly_tablets,
    COALESCE(cs.total, 0)                                AS current_stock,
    get_stock_display(m.id)                              AS stock_display,
    -- Recommend ordering 1.2x the historical average minus current stock
    GREATEST(0, ROUND(ms.avg_tablets * 1.2 - COALESCE(cs.total, 0), 0)) AS recommended_reorder
  FROM monthly_sales ms
  JOIN medicines m ON m.id = ms.medicine_id AND m.is_active = true
  LEFT JOIN current_stock_cte cs ON cs.medicine_id = m.id
  WHERE ms.avg_tablets > 0
  ORDER BY ms.avg_tablets DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

