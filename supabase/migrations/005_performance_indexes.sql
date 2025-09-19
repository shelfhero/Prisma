-- ========================================
-- ПРИЗМА - ДОПЪЛНИТЕЛНИ ИНДЕКСИ ЗА ПРОИЗВОДИТЕЛНОСТ
-- ========================================
-- Миграция 005: Специализирани индекси за често използвани заявки
-- Дата: 2025-01-19
-- Описание: Оптимизация на базата данни за високопроизводителни заявки

-- ========================================
-- ИНДЕКСИ ЗА ТЪРСЕНЕ И ФИЛТРИРАНЕ
-- ========================================

-- Пълнотекстово търсене в имена на продукти
-- Комбинира GIN индекс с триграми за бързо търсене
CREATE INDEX CONCURRENTLY idx_items_fulltext_search ON public.items
    USING gin(
        to_tsvector('bulgarian', product_name) gin_tsvector_ops,
        normalized_name gin_trgm_ops
    );

-- Търсене по баркод с частично съвпадение
CREATE INDEX CONCURRENTLY idx_items_barcode_pattern ON public.items(barcode text_pattern_ops)
    WHERE barcode IS NOT NULL;

-- Търсене в бележки на касови бележки
CREATE INDEX CONCURRENTLY idx_receipts_notes_search ON public.receipts
    USING gin(to_tsvector('bulgarian', notes))
    WHERE notes IS NOT NULL;

-- ========================================
-- ИНДЕКСИ ЗА АНАЛИЗ НА РАЗХОДИ
-- ========================================

-- Анализ на разходи по месеци за конкретен потребител
CREATE INDEX CONCURRENTLY idx_receipts_user_monthly_analysis ON public.receipts(
    user_id,
    DATE_TRUNC('month', purchased_at),
    total_amount
) WHERE processing_status = 'completed';

-- Анализ на разходи по търговци и дати
CREATE INDEX CONCURRENTLY idx_receipts_retailer_date_analysis ON public.receipts(
    retailer_id,
    purchased_at,
    total_amount
) WHERE processing_status = 'completed';

-- Анализ на продукти по категории и цени
CREATE INDEX CONCURRENTLY idx_items_category_price_analysis ON public.items(
    category_id,
    unit_price,
    total_price,
    created_at
) WHERE category_id IS NOT NULL;

-- ========================================
-- ИНДЕКСИ ЗА ЦЕНОВО СРАВНЕНИЕ
-- ========================================

-- Ценови тенденции по продукти и търговци
CREATE INDEX CONCURRENTLY idx_price_snapshots_trending ON public.price_snapshots(
    normalized_name,
    retailer_id,
    snapshot_date DESC,
    unit_price
);

-- Най-евтини цени по баркод
CREATE INDEX CONCURRENTLY idx_price_snapshots_cheapest ON public.price_snapshots(
    barcode,
    unit_price ASC,
    snapshot_date DESC
) WHERE barcode IS NOT NULL;

-- Средни цени по категории
CREATE INDEX CONCURRENTLY idx_price_snapshots_category_avg ON public.price_snapshots(
    category_id,
    snapshot_date,
    unit_price
) WHERE category_id IS NOT NULL;

-- ========================================
-- ИНДЕКСИ ЗА БЮДЖЕТНИ ЗАЯВКИ
-- ========================================

-- Активни бюджети с датови диапазони
CREATE INDEX CONCURRENTLY idx_budgets_active_daterange ON public.budgets(
    user_id,
    status,
    start_date,
    end_date
) WHERE status = 'active';

-- Бюджетни линии с процент на използване
CREATE INDEX CONCURRENTLY idx_budget_lines_usage ON public.budget_lines(
    budget_id,
    usage_percentage DESC,
    remaining_amount
);

-- Превишени бюджети (за алерти)
CREATE INDEX CONCURRENTLY idx_budget_lines_exceeded ON public.budget_lines(
    budget_id,
    warning_threshold,
    usage_percentage
) WHERE usage_percentage > warning_threshold;

