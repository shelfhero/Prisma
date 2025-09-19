-- ========================================
-- ПРИЗМА - SUPABASE STORAGE НАСТРОЙКА
-- ========================================
-- Миграция 007: Конфигуриране на storage buckets и политики
-- Дата: 2025-01-19
-- Описание: Storage за снимки на касови бележки с оптимизация

-- ========================================
-- СЪЗДАВАНЕ НА STORAGE BUCKETS
-- ========================================

-- Основен bucket за снимки на касови бележки
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipt-images',
    'receipt-images',
    false, -- Не е публичен, изисква се аутентикация
    10485760, -- 10MB лимит
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket за оптимизирани/компресирани изображения
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipt-thumbnails',
    'receipt-thumbnails',
    false,
    2097152, -- 2MB лимит за thumbnails
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ========================================
-- STORAGE RLS ПОЛИТИКИ
-- ========================================

-- RECEIPT-IMAGES BUCKET ПОЛИТИКИ

-- Потребители могат да качват снимки само в своите папки
CREATE POLICY "receipt_images_upload_own" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipt-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
        AND array_length(storage.foldername(name), 1) >= 3 -- receipts/user_id/receipt_id/
    );

-- Потребители могат да четат само своите снимки
CREATE POLICY "receipt_images_select_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipt-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Потребители могат да изтриват само своите снимки
CREATE POLICY "receipt_images_delete_own" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'receipt-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Потребители могат да обновяват metadata на своите снимки
CREATE POLICY "receipt_images_update_own" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'receipt-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- RECEIPT-THUMBNAILS BUCKET ПОЛИТИКИ

-- Системата може да създава thumbnails
CREATE POLICY "receipt_thumbnails_system_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'receipt-thumbnails'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Потребители могат да четат своите thumbnails
CREATE POLICY "receipt_thumbnails_select_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipt-thumbnails'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Системата може да изтрива thumbnails
CREATE POLICY "receipt_thumbnails_system_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'receipt-thumbnails'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ========================================
-- ФУНКЦИИ ЗА РАБОТА СЪС STORAGE
-- ========================================

-- Функция за генериране на storage път
CREATE OR REPLACE FUNCTION generate_receipt_storage_path(
    user_id UUID,
    receipt_id UUID,
    file_extension TEXT DEFAULT 'jpg'
)
RETURNS TEXT AS $$
BEGIN
    RETURN format(
        'receipts/%s/%s/image_%s.%s',
        user_id::text,
        receipt_id::text,
        extract(epoch from now())::bigint,
        file_extension
    );
END;
$$ LANGUAGE plpgsql;

-- Функция за генериране на thumbnail път
CREATE OR REPLACE FUNCTION generate_thumbnail_path(
    original_path TEXT,
    size TEXT DEFAULT 'medium'
)
RETURNS TEXT AS $$
BEGIN
    RETURN regexp_replace(
        original_path,
        '(\.[^.]+)$',
        format('_%s\1', size)
    );
END;
$$ LANGUAGE plpgsql;

-- Функция за получаване на публичен URL (временен)
CREATE OR REPLACE FUNCTION get_receipt_image_url(
    storage_path TEXT,
    expires_in INTEGER DEFAULT 3600 -- 1 час
)
RETURNS TEXT AS $$
DECLARE
    signed_url TEXT;
BEGIN
    -- Това ще работи само в production с правилната конфигурация
    -- За development може да се използва direct URL
    SELECT storage.create_signed_url('receipt-images', storage_path, expires_in)
    INTO signed_url;

    RETURN signed_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGER ФУНКЦИИ ЗА АВТОМАТИЧНО УПРАВЛЕНИЕ
-- ========================================

-- Автоматично изтриване на файлове при изтриване на запис
CREATE OR REPLACE FUNCTION cleanup_receipt_images()
RETURNS TRIGGER AS $$
BEGIN
    -- Изтриване на всички снимки за касовата бележка
    DELETE FROM storage.objects
    WHERE bucket_id = 'receipt-images'
    AND name LIKE 'receipts/' || OLD.user_id::text || '/' || OLD.id::text || '/%';

    -- Изтриване на thumbnails
    DELETE FROM storage.objects
    WHERE bucket_id = 'receipt-thumbnails'
    AND name LIKE 'receipts/' || OLD.user_id::text || '/' || OLD.id::text || '/%';

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger за автоматично изтриване при изтриване на касова бележка
CREATE TRIGGER cleanup_receipt_images_trigger
    AFTER DELETE ON public.receipts
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_receipt_images();

