-- ========================================
-- ПРИЗМА - БЮДЖЕТИ И ПЛАНИРАНЕ
-- ========================================
-- Миграция 003: Бюджети, бюджетни линии, планиране на разходи
-- Дата: 2025-01-19
-- Описание: Система за бюджетиране и контрол на разходи

-- ========================================
-- БЮДЖЕТИ
-- ========================================
CREATE TABLE public.budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Основни данни
    name VARCHAR(100) NOT NULL, -- "Семеен бюджет януари 2025"
    description TEXT,

    -- Период на бюджета
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Финансови данни
    total_budget DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BGN',

    -- Статус и тип
    status VARCHAR(20) DEFAULT 'active' CHECK (
        status IN ('draft', 'active', 'completed', 'cancelled')
    ),
    budget_type VARCHAR(20) DEFAULT 'monthly' CHECK (
        budget_type IN ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')
    ),

    -- Настройки
    auto_categorize BOOLEAN DEFAULT TRUE, -- Автоматично категоризиране
    alert_threshold DECIMAL(3,2) DEFAULT 0.8, -- Праг за предупреждения (80%)
    rollover_unused BOOLEAN DEFAULT FALSE, -- Прехвърляне на неизползваните средства

    -- Метаданни
    is_template BOOLEAN DEFAULT FALSE, -- Дали е шаблон за други бюджети
    template_name VARCHAR(100), -- Име на шаблона
    color_hex VARCHAR(7) DEFAULT '#2563eb', -- Цвят за UI

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- БЮДЖЕТНИ ЛИНИИ
-- ========================================
CREATE TABLE public.budget_lines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,

    -- Основни данни
    name VARCHAR(100) NOT NULL, -- "Основни храни", "Транспорт"
    description TEXT,

    -- Планирани средства
    allocated_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BGN',

    -- Изразходвани средства (изчислявани)
    spent_amount DECIMAL(10,2) DEFAULT 0,
    remaining_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        allocated_amount - spent_amount
    ) STORED,

    -- Процент използване
    usage_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN allocated_amount > 0
            THEN (spent_amount / allocated_amount) * 100
            ELSE 0
        END
    ) STORED,

    -- Правила за автоматично категоризиране
    auto_match_rules JSONB, -- JSON правила за автоматично присвояване
    include_subcategories BOOLEAN DEFAULT TRUE,

    -- Настройки за предупреждения
    warning_threshold DECIMAL(3,2) DEFAULT 0.8, -- 80%
    critical_threshold DECIMAL(3,2) DEFAULT 0.95, -- 95%

    -- Метаданни
    sort_order INTEGER DEFAULT 0,
    is_fixed BOOLEAN DEFAULT FALSE, -- Фиксирана сума (не се променя)
    color_hex VARCHAR(7),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_budget_lines_updated_at
    BEFORE UPDATE ON public.budget_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- ПРОСЛЕДЯВАНЕ НА РАЗХОДИ
-- ========================================
-- Вю за обобщаване на разходи по категории и периоди
CREATE VIEW public.spending_summary AS
SELECT
    r.user_id,
    i.category_id,
    c.name as category_name,
    ret.name as retailer_name,
    DATE_TRUNC('month', r.purchased_at) as spending_month,
    DATE_TRUNC('week', r.purchased_at) as spending_week,
    DATE_TRUNC('day', r.purchased_at) as spending_day,

    -- Агрегирани данни
    COUNT(i.id) as items_count,
    SUM(i.total_price) as total_spent,
    AVG(i.unit_price) as avg_unit_price,

    -- Статистики
    MIN(i.total_price) as min_item_price,
    MAX(i.total_price) as max_item_price,

    -- Метаданни
    COUNT(DISTINCT r.id) as receipts_count,
    COUNT(DISTINCT ret.id) as retailers_count