-- ========================================
-- ИНДЕКСИ ЗА DASHBOARD ЗАЯВКИ
-- ========================================

-- Последни касови бележки за потребител
CREATE INDEX CONCURRENTLY idx_receipts_recent_dashboard ON public.receipts(
    user_id,
    purchased_at DESC,
    total_amount
) WHERE processing_status = 'completed'
  AND purchased_at >= CURRENT_DATE - INTERVAL '30 days';

-- Топ категории по разходи
CREATE INDEX CONCURRENTLY idx_items_top_categories ON public.items(
    category_id,
    total_price DESC,
    created_at DESC
) WHERE category_id IS NOT NULL;

-- Топ търговци по честота на покупки
CREATE INDEX CONCURRENTLY idx_receipts_top_retailers ON public.receipts(
    retailer_id,
    purchased_at DESC
) WHERE retailer_id IS NOT NULL
  AND processing_status = 'completed';

-- ========================================
-- ИНДЕКСИ ЗА STORAGE И ФАЙЛОВЕ
-- ========================================

-- Снимки по размер на файл (за cleanup операции)
CREATE INDEX CONCURRENTLY idx_receipt_images_filesize ON public.receipt_images(
    file_size_bytes DESC,
    created_at
) WHERE file_size_bytes IS NOT NULL;

-- Основни снимки за бърз достъп
CREATE INDEX CONCURRENTLY idx_receipt_images_primary_lookup ON public.receipt_images(
    receipt_id,
    is_primary,
    storage_path
) WHERE is_primary = true;

-- ========================================
-- ИНДЕКСИ ЗА ОТЧЕТИ И СТАТИСТИКИ
-- ========================================

-- Месечни отчети по потребители
CREATE INDEX CONCURRENTLY idx_receipts_monthly_reports ON public.receipts(
    user_id,
    DATE_TRUNC('month', purchased_at),
    retailer_id,
    total_amount
) WHERE processing_status = 'completed';

-- Годишни отчети по категории
CREATE INDEX CONCURRENTLY idx_items_yearly_reports ON public.items(
    category_id,
    DATE_TRUNC('year', created_at),
    total_price
) WHERE category_id IS NOT NULL;

-- Сравнение на цени по периоди
CREATE INDEX CONCURRENTLY idx_price_snapshots_period_comparison ON public.price_snapshots(
    normalized_name,
    DATE_TRUNC('month', snapshot_date),
    avg_price,
    min_price,
    max_price
);

-- ========================================
-- ИНДЕКСИ ЗА API PERFORMANCE
-- ========================================

-- Заявки за валидация при качване
CREATE INDEX CONCURRENTLY idx_receipts_validation_lookup ON public.receipts(
    user_id,
    purchased_at,
    total_amount,
    retailer_id
) WHERE processing_status IN ('pending', 'processing');

-- Заявки за автоматично категоризиране
CREATE INDEX CONCURRENTLY idx_items_auto_categorization ON public.items(
    normalized_name,
    category_id,
    barcode
) WHERE category_id IS NOT NULL;

-- ========================================
-- PARTIAL ИНДЕКСИ ЗА СПЕЦИФИЧНИ СЛУЧАИ
-- ========================================

-- Само ръчно въведени касови бележки
CREATE INDEX CONCURRENTLY idx_receipts_manual_only ON public.receipts(
    user_id,
    purchased_at DESC,
    total_amount
) WHERE manual_entry = true;

-- Само неуспешно обработени бележки
CREATE INDEX CONCURRENTLY idx_receipts_failed_processing ON public.receipts(
    user_id,
    created_at DESC,
    processing_status
) WHERE processing_status = 'failed';

-- Продукти без категория (за ръчно категоризиране)
CREATE INDEX CONCURRENTLY idx_items_uncategorized ON public.items(
    receipt_id,
    product_name,
    total_price DESC
) WHERE category_id IS NULL;

