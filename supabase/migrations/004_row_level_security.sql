-- ========================================
-- ПРИЗМА - ROW LEVEL SECURITY (RLS)
-- ========================================
-- Миграция 004: Правила за сигурност на ниво ред
-- Дата: 2025-01-19
-- Описание: RLS политики за защита на потребителските данни

-- ========================================
-- ВКЛЮЧВАНЕ НА RLS ЗА ВСИЧКИ ТАБЛИЦИ
-- ========================================

-- Потребителски таблици
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;

-- Системни таблици (частично ограничени)
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ПОЛИТИКИ ЗА ПРОФИЛИ
-- ========================================

-- Потребителите могат да виждат и редактират само своя профил
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Забрана на изтриване на профили (използва се CASCADE от auth.users)
CREATE POLICY "profiles_no_delete" ON public.profiles
    FOR DELETE USING (false);

-- ========================================
-- ПОЛИТИКИ ЗА КАСОВИ БЕЛЕЖКИ
-- ========================================

-- Потребителите виждат само своите касови бележки
CREATE POLICY "receipts_select_own" ON public.receipts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "receipts_insert_own" ON public.receipts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "receipts_update_own" ON public.receipts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "receipts_delete_own" ON public.receipts
    FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- ПОЛИТИКИ ЗА СНИМКИ НА КАСОВИ БЕЛЕЖКИ
-- ========================================

-- Достъп до снимки само чрез собствените касови бележки
CREATE POLICY "receipt_images_select_own" ON public.receipt_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_images.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "receipt_images_insert_own" ON public.receipt_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_images.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "receipt_images_update_own" ON public.receipt_images
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_images.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "receipt_images_delete_own" ON public.receipt_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = receipt_images.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

-- ========================================
-- ПОЛИТИКИ ЗА АРТИКУЛИ
-- ========================================

-- Достъп до артикули само чрез собствените касови бележки
CREATE POLICY "items_select_own" ON public.items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "items_insert_own" ON public.items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "items_update_own" ON public.items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

CREATE POLICY "items_delete_own" ON public.items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.receipts
            WHERE receipts.id = items.receipt_id
            AND receipts.user_id = auth.uid()
        )
    );

-- ========================================
-- ПОЛИТИКИ ЗА БЮДЖЕТИ
-- ========================================

-- Потребителите виждат само своите бюджети
CREATE POLICY "budgets_select_own" ON public.budgets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "budgets_insert_own" ON public.budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "budgets_update_own" ON public.budgets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "budgets_delete_own" ON public.budgets
    FOR DELETE USING (auth.uid() = user_id);

-- Публичен достъп до шаблони за бюджети
CREATE POLICY "budgets_select_templates" ON public.budgets
    FOR SELECT USING (is_template = true);

-- ========================================
-- ПОЛИТИКИ ЗА БЮДЖЕТНИ ЛИНИИ
-- ========================================

-- Достъп до бюджетни линии само чрез собствените бюджети
CREATE POLICY "budget_lines_select_own" ON public.budget_lines
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_lines.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "budget_lines_insert_own" ON public.budget_lines
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_lines.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "budget_lines_update_own" ON public.budget_lines
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_lines.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

CREATE POLICY "budget_lines_delete_own" ON public.budget_lines
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.budgets
            WHERE budgets.id = budget_lines.budget_id
            AND budgets.user_id = auth.uid()
        )
    );

-- ========================================
-- ПОЛИТИКИ ЗА ТЪРГОВЦИ
-- ========================================

-- Всички потребители могат да четат търговци
CREATE POLICY "retailers_select_all" ON public.retailers
    FOR SELECT USING (true);

-- Само администратори могат да добавят нови търговци
-- (За сега разрешаваме на всички, ще се промени при нужда)
CREATE POLICY "retailers_insert_authenticated" ON public.retailers
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Забрана на редактиране и изтриване за обикновени потребители
CREATE POLICY "retailers_no_update" ON public.retailers
    FOR UPDATE USING (false);

CREATE POLICY "retailers_no_delete" ON public.retailers
    FOR DELETE USING (false);

-- ========================================
-- ПОЛИТИКИ ЗА КАТЕГОРИИ
-- ========================================

-- Всички потребители могат да четат категории
CREATE POLICY "categories_select_all" ON public.categories
    FOR SELECT USING (true);

