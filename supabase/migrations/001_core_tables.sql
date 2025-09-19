-- ========================================
-- ПРИЗМА - ОСНОВНИ ТАБЛИЦИ
-- ========================================
-- Миграция 001: Създаване на основните таблици
-- Дата: 2025-01-19
-- Описание: Профили, търговци, категории

-- Включване на необходими разширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ========================================
-- ПРОФИЛИ НА ПОТРЕБИТЕЛИ
-- ========================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url TEXT,
    default_currency VARCHAR(3) DEFAULT 'BGN',
    language VARCHAR(5) DEFAULT 'bg',
    timezone VARCHAR(50) DEFAULT 'Europe/Sofia',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Автоматично обновяване на updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ТЪРГОВЦИ / МАГАЗИНИ
-- ========================================
CREATE TABLE public.retailers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) GENERATED ALWAYS AS (
        LOWER(TRIM(REGEXP_REPLACE(name, '[^\w\s]', '', 'g')))
    ) STORED,
    logo_url TEXT,
    website TEXT,
    is_chain BOOLEAN DEFAULT TRUE,
    country_code VARCHAR(2) DEFAULT 'BG',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_retailers_updated_at
    BEFORE UPDATE ON public.retailers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Уникални имена на търговци (case-insensitive)
CREATE UNIQUE INDEX idx_retailers_normalized_name
    ON public.retailers(normalized_name);

-- ========================================
-- КАТЕГОРИИ НА ПРОДУКТИ
-- ========================================
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) GENERATED ALWAYS AS (
        LOWER(TRIM(REGEXP_REPLACE(name, '[^\w\s]', '', 'g')))
    ) STORED,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    icon_name VARCHAR(50), -- За UI икони
    color_hex VARCHAR(7), -- Цвят в hex формат (#RRGGBB)
    is_system BOOLEAN DEFAULT FALSE, -- Системни категории не могат да се изтрият
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Предотвратяване на циклични референции в категориите
CREATE OR REPLACE FUNCTION check_category_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
    -- Проверка за self-reference
    IF NEW.id = NEW.parent_id THEN
        RAISE EXCEPTION 'Категорията не може да бъде родител на себе си';
    END IF;

    -- Проверка за циклични референции (опростена версия)
    IF NEW.parent_id IS NOT NULL THEN
        DECLARE
            current_id UUID := NEW.parent_id;
            depth INTEGER := 0;
        BEGIN
            WHILE current_id IS NOT NULL AND depth < 10 LOOP
                IF current_id = NEW.id THEN
                    RAISE EXCEPTION 'Циклична референция в категориите';
                END IF;

                SELECT parent_id INTO current_id
                FROM public.categories
                WHERE id = current_id;

                depth := depth + 1;
            END LOOP;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_category_hierarchy_trigger
    BEFORE INSERT OR UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION check_category_hierarchy();

-- ========================================
-- ИНДЕКСИ ЗА ПРОИЗВОДИТЕЛНОСТ
-- ========================================

-- Търсене по имена на търговци
CREATE INDEX idx_retailers_name_trgm ON public.retailers
    USING gin(name gin_trgm_ops);

-- Търсене по имена на категории
CREATE INDEX idx_categories_name_trgm ON public.categories
    USING gin(name gin_trgm_ops);

-- Йерархия на категории
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);

-- Сортиране на категории
CREATE INDEX idx_categories_sort_order ON public.categories(sort_order);

-- ========================================
-- КОМЕНТАРИ ЗА ДОКУМЕНТАЦИЯ
-- ========================================

COMMENT ON TABLE public.profiles IS 'Профили на потребители - съхранява допълнителна информация за auth.users';
COMMENT ON COLUMN public.profiles.default_currency IS 'Валута по подразбиране за потребителя (BGN, EUR, USD и т.н.)';
COMMENT ON COLUMN public.profiles.language IS 'Език на интерфейса (bg, en и т.н.)';
COMMENT ON COLUMN public.profiles.timezone IS 'Часова зона на потребителя';

COMMENT ON TABLE public.retailers IS 'Търговци/магазини - Kaufland, BILLA, Lidl и т.н.';
COMMENT ON COLUMN public.retailers.normalized_name IS 'Нормализирано име за търсене (lowercase, без специални символи)';
COMMENT ON COLUMN public.retailers.is_chain IS 'Дали е верига магазини или самостоятелен магазин';

COMMENT ON TABLE public.categories IS 'Категории продукти с йерархична структура';
COMMENT ON COLUMN public.categories.parent_id IS 'Родителска категория за създаване на йерархия';
COMMENT ON COLUMN public.categories.is_system IS 'Системни категории не могат да се изтрият от потребители';
COMMENT ON COLUMN public.categories.icon_name IS 'Име на икона за UI (shopping-cart, coffee, etc.)';
COMMENT ON COLUMN public.categories.color_hex IS 'Цвят на категорията в hex формат за UI';

-- ========================================
-- ДАННИ ЗА ТЕСТВАНЕ
-- ========================================

-- Ще бъдат добавени в следваща миграция