-- Product Normalization System for Price Comparison
-- Fixed: All ID types now match (UUID for categories/retailers, SERIAL for products)

-- 1. CREATE MASTER PRODUCTS TABLE (normalized reference)
CREATE TABLE IF NOT EXISTS master_products (
  id SERIAL PRIMARY KEY,
  normalized_name TEXT NOT NULL UNIQUE,
  category_id INTEGER REFERENCES categories(id), -- Changed to INTEGER
  base_product_name TEXT,
  brand TEXT,
  size NUMERIC,
  unit TEXT,
  fat_content NUMERIC,
  product_type TEXT,
  barcode TEXT,
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_master_products_normalized ON master_products(normalized_name);
CREATE INDEX IF NOT EXISTS idx_master_products_barcode ON master_products(barcode);
CREATE INDEX IF NOT EXISTS idx_master_products_keywords ON master_products USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_master_products_category ON master_products(category_id);
CREATE INDEX IF NOT EXISTS idx_master_products_brand ON master_products(brand);

-- 2. UPDATE ITEMS TABLE (link to master products)
ALTER TABLE items ADD COLUMN IF NOT EXISTS master_product_id INTEGER REFERENCES master_products(id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS raw_product_name TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS confidence_score NUMERIC;

CREATE INDEX IF NOT EXISTS idx_items_master_product ON items(master_product_id);

-- 3. CREATE PRODUCT ALIASES TABLE (handle variations)
CREATE TABLE IF NOT EXISTS product_aliases (
  id SERIAL PRIMARY KEY,
  master_product_id INTEGER REFERENCES master_products(id) ON DELETE CASCADE,
  retailer_id INTEGER REFERENCES retailers(id) ON DELETE CASCADE, -- Changed to INTEGER
  alias_name TEXT NOT NULL,
  barcode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(retailer_id, alias_name)
);

CREATE INDEX IF NOT EXISTS idx_product_aliases_master ON product_aliases(master_product_id);
CREATE INDEX IF NOT EXISTS idx_product_aliases_retailer ON product_aliases(retailer_id);
CREATE INDEX IF NOT EXISTS idx_product_aliases_barcode ON product_aliases(barcode);

-- 4. CREATE PRICE HISTORY TABLE (optimized for comparison)
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  master_product_id INTEGER REFERENCES master_products(id) NOT NULL,
  retailer_id INTEGER REFERENCES retailers(id) NOT NULL, -- Changed to INTEGER
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2),
  quantity NUMERIC,
  currency TEXT DEFAULT 'BGN',
  seen_at TIMESTAMPTZ DEFAULT NOW(),
  receipt_id INTEGER REFERENCES receipts(id), -- Changed to INTEGER if receipts use SERIAL
  location TEXT
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(master_product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_retailer ON price_history(retailer_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(seen_at);
CREATE INDEX IF NOT EXISTS idx_price_history_composite ON price_history(master_product_id, retailer_id, seen_at);
CREATE INDEX IF NOT EXISTS idx_price_history_receipt ON price_history(receipt_id);

-- 5. DROP AND RECREATE MATERIALIZED VIEW
DROP MATERIALIZED VIEW IF EXISTS current_prices CASCADE;

CREATE MATERIALIZED VIEW current_prices AS
SELECT DISTINCT ON (master_product_id, retailer_id)
  master_product_id,
  retailer_id,
  unit_price,
  total_price,
  quantity,
  seen_at,
  location
FROM price_history
ORDER BY master_product_id, retailer_id, seen_at DESC;

CREATE UNIQUE INDEX idx_current_prices_unique ON current_prices(master_product_id, retailer_id);
CREATE INDEX idx_current_prices_product ON current_prices(master_product_id);
CREATE INDEX idx_current_prices_retailer ON current_prices(retailer_id);

-- Refresh function for materialized view
CREATE OR REPLACE FUNCTION refresh_current_prices()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY current_prices;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. DROP AND RECREATE PRICE COMPARISON VIEW
DROP VIEW IF EXISTS price_comparison CASCADE;

CREATE VIEW price_comparison AS
SELECT
  mp.id as master_product_id,
  mp.normalized_name,
  mp.brand,
  mp.size,
  mp.unit,
  mp.category_id,
  r.id as retailer_id,
  r.name as retailer,
  cp.unit_price,
  cp.seen_at,
  cp.location,
  RANK() OVER (PARTITION BY mp.id ORDER BY cp.unit_price ASC) as price_rank,
  AVG(cp.unit_price) OVER (PARTITION BY mp.id) as avg_price,
  MIN(cp.unit_price) OVER (PARTITION BY mp.id) as min_price,
  MAX(cp.unit_price) OVER (PARTITION BY mp.id) as max_price,
  ROUND(((AVG(cp.unit_price) OVER (PARTITION BY mp.id) - cp.unit_price) /
         NULLIF(AVG(cp.unit_price) OVER (PARTITION BY mp.id), 0) * 100), 1) as savings_percent,
  ROUND(((MAX(cp.unit_price) OVER (PARTITION BY mp.id) - cp.unit_price) /
         NULLIF(MAX(cp.unit_price) OVER (PARTITION BY mp.id), 0) * 100), 1) as savings_vs_max_percent
FROM master_products mp
JOIN current_prices cp ON mp.id = cp.master_product_id
JOIN retailers r ON cp.retailer_id = r.id;

-- 7. PRODUCT NORMALIZATION FUNCTIONS

-- Function to extract brand from product name
CREATE OR REPLACE FUNCTION extract_brand(product_name TEXT)
RETURNS TEXT AS $$
DECLARE
  known_brands TEXT[] := ARRAY[
    'Верея', 'Милковия', 'Бор Чвор', 'Валио', 'БДС',
    'Маджаров', 'Кириешки', 'Vita', 'Coca-Cola', 'Pepsi',
    'Milka', 'Nestle', 'Danone', 'Alpro', 'Arla'
  ];
  brand TEXT;
BEGIN
  FOREACH brand IN ARRAY known_brands LOOP
    IF product_name ILIKE '%' || brand || '%' THEN
      RETURN brand;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract size and unit
CREATE OR REPLACE FUNCTION extract_size_unit(product_name TEXT)
RETURNS TABLE(size NUMERIC, unit TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(
      (regexp_match(product_name, '(\d+(?:[.,]\d+)?)\s*(л|мл|кг|г|бр)', 'i'))[1]::NUMERIC,
      NULL
    ),
    COALESCE(
      LOWER((regexp_match(product_name, '(\d+(?:[.,]\d+)?)\s*(л|мл|кг|г|бр)', 'i'))[2]),
      NULL
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to normalize product name
CREATE OR REPLACE FUNCTION normalize_product_name(raw_name TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
  brand TEXT;
  size_info RECORD;
BEGIN
  normalized := regexp_replace(raw_name, '\s+', ' ', 'g');
  normalized := TRIM(normalized);
  normalized := INITCAP(normalized);
  
  brand := extract_brand(normalized);
  SELECT * INTO size_info FROM extract_size_unit(normalized);
  
  IF brand IS NOT NULL AND size_info.size IS NOT NULL THEN
    normalized := regexp_replace(normalized, brand, '', 'i');
    normalized := regexp_replace(normalized, size_info.size || '\s*' || size_info.unit, '', 'i');
    normalized := TRIM(regexp_replace(normalized, '\s+', ' ', 'g'));
    normalized := normalized || ' ' || brand || ' ' || size_info.size || size_info.unit;
  END IF;
  
  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create or find master product (FIXED TYPES)
CREATE OR REPLACE FUNCTION get_or_create_master_product(
  p_raw_name TEXT,
  p_category_id INTEGER DEFAULT NULL, -- Changed from UUID to INTEGER
  p_retailer_id INTEGER DEFAULT NULL  -- Changed from UUID to INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_master_id INTEGER;
  v_normalized_name TEXT;
  v_brand TEXT;
  v_size_info RECORD;
  v_keywords TEXT[];
BEGIN
  v_normalized_name := normalize_product_name(p_raw_name);
  v_brand := extract_brand(p_raw_name);
  SELECT * INTO v_size_info FROM extract_size_unit(p_raw_name);
  
  v_keywords := string_to_array(lower(regexp_replace(v_normalized_name, '[^a-zA-Zа-яА-Я0-9\s]', '', 'g')), ' ');
  
  SELECT id INTO v_master_id
  FROM master_products
  WHERE normalized_name = v_normalized_name;
  
  IF v_master_id IS NULL THEN
    INSERT INTO master_products (
      normalized_name,
      category_id,
      brand,
      size,
      unit,
      keywords
    ) VALUES (
      v_normalized_name,
      p_category_id,
      v_brand,
      v_size_info.size,
      v_size_info.unit,
      v_keywords
    )
    RETURNING id INTO v_master_id;
  END IF;
  
  IF p_retailer_id IS NOT NULL THEN
    INSERT INTO product_aliases (master_product_id, retailer_id, alias_name)
    VALUES (v_master_id, p_retailer_id, p_raw_name)
    ON CONFLICT (retailer_id, alias_name) DO NOTHING;
  END IF;
  
  RETURN v_master_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record price (FIXED TYPES)
CREATE OR REPLACE FUNCTION record_price(
  p_master_product_id INTEGER,
  p_retailer_id INTEGER,           -- Changed from UUID to INTEGER
  p_unit_price NUMERIC,
  p_total_price NUMERIC DEFAULT NULL,
  p_quantity NUMERIC DEFAULT 1,
  p_receipt_id INTEGER DEFAULT NULL, -- Changed from UUID to INTEGER
  p_location TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_price_id INTEGER;
BEGIN
  INSERT INTO price_history (
    master_product_id,
    retailer_id,
    unit_price,
    total_price,
    quantity,
    receipt_id,
    location
  ) VALUES (
    p_master_product_id,
    p_retailer_id,
    p_unit_price,
    p_total_price,
    p_quantity,
    p_receipt_id,
    p_location
  )
  RETURNING id INTO v_price_id;
  
  -- Refresh materialized view
  PERFORM refresh_current_prices();
  
  RETURN v_price_id;
END;
$$ LANGUAGE plpgsql;

-- 8. ENABLE ROW LEVEL SECURITY
ALTER TABLE master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view master products" ON master_products FOR SELECT USING (true);
CREATE POLICY "Anyone can view product aliases" ON product_aliases FOR SELECT USING (true);
CREATE POLICY "Anyone can view price history" ON price_history FOR SELECT USING (true);

-- Only authenticated users can insert
CREATE POLICY "Authenticated users can insert master products" ON master_products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert product aliases" ON product_aliases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert price history" ON price_history FOR INSERT TO authenticated WITH CHECK (true);