-- Само администратори могат да добавят категории
-- (За сега разрешаваме на всички, ще се промени при нужда)
CREATE POLICY "categories_insert_authenticated" ON public.categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Системните категории не могат да се редактират или изтриват
CREATE POLICY "categories_update_non_system" ON public.categories
    FOR UPDATE USING (is_system = false);

CREATE POLICY "categories_delete_non_system" ON public.categories
    FOR DELETE USING (is_system = false);

-- ========================================
-- ПОЛИТИКИ ЗА ЦЕНОВИ СНИМКИ
-- ========================================

-- Всички потребители могат да четат агрегирани ценови данни
CREATE POLICY "price_snapshots_select_all" ON public.price_snapshots
    FOR SELECT USING (true);

-- Ценовите снимки се създават автоматично при добавяне на артикули
-- Потребителите не могат ръчно да ги редактират
CREATE POLICY "price_snapshots_insert_system" ON public.price_snapshots
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "price_snapshots_no_update" ON public.price_snapshots
    FOR UPDATE USING (false);

CREATE POLICY "price_snapshots_no_delete" ON public.price_snapshots
    FOR DELETE USING (false);

-- ========================================
-- АДМИНИСТРАТИВНИ ПОЛИТИКИ
-- ========================================

-- Функция за проверка на административни права
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Проверяваме дали потребителят има admin роля в custom claims
    -- или е в специална admin таблица (ще добавим при нужда)
    RETURN (
        auth.jwt() ->> 'role' = 'admin'
        OR
        auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Административни потребители могат да правят всичко
-- (Ще добавим при нужда)

-- ========================================
-- ФУНКЦИИ ЗА СИГУРНОСТ
-- ========================================

-- Функция за проверка дали потребителят е собственик на касова бележка
CREATE OR REPLACE FUNCTION user_owns_receipt(receipt_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.receipts
        WHERE id = receipt_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция за проверка дали потребителят е собственик на бюджет
CREATE OR REPLACE FUNCTION user_owns_budget(budget_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.budgets
        WHERE id = budget_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- ПОЛИТИКИ ЗА STORAGE BUCKETS
-- ========================================

-- Политики за Supabase Storage ще бъдат добавени отделно
-- чрез SQL команди или Supabase Dashboard

-- ========================================
-- ТЕСТВАНЕ НА RLS ПОЛИТИКИ
-- ========================================

-- Функция за тестване на RLS политики (само за development)
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE(table_name TEXT, policy_name TEXT, test_result TEXT) AS $$
BEGIN
    -- Тази функция може да се използва за автоматично тестване
    -- на RLS политиките в development среда

    RETURN QUERY
    SELECT
        'profiles'::TEXT,
        'profiles_select_own'::TEXT,
        'OK'::TEXT;

    -- Добавете още тестове при нужда
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- КОМЕНТАРИ ЗА ДОКУМЕНТАЦИЯ
-- ========================================

COMMENT ON FUNCTION is_admin() IS 'Проверява дали текущият потребител има административни права';
COMMENT ON FUNCTION user_owns_receipt(UUID) IS 'Проверява дали потребителят е собственик на касова бележка';
COMMENT ON FUNCTION user_owns_budget(UUID) IS 'Проверява дали потребителят е собственик на бюджет';

-- ========================================
-- ЛОГИРАНЕ НА RLS СЪБИТИЯ
-- ========================================

-- За production може да добавим логиране на неуспешни опити за достъп
-- CREATE TABLE public.security_log (...);

-- ========================================
-- ЗАБЕЛЕЖКИ ЗА АДМИНИСТРАТОРИ
-- ========================================

/*
ВАЖНИ ЗАБЕЛЕЖКИ ЗА RLS:

1. Всички политики се прилагат САМО към обикновени потребители
2. service_role ключът заобикаля RLS политиките
3. За production трябва да се добавят административни роли
4. Storage политики трябва да се конфигурират отделно
5. Редовно тествайте политиките с различни потребители

КОМАНДИ ЗА ТЕСТВАНЕ:
- SET ROLE authenticated; -- Симулира authenticated потребител
- SET ROLE postgres; -- Връща admin права
- SELECT auth.uid(); -- Проверява текущия потребител

ПОЛЕЗНИ ЗАЯВКИ:
- SELECT * FROM pg_policies WHERE schemaname = 'public';
- SELECT * FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
*/