FROM public.receipts r
JOIN public.items i ON r.id = i.receipt_id
LEFT JOIN public.categories c ON i.category_id = c.id
LEFT JOIN public.retailers ret ON r.retailer_id = ret.id
WHERE r.processing_status = 'completed'
GROUP BY
    r.user_id,
    i.category_id,
    c.name,
    ret.name,
    DATE_TRUNC('month', r.purchased_at),
    DATE_TRUNC('week', r.purchased_at),
    DATE_TRUNC('day', r.purchased_at);

-- ========================================
-- ФУНКЦИИ ЗА БЮДЖЕТНИ ИЗЧИСЛЕНИЯ
-- ========================================

-- Обновяване на изразходваните суми в бюджетните линии
CREATE OR REPLACE FUNCTION update_budget_line_spending()
RETURNS TRIGGER AS $$
DECLARE
    budget_line_id UUID;
    new_spent_amount DECIMAL(10,2);
BEGIN
    -- Намираме всички бюджетни линии, които трябва да се обновят
    FOR budget_line_id IN
        SELECT bl.id
        FROM public.budget_lines bl
        JOIN public.budgets b ON bl.budget_id = b.id
        WHERE b.user_id = (
            SELECT user_id
            FROM public.receipts
            WHERE id = COALESCE(NEW.receipt_id, OLD.receipt_id)
        )
        AND b.status = 'active'
        AND (
            bl.category_id = COALESCE(NEW.category_id, OLD.category_id)
            OR (bl.include_subcategories = TRUE AND EXISTS(
                SELECT 1 FROM public.categories
                WHERE parent_id = bl.category_id
                AND id = COALESCE(NEW.category_id, OLD.category_id)
            ))
        )
    LOOP
        -- Изчисляваме новата изразходвана сума
        SELECT COALESCE(SUM(i.total_price), 0)
        INTO new_spent_amount
        FROM public.items i
        JOIN public.receipts r ON i.receipt_id = r.id
        JOIN public.budget_lines bl ON bl.id = budget_line_id
        JOIN public.budgets b ON bl.budget_id = b.id
        WHERE r.user_id = b.user_id
        AND r.purchased_at BETWEEN b.start_date AND b.end_date
        AND r.processing_status = 'completed'
        AND (
            i.category_id = bl.category_id
            OR (bl.include_subcategories = TRUE AND EXISTS(
                SELECT 1 FROM public.categories
                WHERE parent_id = bl.category_id
                AND id = i.category_id
            ))
        );

        -- Обновяваме бюджетната линия
        UPDATE public.budget_lines
        SET spent_amount = new_spent_amount
        WHERE id = budget_line_id;
    END LOOP;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Тригери за автоматично обновяване на бюджетите
CREATE TRIGGER update_budget_spending_on_item_change
    AFTER INSERT OR UPDATE OR DELETE ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION update_budget_line_spending();

-- ========================================
-- ШАБЛОНИ ЗА БЮДЖЕТИ
-- ========================================

-- Функция за създаване на бюджет от шаблон
CREATE OR REPLACE FUNCTION create_budget_from_template(
    template_id UUID,
    target_user_id UUID,
    budget_name TEXT,
    start_date DATE,
    end_date DATE
)
RETURNS UUID AS $$
DECLARE
    new_budget_id UUID;
    budget_line RECORD;
BEGIN
    -- Създаваме новия бюджет
    INSERT INTO public.budgets (
        user_id, name, description, start_date, end_date,
        total_budget, currency, budget_type, auto_categorize,
        alert_threshold, rollover_unused, color_hex
    )
    SELECT
        target_user_id,
        budget_name,
        'Създаден от шаблон: ' || template_name,
        start_date,
        end_date,
        total_budget,
        currency,
        budget_type,
        auto_categorize,
        alert_threshold,
        rollover_unused,
        color_hex
    FROM public.budgets
    WHERE id = template_id AND is_template = TRUE
    RETURNING id INTO new_budget_id;

    -- Копираме бюджетните линии
    FOR budget_line IN
        SELECT * FROM public.budget_lines
        WHERE budget_id = template_id
    LOOP
        INSERT INTO public.budget_lines (
            budget_id, category_id, name, description,
            allocated_amount, currency, auto_match_rules,
            include_subcategories, warning_threshold,
            critical_threshold, sort_order, is_fixed, color_hex
        ) VALUES (
            new_budget_id,
            budget_line.category_id,
            budget_line.name,
            budget_line.description,
            budget_line.allocated_amount,
            budget_line.currency,
            budget_line.auto_match_rules,
            budget_line.include_subcategories,
            budget_line.warning_threshold,
            budget_line.critical_threshold,
            budget_line.sort_order,
            budget_line.is_fixed,
            budget_line.color_hex
        );
    END LOOP;

    RETURN new_budget_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ИНДЕКСИ ЗА ПРОИЗВОДИТЕЛНОСТ