-- Дублирани продукти (за merge операции)
CREATE INDEX CONCURRENTLY idx_items_duplicates ON public.items(
    normalized_name,
    barcode,
    unit_price
) WHERE barcode IS NOT NULL;

-- ========================================
-- КОМПОЗИТНИ ИНДЕКСИ ЗА СЛОЖНИ ЗАЯВКИ
-- ========================================

-- Подробен анализ на покупки
CREATE INDEX CONCURRENTLY idx_purchase_analysis_detailed ON public.items(
    category_id,
    qty,
    unit_price,
    total_price,
    created_at
) INCLUDE (product_name, barcode)
  WHERE category_id IS NOT NULL;

-- Ценови анализ по търговци
CREATE INDEX CONCURRENTLY idx_retailer_price_analysis ON public.price_snapshots(
    retailer_id,
    normalized_name,
    snapshot_date DESC,
    unit_price
) INCLUDE (currency, unit_measure);

-- ========================================
-- СТАТИСТИКИ ЗА QUERY PLANNER
-- ========================================

-- Обновяване на статистиките за по-добро планиране на заявки
-- Ще се изпълнява автоматично, но може да се форсира при нужда

-- Увеличаване на статистическите цели за важни колони
ALTER TABLE public.items ALTER COLUMN normalized_name SET STATISTICS 1000;
ALTER TABLE public.receipts ALTER COLUMN purchased_at SET STATISTICS 1000;
ALTER TABLE public.price_snapshots ALTER COLUMN unit_price SET STATISTICS 1000;

-- ========================================
-- МОНИТОРИНГ НА ИНДЕКСИ
-- ========================================

-- Вю за мониторинг на използването на индекси
CREATE VIEW public.index_usage_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        WHEN idx_scan < 1000 THEN 'MEDIUM_USAGE'
        ELSE 'HIGH_USAGE'
    END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Вю за размери на индекси
CREATE VIEW public.index_size_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelname::regclass)) as index_size,
    pg_relation_size(indexrelname::regclass) as index_size_bytes
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelname::regclass) DESC;

-- ========================================
-- ФУНКЦИИ ЗА ПОДДРЪЖКА НА ИНДЕКСИ
-- ========================================

-- Функция за reindex на всички индекси (за maintenance)
CREATE OR REPLACE FUNCTION reindex_all_tables()
RETURNS TEXT AS $$
DECLARE
    table_record RECORD;
    result TEXT := '';
BEGIN
    FOR table_record IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE 'REINDEX TABLE public.' || table_record.tablename;
        result := result || 'Reindexed: ' || table_record.tablename || E'\n';
    END LOOP;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- КОМЕНТАРИ ЗА ДОКУМЕНТАЦИЯ
-- ========================================

COMMENT ON VIEW public.index_usage_stats IS 'Статистики за използване на индекси - полезно за оптимизация';
COMMENT ON VIEW public.index_size_stats IS 'Размери на индекси - полезно за мониторинг на дисковото пространство';
COMMENT ON FUNCTION reindex_all_tables() IS 'Преиндексира всички таблици - използва се за maintenance';

-- ========================================
-- ЗАБЕЛЕЖКИ ЗА ОПТИМИЗАЦИЯ
-- ========================================

/*
ПРЕПОРЪКИ ЗА PRODUCTION:

1. Мониторинг на индекси:
   - Редовно проверявайте pg_stat_user_indexes
   - Премахвайте неизползвани индекси
   - Следете размера на индексите

2. Maintenance операции:
   - VACUUM ANALYZE веднъж седмично
   - REINDEX при фрагментация
   - UPDATE STATISTICS при големи промени

3. Query performance:
   - Използвайте EXPLAIN ANALYZE за тестване
   - Мониторирайте slow queries
   - Оптимизирайте най-честите заявки

4. Disk space management:
   - Следете размера на индексите
   - Архивирайте стари данни
   - Компресирайте неактивни партиции

ПОЛЕЗНИ КОМАНДИ:
- SELECT * FROM public.index_usage_stats;
- SELECT * FROM public.index_size_stats;
- SELECT reindex_all_tables();
*/