-- Автоматично изтриване на конкретна снимка
CREATE OR REPLACE FUNCTION cleanup_single_receipt_image()
RETURNS TRIGGER AS $$
BEGIN
    -- Изтриване на основната снимка
    DELETE FROM storage.objects
    WHERE bucket_id = 'receipt-images'
    AND name = OLD.storage_path;

    -- Изтриване на thumbnail (ако съществува)
    DELETE FROM storage.objects
    WHERE bucket_id = 'receipt-thumbnails'
    AND name = generate_thumbnail_path(OLD.storage_path);

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger за автоматично изтриване при изтриване на снимка
CREATE TRIGGER cleanup_single_receipt_image_trigger
    AFTER DELETE ON public.receipt_images
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_single_receipt_image();

-- ========================================
-- ФУНКЦИИ ЗА ОПТИМИЗАЦИЯ НА ИЗОБРАЖЕНИЯ
-- ========================================

-- Функция за създаване на thumbnail (ще се използва от background job)
CREATE OR REPLACE FUNCTION create_thumbnail_job(
    original_path TEXT,
    target_width INTEGER DEFAULT 300,
    target_height INTEGER DEFAULT 400
)
RETURNS JSON AS $$
DECLARE
    job_data JSON;
BEGIN
    -- Създаваме job data за обработка на изображението
    job_data := json_build_object(
        'action', 'create_thumbnail',
        'original_path', original_path,
        'thumbnail_path', generate_thumbnail_path(original_path, 'medium'),
        'target_width', target_width,
        'target_height', target_height,
        'bucket_id', 'receipt-images',
        'target_bucket_id', 'receipt-thumbnails',
        'created_at', now()
    );

    -- В production това ще се изпрати към queue system
    -- За сега просто връщаме job data
    RETURN job_data;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- STORAGE STATISTICS И МОНИТОРИНГ
-- ========================================

-- Вю за статистики на storage употребата
CREATE VIEW public.storage_usage_stats AS
SELECT
    auth.users.id as user_id,
    profiles.full_name,
    COUNT(objects.id) as total_files,
    SUM(objects.metadata->>'size')::bigint as total_size_bytes,
    pg_size_pretty(SUM(objects.metadata->>'size')::bigint) as total_size_human,
    COUNT(CASE WHEN objects.bucket_id = 'receipt-images' THEN 1 END) as receipt_images_count,
    COUNT(CASE WHEN objects.bucket_id = 'receipt-thumbnails' THEN 1 END) as thumbnails_count,
    MAX(objects.created_at) as last_upload
FROM auth.users
LEFT JOIN public.profiles ON profiles.id = auth.users.id
LEFT JOIN storage.objects ON (storage.foldername(objects.name))[1] = auth.users.id::text
WHERE objects.bucket_id IN ('receipt-images', 'receipt-thumbnails')
GROUP BY auth.users.id, profiles.full_name;

-- Вю за най-големи файлове
CREATE VIEW public.large_files_report AS
SELECT
    (storage.foldername(name))[1] as user_id,
    name as file_path,
    bucket_id,
    (metadata->>'size')::bigint as size_bytes,
    pg_size_pretty((metadata->>'size')::bigint) as size_human,
    metadata->>'mimetype' as mime_type,
    created_at
FROM storage.objects
WHERE bucket_id IN ('receipt-images', 'receipt-thumbnails')
AND (metadata->>'size')::bigint > 5242880 -- Файлове над 5MB
ORDER BY (metadata->>'size')::bigint DESC;

-- ========================================
-- CLEANUP ОПЕРАЦИИ
-- ========================================

-- Функция за изтриване на стари файлове
CREATE OR REPLACE FUNCTION cleanup_old_receipts(
    days_old INTEGER DEFAULT 365
)
RETURNS TABLE(deleted_files INTEGER, freed_bytes BIGINT) AS $$
DECLARE
    deleted_count INTEGER := 0;
    freed_space BIGINT := 0;
    file_record RECORD;
BEGIN
    -- Намираме старите файлове
    FOR file_record IN
        SELECT objects.name, (objects.metadata->>'size')::bigint as file_size
        FROM storage.objects
        WHERE bucket_id IN ('receipt-images', 'receipt-thumbnails')
        AND created_at < NOW() - INTERVAL '1 day' * days_old
    LOOP
        -- Изтриваме файла
        DELETE FROM storage.objects
        WHERE name = file_record.name;

        deleted_count := deleted_count + 1;
        freed_space := freed_space + COALESCE(file_record.file_size, 0);
    END LOOP;

    RETURN QUERY SELECT deleted_count, freed_space;
END;
$$ LANGUAGE plpgsql;

