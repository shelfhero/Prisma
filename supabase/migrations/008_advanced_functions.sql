-- ========================================
-- ПРИЗМА - РАСШИРЕНИ ФУНКЦИИ И ТРИГЕРИ
-- ========================================
-- Миграция 008: Бизнес логика, автоматизация, отчети
-- Дата: 2025-01-19
-- Описание: Сложни функции за анализ и автоматизация

-- ========================================
-- ФУНКЦИИ ЗА АНАЛИЗ НА РАЗХОДИ
-- ========================================

-- Подробен анализ на разходи по периоди
CREATE OR REPLACE FUNCTION get_spending_analysis(
    p_user_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_category_id UUID DEFAULT NULL
)
RETURNS TABLE(
    period_type TEXT,
    period_date DATE,
    category_name TEXT,
    retailer_name TEXT,
    total_amount DECIMAL(10,2),
    items_count BIGINT,
    avg_receipt_amount DECIMAL(10,2),
    receipts_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH spending_data AS (
        SELECT
            r.purchased_at::date as purchase_date,
            COALESCE(c.name, 'Некатегоризирано') as cat_name,
            COALESCE(ret.name, 'Неизвестен') as ret_name,
            i.total_price,
            r.total_amount as receipt_total,
            r.id as receipt_id
        FROM public.receipts r
        JOIN public.items i ON r.id = i.receipt_id
        LEFT JOIN public.categories c ON i.category_id = c.id
        LEFT JOIN public.retailers ret ON r.retailer_id = ret.id
        WHERE r.user_id = p_user_id
        AND r.purchased_at::date BETWEEN p_start_date AND p_end_date
        AND r.processing_status = 'completed'
        AND (p_category_id IS NULL OR i.category_id = p_category_id)
    )
    SELECT
        'daily'::text,
        sd.purchase_date,
        sd.cat_name,
        sd.ret_name,
        SUM(sd.total_price)::decimal(10,2),
        COUNT(*)::bigint,
        AVG(sd.receipt_total)::decimal(10,2),
        COUNT(DISTINCT sd.receipt_id)::bigint
    FROM spending_data sd
    GROUP BY sd.purchase_date, sd.cat_name, sd.ret_name
    ORDER BY sd.purchase_date DESC, SUM(sd.total_price) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Сравнение на цени между търговци
CREATE OR REPLACE FUNCTION compare_prices_across_retailers(
    p_product_name TEXT DEFAULT NULL,
    p_barcode VARCHAR(50) DEFAULT NULL,
    p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    product_name TEXT,
    barcode VARCHAR(50),
    retailer_name TEXT,
    avg_price DECIMAL(10,4),
    min_price DECIMAL(10,4),
    max_price DECIMAL(10,4),
    sample_count BIGINT,
    last_seen DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ps.normalized_name,
        ps.barcode,
        COALESCE(r.name, 'Неизвестен') as retailer_name,
        AVG(ps.unit_price)::decimal(10,4),
        MIN(ps.unit_price)::decimal(10,4),
        MAX(ps.unit_price)::decimal(10,4),
        COUNT(*)::bigint,
        MAX(ps.snapshot_date)
    FROM public.price_snapshots ps
    LEFT JOIN public.retailers r ON ps.retailer_id = r.id
    WHERE ps.snapshot_date >= CURRENT_DATE - INTERVAL '1 day' * p_days_back
    AND (p_product_name IS NULL OR ps.normalized_name ILIKE '%' || LOWER(p_product_name) || '%')
    AND (p_barcode IS NULL OR ps.barcode = p_barcode)
    GROUP BY ps.normalized_name, ps.barcode, r.name
    HAVING COUNT(*) >= 2 -- Поне 2 наблюдения
    ORDER BY ps.normalized_name, AVG(ps.unit_price);
END;
$$ LANGUAGE plpgsql;

-- Топ продукти по разходи за потребител
CREATE OR REPLACE FUNCTION get_top_products_by_spending(
    p_user_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
    product_name TEXT,
    barcode VARCHAR(50),
    category_name TEXT,
    total_spent DECIMAL(10,2),
    total_quantity DECIMAL(8,3),
    avg_unit_price DECIMAL(10,4),
    purchase_count BIGINT,
    last_purchase DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.normalized_name,
        i.barcode,
        COALESCE(c.name, 'Некатегоризирано') as cat_name,
        SUM(i.total_price)::decimal(10,2),
        SUM(i.qty)::decimal(8,3),
        AVG(i.unit_price)::decimal(10,4),
        COUNT(*)::bigint,
        MAX(r.purchased_at::date)
    FROM public.items i
    JOIN public.receipts r ON i.receipt_id = r.id
    LEFT JOIN public.categories c ON i.category_id = c.id
    WHERE r.user_id = p_user_id
    AND r.purchased_at::date BETWEEN p_start_date AND p_end_date
    AND r.processing_status = 'completed'
    GROUP BY i.normalized_name, i.barcode, c.name
    ORDER BY SUM(i.total_price) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ФУНКЦИИ ЗА БЮДЖЕТЕН АНАЛИЗ
-- ========================================

-- Детайлен статус на бюджет
CREATE OR REPLACE FUNCTION get_budget_status(
    p_budget_id UUID
)
RETURNS TABLE(
    budget_name TEXT,
    total_budget DECIMAL(12,2),
    total_allocated DECIMAL(12,2),
    total_spent DECIMAL(12,2),
    remaining_budget DECIMAL(12,2),
    days_remaining INTEGER,
    daily_budget_remaining DECIMAL(10,2),
    overall_progress DECIMAL(5,2),
    status TEXT
) AS $$
DECLARE
    budget_record RECORD;
    total_alloc DECIMAL(12,2);
    total_sp DECIMAL(12,2);
    days_rem INTEGER;
BEGIN
    -- Получаваме основната информация за бюджета
    SELECT * INTO budget_record
    FROM public.budgets
    WHERE id = p_budget_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Бюджет с ID % не е намерен', p_budget_id;
    END IF;

    -- Изчисляваме общо планираните средства
    SELECT COALESCE(SUM(allocated_amount), 0) INTO total_alloc
    FROM public.budget_lines
    WHERE budget_id = p_budget_id;

    -- Изчисляваме общо изразходваните средства
    SELECT COALESCE(SUM(spent_amount), 0) INTO total_sp
    FROM public.budget_lines
    WHERE budget_id = p_budget_id;

    -- Изчисляваме оставащите дни
    days_rem := GREATEST(0, (budget_record.end_date - CURRENT_DATE)::INTEGER);

    RETURN QUERY
    SELECT
        budget_record.name,
        budget_record.total_budget,
        total_alloc,
        total_sp,
        budget_record.total_budget - total_sp,
        days_rem,
        CASE
            WHEN days_rem > 0 THEN (budget_record.total_budget - total_sp) / days_rem
            ELSE 0
        END::decimal(10,2),
        CASE
            WHEN budget_record.total_budget > 0
            THEN (total_sp / budget_record.total_budget * 100)::decimal(5,2)
            ELSE 0
        END,
        CASE
            WHEN total_sp > budget_record.total_budget THEN 'превишен'
            WHEN total_sp > budget_record.total_budget * budget_record.alert_threshold THEN 'предупреждение'
            WHEN CURRENT_DATE > budget_record.end_date THEN 'изтекъл'
            ELSE 'активен'
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Прогноза за бюджет на база текущите тенденции
CREATE OR REPLACE FUNCTION forecast_budget_spending(
    p_budget_id UUID
)
RETURNS TABLE(
    category_name TEXT,
    allocated_amount DECIMAL(10,2),
    spent_amount DECIMAL(10,2),
    projected_total DECIMAL(10,2),
    projected_overspend DECIMAL(10,2),
    daily_avg DECIMAL(10,2),
    days_to_depletion INTEGER
) AS $$
DECLARE
    budget_record RECORD;
    days_elapsed INTEGER;
    days_total INTEGER;
BEGIN
    -- Получаваме информация за бюджета
    SELECT * INTO budget_record
    FROM public.budgets
    WHERE id = p_budget_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Бюджет с ID % не е намерен', p_budget_id;
    END IF;

    days_elapsed := GREATEST(1, (CURRENT_DATE - budget_record.start_date)::INTEGER);
    days_total := (budget_record.end_date - budget_record.start_date)::INTEGER + 1;

    RETURN QUERY
    WITH spending_analysis AS (
        SELECT
            bl.name,
            bl.allocated_amount,
            bl.spent_amount,
            bl.spent_amount / GREATEST(days_elapsed, 1) as daily_avg_spending,
            bl.allocated_amount - bl.spent_amount as remaining_amount
        FROM public.budget_lines bl
        WHERE bl.budget_id = p_budget_id
    )
    SELECT
        sa.name,
        sa.allocated_amount,
        sa.spent_amount,
        (sa.daily_avg_spending * days_total)::decimal(10,2),
        GREATEST(0, sa.daily_avg_spending * days_total - sa.allocated_amount)::decimal(10,2),
        sa.daily_avg_spending::decimal(10,2),
        CASE
            WHEN sa.daily_avg_spending > 0
            THEN (sa.remaining_amount / sa.daily_avg_spending)::INTEGER
            ELSE NULL
        END
    FROM spending_analysis sa
    ORDER BY sa.allocated_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ФУНКЦИИ ЗА АВТОМАТИЗАЦИЯ
-- ========================================

-- Автоматично създаване на профил при нов потребител
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger за автоматично създаване на профил
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Автоматично категоризиране на нови артикули
CREATE OR REPLACE FUNCTION auto_categorize_new_item()
RETURNS TRIGGER AS $$
DECLARE
    suggested_category_id UUID;
BEGIN
    -- Ако вече има категория, не правим нищо
    IF NEW.category_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Търсим категория на база на името на продукта
    SELECT auto_categorize_product(NEW.product_name) INTO suggested_category_id;

    -- Ако намерим предложение, задаваме категорията
    IF suggested_category_id IS NOT NULL THEN
        NEW.category_id := suggested_category_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger за автоматично категоризиране
CREATE TRIGGER auto_categorize_item_trigger
    BEFORE INSERT ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION auto_categorize_new_item();

-- Автоматично уведомяване при превишаване на бюджет
CREATE OR REPLACE FUNCTION check_budget_alerts()
RETURNS TRIGGER AS $$
DECLARE
    budget_line RECORD;
    budget_record RECORD;
    usage_pct DECIMAL(5,2);
BEGIN
    -- Проверяваме всички бюджетни линии за новия артикул
    FOR budget_line IN
        SELECT bl.*, b.name as budget_name, b.user_id
        FROM public.budget_lines bl
        JOIN public.budgets b ON bl.budget_id = b.id
        WHERE b.status = 'active'
        AND b.user_id = (
            SELECT user_id FROM public.receipts WHERE id = NEW.receipt_id
        )
        AND (bl.category_id = NEW.category_id OR
             (bl.include_subcategories = TRUE AND EXISTS(
                 SELECT 1 FROM public.categories
                 WHERE parent_id = bl.category_id AND id = NEW.category_id
             )))
    LOOP
        -- Изчисляваме процент на използване
        usage_pct := (budget_line.spent_amount / budget_line.allocated_amount) * 100;

        -- Ако е превишен прагът за предупреждение
        IF usage_pct >= budget_line.warning_threshold * 100 THEN
            -- Тук може да се добави логика за изпращане на уведомления
            -- За сега просто логваме в системния лог
            RAISE NOTICE 'Бюджет "%" превиши прага: %.2f%% от %',
                budget_line.name, usage_pct, budget_line.allocated_amount;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger за проверка на бюджетни алерти
CREATE TRIGGER budget_alert_trigger
    AFTER INSERT OR UPDATE ON public.items
    FOR EACH ROW
    EXECUTE FUNCTION check_budget_alerts();

-- ========================================
-- ФУНКЦИИ ЗА ОТЧЕТНОСТ
-- ========================================

-- Месечен отчет за потребител
CREATE OR REPLACE FUNCTION generate_monthly_report(
    p_user_id UUID,
    p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
)
RETURNS TABLE(
    report_section TEXT,
    metric_name TEXT,
    metric_value TEXT,
    comparison_value TEXT,
    trend TEXT
) AS $$
DECLARE
    current_start DATE;
    current_end DATE;
    previous_start DATE;
    previous_end DATE;
    total_current DECIMAL(10,2);
    total_previous DECIMAL(10,2);
    receipts_current INTEGER;
    receipts_previous INTEGER;
BEGIN
    -- Определяме датовите диапазони
    current_start := DATE(p_year || '-' || p_month || '-01');
    current_end := (current_start + INTERVAL '1 month' - INTERVAL '1 day')::date;
    previous_start := (current_start - INTERVAL '1 month')::date;
    previous_end := (current_start - INTERVAL '1 day')::date;

    -- Общи показатели
    SELECT COALESCE(SUM(total_amount), 0) INTO total_current
    FROM public.receipts
    WHERE user_id = p_user_id
    AND purchased_at::date BETWEEN current_start AND current_end
    AND processing_status = 'completed';

    SELECT COALESCE(SUM(total_amount), 0) INTO total_previous
    FROM public.receipts
    WHERE user_id = p_user_id
    AND purchased_at::date BETWEEN previous_start AND previous_end
    AND processing_status = 'completed';

    SELECT COUNT(*) INTO receipts_current
    FROM public.receipts
    WHERE user_id = p_user_id
    AND purchased_at::date BETWEEN current_start AND current_end
    AND processing_status = 'completed';

    SELECT COUNT(*) INTO receipts_previous
    FROM public.receipts
    WHERE user_id = p_user_id
    AND purchased_at::date BETWEEN previous_start AND previous_end
    AND processing_status = 'completed';

    -- Връщаме резултатите
    RETURN QUERY
    SELECT
        'Общи показатели'::text,
        'Общо разходи'::text,
        total_current::text || ' лв',
        total_previous::text || ' лв',
        CASE
            WHEN total_previous > 0 THEN
                CASE
                    WHEN total_current > total_previous THEN '↗ +' || ROUND((total_current - total_previous) / total_previous * 100, 1)::text || '%'
                    WHEN total_current < total_previous THEN '↘ -' || ROUND((total_previous - total_current) / total_previous * 100, 1)::text || '%'
                    ELSE '→ без промяна'
                END
            ELSE '🆕 нови данни'
        END;

    RETURN QUERY
    SELECT
        'Общи показатели'::text,
        'Брой касови бележки'::text,
        receipts_current::text,
        receipts_previous::text,
        CASE
            WHEN receipts_previous > 0 THEN
                CASE
                    WHEN receipts_current > receipts_previous THEN '↗ +' || (receipts_current - receipts_previous)::text
                    WHEN receipts_current < receipts_previous THEN '↘ -' || (receipts_previous - receipts_current)::text
                    ELSE '→ без промяна'
                END
            ELSE '🆕 ' || receipts_current::text
        END;

    -- Топ категории за текущия месец
    RETURN QUERY
    SELECT
        'Топ категории'::text,
        COALESCE(c.name, 'Некатегоризирано'),
        ROUND(SUM(i.total_price), 2)::text || ' лв',
        COUNT(i.id)::text || ' продукта',
        '📊'
    FROM public.items i
    JOIN public.receipts r ON i.receipt_id = r.id
    LEFT JOIN public.categories c ON i.category_id = c.id
    WHERE r.user_id = p_user_id
    AND r.purchased_at::date BETWEEN current_start AND current_end
    AND r.processing_status = 'completed'
    GROUP BY c.name
    ORDER BY SUM(i.total_price) DESC
    LIMIT 5;

    -- Топ търговци
    RETURN QUERY
    SELECT
        'Топ търговци'::text,
        COALESCE(ret.name, 'Неизвестен'),
        ROUND(SUM(r.total_amount), 2)::text || ' лв',
        COUNT(r.id)::text || ' посещения',
        '🏪'
    FROM public.receipts r
    LEFT JOIN public.retailers ret ON r.retailer_id = ret.id
    WHERE r.user_id = p_user_id
    AND r.purchased_at::date BETWEEN current_start AND current_end
    AND r.processing_status = 'completed'
    GROUP BY ret.name
    ORDER BY SUM(r.total_amount) DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ФУНКЦИИ ЗА ДУБЛИРАНЕ И MERGE
-- ========================================

-- Намиране на дублирани продукти
CREATE OR REPLACE FUNCTION find_duplicate_products(
    p_user_id UUID DEFAULT NULL,
    p_similarity_threshold REAL DEFAULT 0.7
)
RETURNS TABLE(
    product_1_id UUID,
    product_1_name TEXT,
    product_2_id UUID,
    product_2_name TEXT,
    similarity_score REAL,
    suggested_action TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_items AS (
        SELECT DISTINCT
            i.id,
            i.product_name,
            i.normalized_name,
            i.barcode
        FROM public.items i
        JOIN public.receipts r ON i.receipt_id = r.id
        WHERE (p_user_id IS NULL OR r.user_id = p_user_id)
    )
    SELECT
        i1.id,
        i1.product_name,
        i2.id,
        i2.product_name,
        similarity(i1.normalized_name, i2.normalized_name),
        CASE
            WHEN i1.barcode IS NOT NULL AND i2.barcode IS NOT NULL AND i1.barcode = i2.barcode THEN 'merge_identical'
            WHEN similarity(i1.normalized_name, i2.normalized_name) > 0.9 THEN 'merge_likely'
            ELSE 'review_manual'
        END::text
    FROM user_items i1
    JOIN user_items i2 ON i1.id < i2.id -- Избягваме дублиране на двойки
    WHERE (
        (i1.barcode IS NOT NULL AND i2.barcode IS NOT NULL AND i1.barcode = i2.barcode) OR
        similarity(i1.normalized_name, i2.normalized_name) >= p_similarity_threshold
    )
    ORDER BY similarity(i1.normalized_name, i2.normalized_name) DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ФУНКЦИИ ЗА ПРОИЗВОДИТЕЛНОСТ
-- ========================================

-- Обновяване на статистики и vacuum
CREATE OR REPLACE FUNCTION maintenance_update_stats()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- Обновяваме статистиките
    ANALYZE public.receipts;
    ANALYZE public.items;
    ANALYZE public.price_snapshots;
    ANALYZE public.budgets;
    ANALYZE public.budget_lines;

    result := result || 'Statistics updated for all tables' || E'\n';

    -- Vacuum на най-активните таблици
    VACUUM (ANALYZE) public.items;
    VACUUM (ANALYZE) public.price_snapshots;

    result := result || 'Vacuum completed for active tables' || E'\n';

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ФУНКЦИИ ЗА MIGRATION И UPGRADE
-- ========================================

-- Функция за migrate на стари данни
CREATE OR REPLACE FUNCTION migrate_legacy_data()
RETURNS TEXT AS $$
DECLARE
    affected_rows INTEGER := 0;
    result TEXT := '';
BEGIN
    -- Нормализиране на имена на продукти, ако не са нормализирани
    UPDATE public.items
    SET normalized_name = LOWER(TRIM(REGEXP_REPLACE(product_name, '[^\w\s]', '', 'g')))
    WHERE normalized_name IS NULL OR normalized_name = '';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    result := result || 'Normalized ' || affected_rows || ' item names' || E'\n';

    -- Автоматично категоризиране на некатегоризирани продукти
    WITH categorized_items AS (
        UPDATE public.items
        SET category_id = auto_categorize_product(product_name)
        WHERE category_id IS NULL
        AND auto_categorize_product(product_name) IS NOT NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO affected_rows FROM categorized_items;

    result := result || 'Auto-categorized ' || affected_rows || ' items' || E'\n';

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- КОМЕНТАРИ ЗА ДОКУМЕНТАЦИЯ
-- ========================================

COMMENT ON FUNCTION get_spending_analysis(UUID, DATE, DATE, UUID) IS 'Детайлен анализ на разходи по периоди и категории';
COMMENT ON FUNCTION compare_prices_across_retailers(TEXT, VARCHAR, INTEGER) IS 'Сравнение на цени между различни търговци';
COMMENT ON FUNCTION get_top_products_by_spending(UUID, DATE, DATE, INTEGER) IS 'Топ продукти по разходи за потребител';
COMMENT ON FUNCTION get_budget_status(UUID) IS 'Детайлен статус на бюджет с прогрези и препоръки';
COMMENT ON FUNCTION forecast_budget_spending(UUID) IS 'Прогноза за бюджетни разходи на база текущите тенденции';
COMMENT ON FUNCTION generate_monthly_report(UUID, INTEGER, INTEGER) IS 'Генерира подробен месечен отчет за потребител';

-- ========================================
-- ПРАВА ЗА ДОСТЪП
-- ========================================

-- Функции за анализ - достъпни за authenticated потребители
GRANT EXECUTE ON FUNCTION get_spending_analysis(UUID, DATE, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION compare_prices_across_retailers(TEXT, VARCHAR, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products_by_spending(UUID, DATE, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_budget_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION forecast_budget_spending(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_monthly_report(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION find_duplicate_products(UUID, REAL) TO authenticated;

-- Maintenance функции - само за service_role
GRANT EXECUTE ON FUNCTION maintenance_update_stats() TO service_role;
GRANT EXECUTE ON FUNCTION migrate_legacy_data() TO service_role;