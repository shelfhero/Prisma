-- ========================================
-- ПРИЗМА - КАСОВИ БЕЛЕЖКИ И ПРОДУКТИ
-- ========================================
-- Миграция 002: Касови бележки, снимки, продукти, ценови снимки
-- Дата: 2025-01-19
-- Описание: Основната функционалност за касови бележки

-- ========================================
-- КАСОВИ БЕЛЕЖКИ
-- ========================================
CREATE TABLE public.receipts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    retailer_id UUID REFERENCES public.retailers(id) ON DELETE SET NULL,

    -- Основни данни
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BGN',
    purchased_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Локация (ако е налична)
    store_location TEXT, -- "София, бул. Витоша 123"
    store_address JSONB, -- Структурирани данни за адрес

    -- OCR данни
    ocr_raw JSONB, -- Пълен отговор от OCR API
    ocr_confidence DECIMAL(3,2), -- 0.00-1.00 ниво на увереност
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (
        processing_status IN ('pending', 'processing', 'completed', 'failed', 'manual')
    ),

    -- Метаданни
    manual_entry BOOLEAN DEFAULT FALSE, -- Ръчно въведена бележка
    notes TEXT, -- Бележки от потребителя
    tags TEXT[], -- Тагове за организация

    -- Времеви данни
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_receipts_updated_at
    BEFORE UPDATE ON public.receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- СНИМКИ НА КАСОВИ БЕЛЕЖКИ