-- Функция за изтриване на осиротели файлове
CREATE OR REPLACE FUNCTION cleanup_orphaned_files()
RETURNS TABLE(deleted_files INTEGER) AS $$
DECLARE
    deleted_count INTEGER := 0;
    file_record RECORD;
BEGIN
    -- Намираме файлове без съответни записи в receipt_images
    FOR file_record IN
        SELECT objects.name
        FROM storage.objects
        WHERE bucket_id = 'receipt-images'
        AND NOT EXISTS (
            SELECT 1 FROM public.receipt_images
            WHERE storage_path = objects.name
        )
    LOOP
        -- Изтриваме осиротелия файл
        DELETE FROM storage.objects
        WHERE name = file_record.name;

        deleted_count := deleted_count + 1;
    END LOOP;

    RETURN QUERY SELECT deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- КОНФИГУРАЦИЯ ЗА COMPRESSION
-- ========================================

-- Настройки за автоматична компресия (ще се конфигурират в Supabase Dashboard)
/*
В Supabase Dashboard > Storage > Settings:

1. Image Optimization: Enable
2. Quality: 80%
3. Progressive JPEG: Enable
4. Auto WebP: Enable для браузъри което го поддържат
5. Resize limits:
   - Max width: 2048px
   - Max height: 2048px
6. File size limits:
   - Original: 10MB
   - Compressed: 5MB
*/

-- ========================================
-- BACKUP И СИНХРОНИЗАЦИЯ
-- ========================================

-- Функция за backup на storage metadata
CREATE OR REPLACE FUNCTION backup_storage_metadata()
RETURNS TABLE(
    file_path TEXT,
    bucket_id TEXT,
    size_bytes BIGINT,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        objects.name,
        objects.bucket_id,
        (objects.metadata->>'size')::bigint,
        objects.metadata->>'mimetype',
        objects.created_at
    FROM storage.objects
    WHERE bucket_id IN ('receipt-images', 'receipt-thumbnails')
    ORDER BY objects.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- КОМЕНТАРИ ЗА ДОКУМЕНТАЦИЯ
-- ========================================

COMMENT ON FUNCTION generate_receipt_storage_path(UUID, UUID, TEXT) IS 'Генерира уникален storage път за снимка на касова бележка';
COMMENT ON FUNCTION generate_thumbnail_path(TEXT, TEXT) IS 'Генерира път за thumbnail на база оригиналния път';
COMMENT ON FUNCTION get_receipt_image_url(TEXT, INTEGER) IS 'Създава временен подписан URL за достъп до снимка';
COMMENT ON FUNCTION cleanup_old_receipts(INTEGER) IS 'Изтрива стари файлове и връща статистики';
COMMENT ON FUNCTION cleanup_orphaned_files() IS 'Изтрива файлове без съответни записи в базата данни';

COMMENT ON VIEW public.storage_usage_stats IS 'Статистики за употреба на storage по потребители';
COMMENT ON VIEW public.large_files_report IS 'Отчет за най-големите файлове в системата';

-- ========================================
-- ПРАВА ЗА ДОСТЪП
-- ========================================

-- Даваме права на authenticated потребители да използват storage функциите
GRANT EXECUTE ON FUNCTION generate_receipt_storage_path(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_thumbnail_path(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_receipt_image_url(TEXT, INTEGER) TO authenticated;

-- Ограничаваме cleanup функциите само до service_role
GRANT EXECUTE ON FUNCTION cleanup_old_receipts(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_files() TO service_role;
GRANT EXECUTE ON FUNCTION backup_storage_metadata() TO service_role;

-- ========================================
-- ТЕСТОВИ ДАННИ
-- ========================================

-- Ще бъдат добавени при нужда в отделна миграция

/*
ЗАБЕЛЕЖКИ ЗА PRODUCTION DEPLOYMENT:

1. Storage bucket политики трябва да се конфигурират в Supabase Dashboard
2. Image optimization настройки се правят през Dashboard
3. CDN конфигурация за по-бърз достъп до изображения
4. Backup стратегия за storage files
5. Monitoring на storage usage и costs

ПРИМЕРНА УПОТРЕБА:

-- Генериране на storage път
SELECT generate_receipt_storage_path(
    '123e4567-e89b-12d3-a456-426614174000'::uuid,
    '987fcdeb-51a2-43d1-9c07-c78b2a012345'::uuid,
    'jpg'
);

-- Получаване на подписан URL
SELECT get_receipt_image_url(
    'receipts/123e4567-e89b-12d3-a456-426614174000/987fcdeb-51a2-43d1-9c07-c78b2a012345/image_1642680000.jpg',
    3600
);

-- Cleanup операции (admin only)
SELECT * FROM cleanup_old_receipts(365);
SELECT * FROM cleanup_orphaned_files();
*/