-- ========================================

-- Бюджети
CREATE INDEX idx_budgets_user_id ON public.budgets(user_id);
CREATE INDEX idx_budgets_user_status ON public.budgets(user_id, status);
CREATE INDEX idx_budgets_date_range ON public.budgets(start_date, end_date);
CREATE INDEX idx_budgets_templates ON public.budgets(is_template, template_name);

-- Бюджетни линии
CREATE INDEX idx_budget_lines_budget_id ON public.budget_lines(budget_id);
CREATE INDEX idx_budget_lines_category_id ON public.budget_lines(category_id);
CREATE INDEX idx_budget_lines_sort_order ON public.budget_lines(budget_id, sort_order);

-- Composite индекс за бързо търсене
CREATE INDEX idx_budget_lines_budget_category ON public.budget_lines(budget_id, category_id);

-- ========================================
-- ПРОВЕРКИ ЗА ВАЛИДНОСТ
-- ========================================

-- Проверка за валидни дати
ALTER TABLE public.budgets
    ADD CONSTRAINT check_valid_date_range
    CHECK (start_date <= end_date);

-- Проверка за положителни суми
ALTER TABLE public.budgets
    ADD CONSTRAINT check_positive_total_budget
    CHECK (total_budget > 0);

ALTER TABLE public.budget_lines
    ADD CONSTRAINT check_positive_allocated_amount
    CHECK (allocated_amount >= 0);

-- Проверка за валидни прагове
ALTER TABLE public.budgets
    ADD CONSTRAINT check_valid_alert_threshold
    CHECK (alert_threshold >= 0 AND alert_threshold <= 1);

ALTER TABLE public.budget_lines
    ADD CONSTRAINT check_valid_warning_threshold
    CHECK (warning_threshold >= 0 AND warning_threshold <= 1);

ALTER TABLE public.budget_lines
    ADD CONSTRAINT check_valid_critical_threshold
    CHECK (critical_threshold >= 0 AND critical_threshold <= 1);

-- ========================================
-- КОМЕНТАРИ ЗА ДОКУМЕНТАЦИЯ
-- ========================================

COMMENT ON TABLE public.budgets IS 'Бюджети на потребители за контрол на разходи';
COMMENT ON COLUMN public.budgets.auto_categorize IS 'Автоматично категоризиране на нови разходи';
COMMENT ON COLUMN public.budgets.alert_threshold IS 'Праг за предупреждения (0.8 = 80%)';
COMMENT ON COLUMN public.budgets.rollover_unused IS 'Прехвърляне на неизползвани средства в следващия период';

COMMENT ON TABLE public.budget_lines IS 'Линии/категории в бюджета с планирани и изразходвани суми';
COMMENT ON COLUMN public.budget_lines.auto_match_rules IS 'JSON правила за автоматично присвояване на разходи';
COMMENT ON COLUMN public.budget_lines.include_subcategories IS 'Включване на подкатегории в изчисленията';

COMMENT ON VIEW public.spending_summary IS 'Агрегирани данни за разходи по категории и периоди';

-- ========================================
-- ПРАВА ЗА ДОСТЪП
-- ========================================
-- Ще бъдат добавени в migrations за RLS