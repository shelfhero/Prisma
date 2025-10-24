-- Standard Products System for Manual Price Updates
-- This allows admin to upload weekly prices for 10 standard products

-- 1. Create standard products reference table
CREATE TABLE IF NOT EXISTS standard_products (
  id SERIAL PRIMARY KEY,
  position INTEGER UNIQUE NOT NULL CHECK (position BETWEEN 1 AND 10),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT,
  unit TEXT, -- "1л", "500г", "10бр", "1кг"
  keywords TEXT[], -- For matching with user receipt items
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 10 standard products
INSERT INTO standard_products (position, name, description, icon, category, unit, keywords) VALUES
(1, 'Мляко прясно 3.6%', 'Мляко прясно 3.6% масленост', '🥛', 'Млечни продукти', '1л',
 ARRAY['мляко', 'прясно', '3.6%', '3,6%', 'mleko', 'milk']),
(2, 'Хляб бял/пълнозърнест', 'Хляб бял или пълнозърнест', '🍞', 'Хляб и тестени', '500г',
 ARRAY['хляб', 'бял', 'пълнозърнест', 'hlqb', 'bread']),
(3, 'Яйца M', 'Яйца размер M', '🥚', 'Основни храни', '10бр',
 ARRAY['яйца', 'qica', 'eggs', '10бр', '10 броя']),
(4, 'Сирене краве', 'Сирене краве', '🧀', 'Млечни продукти', '1кг',
 ARRAY['сирене', 'краве', 'sirene', 'cheese']),
(5, 'Кисело мляко', 'Кисело мляко/йогурт', '🥛', 'Млечни продукти', '400г',
 ARRAY['кисело мляко', 'йогурт', 'kiselo', 'yogurt']),
(6, 'Банани', 'Банани', '🍌', 'Плодове', '1кг',
 ARRAY['банани', 'banani', 'banana']),
(7, 'Олио слънчогледово', 'Олио слънчогледово', '🌻', 'Основни храни', '1л',
 ARRAY['олио', 'слънчогледово', 'olio', 'sunflower', 'oil']),
(8, 'Пилешко филе', 'Пилешко филе/гърди', '🍗', 'Месо и риба', '1кг',
 ARRAY['пилешко', 'филе', 'гърди', 'pileshko', 'chicken']),
(9, 'Захар бяла', 'Захар бяла', '🧂', 'Основни храни', '1кг',
 ARRAY['захар', 'бяла', 'zahar', 'sugar']),
(10, 'Тоалетна хартия', 'Тоалетна хартия', '🧻', 'Битова химия', '8 ролки',
 ARRAY['тоалетна хартия', 'toilet paper', '8бр', '8 ролки'])
ON CONFLICT (position) DO NOTHING;

-- 2. Create manual prices table (admin uploads)
CREATE TABLE IF NOT EXISTS manual_prices (
  id SERIAL PRIMARY KEY,
  standard_product_id INTEGER REFERENCES standard_products(id) NOT NULL,
  retailer_id INTEGER REFERENCES retailers(id) NOT NULL,

  -- Price data
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  unit TEXT, -- Actual unit from upload

  -- Promotion data (optional)
  is_promotion BOOLEAN DEFAULT FALSE,
  promotion_text TEXT,
  promotion_valid_until DATE,

  -- Upload metadata
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  week_number INTEGER, -- ISO week number
  year INTEGER,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  UNIQUE(standard_product_id, retailer_id, year, week_number)
);

CREATE INDEX idx_manual_prices_product ON manual_prices(standard_product_id);
CREATE INDEX idx_manual_prices_retailer ON manual_prices(retailer_id);
CREATE INDEX idx_manual_prices_active ON manual_prices(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_manual_prices_week ON manual_prices(year, week_number);

-- 3. Create aggregated prices view (combines manual + user receipt data)
CREATE OR REPLACE VIEW aggregated_standard_prices AS
WITH manual_latest AS (
  -- Get latest manual prices per product/retailer
  SELECT DISTINCT ON (standard_product_id, retailer_id)
    mp.standard_product_id,
    mp.retailer_id,
    r.name as retailer_name,
    mp.price,
    mp.is_promotion,
    mp.promotion_text,
    mp.promotion_valid_until,
    mp.uploaded_at,
    'manual' as source
  FROM manual_prices mp
  JOIN retailers r ON mp.retailer_id = r.id
  WHERE mp.is_active = TRUE
    AND mp.uploaded_at >= NOW() - INTERVAL '14 days' -- Only last 2 weeks
  ORDER BY standard_product_id, retailer_id, uploaded_at DESC
),
user_receipts_prices AS (
  -- Get prices from user receipts by matching keywords
  SELECT
    sp.id as standard_product_id,
    i.retailer_id,
    r.name as retailer_name,
    AVG(i.unit_price) as price,
    FALSE as is_promotion,
    NULL as promotion_text,
    NULL::DATE as promotion_valid_until,
    MAX(rec.purchased_at) as uploaded_at,
    'user_receipts' as source,
    COUNT(*) as sample_count
  FROM items i
  JOIN receipts rec ON i.receipt_id = rec.id
  JOIN retailers r ON i.retailer_id = r.id
  CROSS JOIN standard_products sp
  WHERE
    rec.purchased_at >= NOW() - INTERVAL '30 days'
    AND i.unit_price > 0
    AND (
      -- Match product name against keywords
      EXISTS (
        SELECT 1 FROM unnest(sp.keywords) AS keyword
        WHERE LOWER(i.product_name) LIKE '%' || LOWER(keyword) || '%'
      )
    )
  GROUP BY sp.id, i.retailer_id, r.name
  HAVING COUNT(*) >= 2 -- At least 2 purchases to be reliable
),
combined_prices AS (
  -- Combine both sources, preferring manual prices
  SELECT * FROM manual_latest
  UNION ALL
  SELECT
    standard_product_id,
    retailer_id,
    retailer_name,
    price,
    is_promotion,
    promotion_text,
    promotion_valid_until,
    uploaded_at,
    source
  FROM user_receipts_prices urp
  WHERE NOT EXISTS (
    -- Only include if no manual price exists for this product/retailer
    SELECT 1 FROM manual_latest ml
    WHERE ml.standard_product_id = urp.standard_product_id
      AND ml.retailer_id = urp.retailer_id
  )
)
SELECT
  sp.position,
  sp.name,
  sp.description,
  sp.icon,
  sp.category,
  sp.unit,
  sp.keywords,

  -- Price statistics
  COUNT(DISTINCT cp.retailer_id) as retailer_count,
  ROUND(AVG(cp.price)::numeric, 2) as avg_price,
  ROUND(MIN(cp.price)::numeric, 2) as min_price,
  ROUND(MAX(cp.price)::numeric, 2) as max_price,
  COUNT(*) FILTER (WHERE cp.is_promotion = TRUE) as promotion_count,

  -- All prices as JSON
  JSON_AGG(
    JSON_BUILD_OBJECT(
      'retailer', cp.retailer_name,
      'price', ROUND(cp.price::numeric, 2),
      'is_promotion', cp.is_promotion,
      'promotion_text', cp.promotion_text,
      'promotion_valid_until', cp.promotion_valid_until,
      'source', cp.source,
      'last_updated', cp.uploaded_at
    ) ORDER BY cp.price ASC
  ) as prices,

  -- Data sources summary
  COUNT(*) FILTER (WHERE cp.source = 'manual') as manual_count,
  COUNT(*) FILTER (WHERE cp.source = 'user_receipts') as user_data_count,

  MAX(cp.uploaded_at) as last_updated
FROM standard_products sp
LEFT JOIN combined_prices cp ON sp.id = cp.standard_product_id
GROUP BY sp.position, sp.name, sp.description, sp.icon, sp.category, sp.unit, sp.keywords
ORDER BY sp.position;

-- 4. Create price upload history table
CREATE TABLE IF NOT EXISTS price_upload_history (
  id SERIAL PRIMARY KEY,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  rows_processed INTEGER,
  rows_successful INTEGER,
  rows_failed INTEGER,
  error_details JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_upload_history_user ON price_upload_history(uploaded_by);
CREATE INDEX idx_upload_history_date ON price_upload_history(uploaded_at DESC);

-- 5. Grant permissions
GRANT SELECT ON standard_products TO authenticated, anon;
GRANT SELECT ON aggregated_standard_prices TO authenticated, anon;
GRANT SELECT ON manual_prices TO authenticated;

-- Admin only
GRANT ALL ON manual_prices TO authenticated;
GRANT ALL ON price_upload_history TO authenticated;

-- 6. Create helper function to bulk insert prices
CREATE OR REPLACE FUNCTION bulk_insert_manual_prices(
  prices_data JSONB,
  uploader_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  rows_inserted INTEGER,
  errors JSONB
) AS $$
DECLARE
  row_data JSONB;
  inserted_count INTEGER := 0;
  error_list JSONB := '[]'::JSONB;
  current_week INTEGER;
  current_year INTEGER;
BEGIN
  -- Get current ISO week
  current_week := EXTRACT(WEEK FROM CURRENT_DATE);
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);

  -- Loop through each price entry
  FOR row_data IN SELECT * FROM jsonb_array_elements(prices_data)
  LOOP
    BEGIN
      INSERT INTO manual_prices (
        standard_product_id,
        retailer_id,
        price,
        unit,
        is_promotion,
        promotion_text,
        promotion_valid_until,
        uploaded_by,
        week_number,
        year
      ) VALUES (
        (row_data->>'standard_product_id')::INTEGER,
        (row_data->>'retailer_id')::INTEGER,
        (row_data->>'price')::NUMERIC,
        row_data->>'unit',
        COALESCE((row_data->>'is_promotion')::BOOLEAN, FALSE),
        row_data->>'promotion_text',
        (row_data->>'promotion_valid_until')::DATE,
        uploader_id,
        current_week,
        current_year
      )
      ON CONFLICT (standard_product_id, retailer_id, year, week_number)
      DO UPDATE SET
        price = EXCLUDED.price,
        unit = EXCLUDED.unit,
        is_promotion = EXCLUDED.is_promotion,
        promotion_text = EXCLUDED.promotion_text,
        promotion_valid_until = EXCLUDED.promotion_valid_until,
        uploaded_at = NOW();

      inserted_count := inserted_count + 1;

    EXCEPTION WHEN OTHERS THEN
      error_list := error_list || jsonb_build_object(
        'row', row_data,
        'error', SQLERRM
      );
    END;
  END LOOP;

  RETURN QUERY SELECT
    TRUE as success,
    inserted_count as rows_inserted,
    error_list as errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION bulk_insert_manual_prices TO authenticated;