-- ========================================
CREATE TABLE public.receipt_images (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,

    -- Файлови данни
    storage_path TEXT NOT NULL, -- Път в Supabase Storage
    original_filename TEXT,
    file_size_bytes INTEGER,
    mime_type VARCHAR(50),

    -- Размери на изображението
    width INTEGER,
    height INTEGER,

    -- Метаданни
    is_primary BOOLEAN DEFAULT FALSE, -- Основна снимка
    image_order INTEGER DEFAULT 0, -- Ред на снимките

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Само една основна снимка на касова бележка
CREATE UNIQUE INDEX idx_receipt_images_primary
    ON public.receipt_images(receipt_id)
    WHERE is_primary = TRUE;

-- ========================================
-- ПРОДУКТИ/АРТИКУЛИ
-- ========================================
CREATE TABLE public.items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

    -- Основни данни за продукта
    product_name TEXT NOT NULL,
    normalized_name TEXT GENERATED ALWAYS AS (
        LOWER(TRIM(REGEXP_REPLACE(product_name, '[^\w\s]', '', 'g')))
    ) STORED,

    -- Идентификация
    barcode VARCHAR(50), -- EAN-13, UPC и други
    sku VARCHAR(100), -- Код на търговеца

    -- Цени и количества
    qty DECIMAL(8,3) NOT NULL DEFAULT 1, -- Количество
    unit_measure VARCHAR(10) DEFAULT 'бр', -- кг, л, бр, м и т.н.
    unit_price DECIMAL(10,4) NOT NULL, -- Единична цена
    total_price DECIMAL(10,2) NOT NULL, -- Обща цена за количеството
    discount_amount DECIMAL(10,2) DEFAULT 0, -- Размер на отстъпката

    -- Данъци
    vat_rate DECIMAL(5,2), -- ДДС процент (20.00 за 20%)
    vat_amount DECIMAL(10,2), -- Сума ДДС

    -- OCR данни
    ocr_confidence DECIMAL(3,2), -- Увереност в разпознаването
    raw_text TEXT, -- Сурови данни от OCR

    -- Метаданни
    notes TEXT, -- Бележки за продукта
    is_manual BOOLEAN DEFAULT FALSE, -- Ръчно добавен артикул
    item_order INTEGER DEFAULT 0, -- Ред в касовата бележка

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ЦЕНОВИ СНИМКИ (PRICE SNAPSHOTS)
-- ========================================
-- За проследяване на промените в цените на продуктите
CREATE TABLE public.price_snapshots (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

    -- Идентификация на продукта
    barcode VARCHAR(50),
    normalized_name TEXT NOT NULL,
    retailer_id UUID REFERENCES public.retailers(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

    -- Ценови данни
    unit_price DECIMAL(10,4) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BGN',
    unit_measure VARCHAR(10) DEFAULT 'бр',

    -- Метаданни
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source_receipt_id UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
    sample_size INTEGER DEFAULT 1, -- Брой наблюдения за тази дата

    -- Статистики (ако са агрегирани данни)
    min_price DECIMAL(10,4),
    max_price DECIMAL(10,4),
    avg_price DECIMAL(10,4),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ИНДЕКСИ ЗА ПРОИЗВОДИТЕЛНОСТ
-- ========================================

-- Касови бележки
CREATE INDEX idx_receipts_user_id ON public.receipts(user_id);
CREATE INDEX idx_receipts_user_purchased_at ON public.receipts(user_id, purchased_at DESC);
CREATE INDEX idx_receipts_retailer_id ON public.receipts(retailer_id);
CREATE INDEX idx_receipts_processing_status ON public.receipts(processing_status);
CREATE INDEX idx_receipts_purchased_at ON public.receipts(purchased_at DESC);

-- Ефективен поиск по дата за конкретен потребител
CREATE INDEX idx_receipts_user_date_range ON public.receipts(user_id, purchased_at)
    WHERE purchased_at >= CURRENT_DATE - INTERVAL '1 year';

-- Снимки на касови бележки
CREATE INDEX idx_receipt_images_receipt_id ON public.receipt_images(receipt_id);
CREATE INDEX idx_receipt_images_storage_path ON public.receipt_images(storage_path);

-- Продукти/артикули
CREATE INDEX idx_items_receipt_id ON public.items(receipt_id);
CREATE INDEX idx_items_category_id ON public.items(category_id);
CREATE INDEX idx_items_barcode ON public.items(barcode);

-- Търсене по име на продукт (trigram)
CREATE INDEX idx_items_name_trgm ON public.items
    USING gin(product_name gin_trgm_ops);

CREATE INDEX idx_items_normalized_name_trgm ON public.items
    USING gin(normalized_name gin_trgm_ops);

-- Composite индекс за анализ на цени
CREATE INDEX idx_items_barcode_price ON public.items(barcode, unit_price, created_at)
    WHERE barcode IS NOT NULL;

-- Ценови снимки
CREATE INDEX idx_price_snapshots_barcode ON public.price_snapshots(barcode);
CREATE INDEX idx_price_snapshots_normalized_name ON public.price_snapshots(normalized_name);
CREATE INDEX idx_price_snapshots_retailer_date ON public.price_snapshots(retailer_id, snapshot_date DESC);
CREATE INDEX idx_price_snapshots_category_date ON public.price_snapshots(category_id, snapshot_date DESC);

-- Composite индекс за ценови сравнения
CREATE INDEX idx_price_snapshots_product_lookup ON public.price_snapshots(
    normalized_name, retailer_id, snapshot_date DESC
);

-- ========================================
-- ФУНКЦИИ ЗА АВТОМАТИЗАЦИЯ
-- ========================================

-- Автоматично създаване на ценови снимки при добавяне на артикул
CREATE OR REPLACE FUNCTION create_price_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    -- Създаване на ценова снимка само за артикули с баркод или уникално име
    IF NEW.barcode IS NOT NULL OR LENGTH(TRIM(NEW.normalized_name)) > 3 THEN
        INSERT INTO public.price_snapshots (
            barcode,
            normalized_name,
            retailer_id,
            category_id,
            unit_price,
            currency,
            unit_measure,
            snapshot_date,
            source_receipt_id
        )
        SELECT
            NEW.barcode,
            NEW.normalized_name,
            r.retailer_id,
            NEW.category_id,
            NEW.unit_price,
            r.currency,
            NEW.unit_measure,
            r.purchased_at::date,
            NEW.receipt_id
        FROM public.receipts r
        WHERE r.id = NEW.receipt_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_price_snapshot_trigger
    AFTER INSERT ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION create_price_snapshot();

-- Автоматично задаване на основна снимка
CREATE OR REPLACE FUNCTION set_primary_image()
RETURNS TRIGGER AS $$
BEGIN
    -- Ако няма основна снимка, направи тази основна
    IF NEW.is_primary = FALSE OR NEW.is_primary IS NULL THEN
        DECLARE
            has_primary BOOLEAN;
        BEGIN
            SELECT EXISTS(
                SELECT 1 FROM public.receipt_images
                WHERE receipt_id = NEW.receipt_id AND is_primary = TRUE
            ) INTO has_primary;

            IF NOT has_primary THEN
                NEW.is_primary = TRUE;
            END IF;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_primary_image_trigger
    BEFORE INSERT ON public.receipt_images
    FOR EACH ROW
    EXECUTE FUNCTION set_primary_image();

-- ========================================
-- ПРОВЕРКИ ЗА ВАЛИДНОСТ
-- ========================================

-- Проверка за положителни цени
ALTER TABLE public.receipts
    ADD CONSTRAINT check_positive_total_amount
    CHECK (total_amount > 0);

ALTER TABLE public.items
    ADD CONSTRAINT check_positive_unit_price
    CHECK (unit_price > 0);

ALTER TABLE public.items
    ADD CONSTRAINT check_positive_total_price
    CHECK (total_price > 0);

ALTER TABLE public.items
    ADD CONSTRAINT check_positive_qty
    CHECK (qty > 0);

-- Проверка за валидни валути
ALTER TABLE public.receipts
    ADD CONSTRAINT check_valid_currency
    CHECK (currency IN ('BGN', 'EUR', 'USD', 'GBP'));

-- Проверка за валидни мерни единици
ALTER TABLE public.items
    ADD CONSTRAINT check_valid_unit_measure
    CHECK (unit_measure IN ('бр', 'кг', 'г', 'л', 'мл', 'м', 'см', 'м²', 'опак'));

-- ========================================
-- КОМЕНТАРИ ЗА ДОКУМЕНТАЦИЯ
-- ========================================

COMMENT ON TABLE public.receipts IS 'Касови бележки с OCR данни и метаданни';
COMMENT ON COLUMN public.receipts.ocr_raw IS 'Пълен JSON отговор от OCR API';
COMMENT ON COLUMN public.receipts.processing_status IS 'Статус на обработката: pending, processing, completed, failed, manual';
COMMENT ON COLUMN public.receipts.manual_entry IS 'Ръчно въведена касова бележка (без OCR)';

COMMENT ON TABLE public.receipt_images IS 'Снимки на касови бележки в Supabase Storage';
COMMENT ON COLUMN public.receipt_images.is_primary IS 'Основна снимка за показване в списъци';

COMMENT ON TABLE public.items IS 'Артикули/продукти от касови бележки с нормализирани данни';
COMMENT ON COLUMN public.items.normalized_name IS 'Нормализирано име за търсене и сравнение';
COMMENT ON COLUMN public.items.barcode IS 'Баркод (EAN-13, UPC и др.) за идентификация';

COMMENT ON TABLE public.price_snapshots IS 'Ценови снимки за проследяване на промените в цените';
COMMENT ON COLUMN public.price_snapshots.sample_size IS 'Брой наблюдения за агрегирани данни';