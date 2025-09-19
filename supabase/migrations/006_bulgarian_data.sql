-- ========================================
-- ПРИЗМА - БЪЛГАРСКИ ДАННИ И ШАБЛОНИ
-- ========================================
-- Миграция 006: Предварително попълване с български данни
-- Дата: 2025-01-19
-- Описание: Търговци, категории, шаблони за бюджети

-- ========================================
-- БЪЛГАРСКИ ТЪРГОВЦИ
-- ========================================

-- Големи хранителни вериги
INSERT INTO public.retailers (name, logo_url, website, is_chain, country_code) VALUES
    ('Kaufland', NULL, 'https://kaufland.bg', true, 'BG'),
    ('BILLA', NULL, 'https://billa.bg', true, 'BG'),
    ('Lidl', NULL, 'https://lidl.bg', true, 'BG'),
    ('Fantastico', NULL, 'https://fantastico.bg', true, 'BG'),
    ('T-Market', NULL, 'https://tmarket.bg', true, 'BG'),
    ('Carrefour', NULL, 'https://carrefour.bg', true, 'BG'),
    ('Metro', NULL, 'https://metro.bg', true, 'BG'),
    ('Piccadilly', NULL, 'https://piccadilly.bg', true, 'BG'),
    ('CBA', NULL, 'https://cba.bg', true, 'BG'),
    ('Mladost', NULL, NULL, true, 'BG'),

-- Дискаунт магазини
    ('Penny Market', NULL, 'https://penny.bg', true, 'BG'),
    ('Hit', NULL, NULL, true, 'BG'),
    ('SPAR', NULL, 'https://spar.bg', true, 'BG'),

-- Специализирани магазини
    ('dm drogerie markt', NULL, 'https://dm.bg', true, 'BG'),
    ('LILLYDROGERIE', NULL, 'https://lilly.bg', true, 'BG'),
    ('Аптека', NULL, NULL, false, 'BG'),
    ('Аптека SOpharmacy', NULL, 'https://sopharmacy.bg', true, 'BG'),

-- Техника и електроника
    ('Технополис', NULL, 'https://technopolis.bg', true, 'BG'),
    ('Technomarket', NULL, 'https://technomarket.bg', true, 'BG'),
    ('Emag', NULL, 'https://emag.bg', true, 'BG'),
    ('Zora', NULL, 'https://zora.bg', true, 'BG'),

-- Дрехи и мода
    ('H&M', NULL, 'https://hm.com', true, 'BG'),
    ('Zara', NULL, 'https://zara.com', true, 'BG'),
    ('LC Waikiki', NULL, 'https://lcwaikiki.bg', true, 'BG'),
    ('Pepco', NULL, 'https://pepco.bg', true, 'BG'),

-- Мебели и дом
    ('IKEA', NULL, 'https://ikea.bg', true, 'BG'),
    ('JYSK', NULL, 'https://jysk.bg', true, 'BG'),
    ('Практикер', NULL, 'https://praktiker.bg', true, 'BG'),
    ('Baumax', NULL, NULL, true, 'BG'),
    ('Leroy Merlin', NULL, 'https://leroymerlin.bg', true, 'BG'),

-- Горива
    ('Лукойл', NULL, 'https://lukoil.bg', true, 'BG'),
    ('ЕКО', NULL, 'https://eko.bg', true, 'BG'),
    ('OMV', NULL, 'https://omv.bg', true, 'BG'),
    ('Shell', NULL, 'https://shell.bg', true, 'BG'),
    ('Rompetrol', NULL, 'https://rompetrol.bg', true, 'BG'),

-- Ресторанти и заведения
    ('McDonald''s', NULL, 'https://mcdonalds.bg', true, 'BG'),
    ('KFC', NULL, 'https://kfc.bg', true, 'BG'),
    ('Subway', NULL, 'https://subway.bg', true, 'BG'),
    ('Domino''s Pizza', NULL, 'https://dominos.bg', true, 'BG'),
    ('Happy Bar & Grill', NULL, 'https://happy.bg', true, 'BG'),

-- Други услуги
    ('Аптека Remedium', NULL, 'https://remedium.bg', true, 'BG'),
    ('ЧЕЗ', NULL, 'https://cez.bg', true, 'BG'),
    ('ЕВН', NULL, 'https://evn.bg', true, 'BG'),
    ('Виваком', NULL, 'https://vivacom.bg', true, 'BG'),
    ('A1', NULL, 'https://a1.bg', true, 'BG'),
    ('Теленор', NULL, 'https://telenor.bg', true, 'BG');

-- ========================================
-- КАТЕГОРИИ НА ПРОДУКТИ (ЙЕРАРХИЧНИ)
-- ========================================

-- Основни категории
INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
    ('Храни и напитки', NULL, 'shopping-cart', '#059669', true, 1),
    ('Битова химия', NULL, 'sparkles', '#0891b2', true, 2),
    ('Козметика и хигиена', NULL, 'heart', '#db2777', true, 3),
    ('Здраве и аптека', NULL, 'shield-plus', '#dc2626', true, 4),
    ('Дрехи и обувки', NULL, 'shirt', '#7c3aed', true, 5),
    ('Дом и градина', NULL, 'home', '#ea580c', true, 6),
    ('Техника и електроника', NULL, 'laptop', '#1d4ed8', true, 7),
    ('Транспорт', NULL, 'car', '#374151', true, 8),
    ('Развлечения', NULL, 'gamepad-2', '#f59e0b', true, 9),
    ('Услуги', NULL, 'briefcase', '#6b7280', true, 10),
    ('Други', NULL, 'more-horizontal', '#9ca3af', true, 11);

-- Получаваме ID-тата на основните категории
DO $$
DECLARE
    cat_food_id UUID;
    cat_household_id UUID;
    cat_cosmetics_id UUID;
    cat_health_id UUID;
    cat_clothing_id UUID;
    cat_home_id UUID;
    cat_tech_id UUID;
    cat_transport_id UUID;
    cat_entertainment_id UUID;
    cat_services_id UUID;
BEGIN
    SELECT id INTO cat_food_id FROM public.categories WHERE name = 'Храни и напитки';
    SELECT id INTO cat_household_id FROM public.categories WHERE name = 'Битова химия';
    SELECT id INTO cat_cosmetics_id FROM public.categories WHERE name = 'Козметика и хигиена';
    SELECT id INTO cat_health_id FROM public.categories WHERE name = 'Здраве и аптека';
    SELECT id INTO cat_clothing_id FROM public.categories WHERE name = 'Дрехи и обувки';
    SELECT id INTO cat_home_id FROM public.categories WHERE name = 'Дом и градина';
    SELECT id INTO cat_tech_id FROM public.categories WHERE name = 'Техника и електроника';
    SELECT id INTO cat_transport_id FROM public.categories WHERE name = 'Транспорт';
    SELECT id INTO cat_entertainment_id FROM public.categories WHERE name = 'Развлечения';
    SELECT id INTO cat_services_id FROM public.categories WHERE name = 'Услуги';

    -- Подкатегории за храни и напитки
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Основни храни', cat_food_id, 'bread', '#065f46', true, 1),
        ('Месо и риба', cat_food_id, 'beef', '#b91c1c', true, 2),
        ('Млечни продукти', cat_food_id, 'milk', '#f3f4f6', true, 3),
        ('Плодове и зеленчуци', cat_food_id, 'apple', '#16a34a', true, 4),
        ('Напитки', cat_food_id, 'coffee', '#92400e', true, 5),
        ('Сладкиши и закуски', cat_food_id, 'candy', '#ec4899', true, 6),
        ('Готови храни', cat_food_id, 'pizza', '#f97316', true, 7),
        ('Подправки и добавки', cat_food_id, 'chef-hat', '#a3a3a3', true, 8);

    -- Подкатегории за битова химия
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Препарати за почистване', cat_household_id, 'spray-can', '#0e7490', true, 1),
        ('Препарати за пране', cat_household_id, 'washing-machine', '#155e75', true, 2),
        ('Препарати за съдове', cat_household_id, 'utensils', '#0f766e', true, 3),
        ('Торбички и фолио', cat_household_id, 'package', '#4b5563', true, 4);

    -- Подкатегории за козметика и хигиена
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Грижа за лице', cat_cosmetics_id, 'smile', '#be185d', true, 1),
        ('Грижа за коса', cat_cosmetics_id, 'scissors', '#c2410c', true, 2),
        ('Грижа за тяло', cat_cosmetics_id, 'hand', '#7c2d12', true, 3),
        ('Орална хигиена', cat_cosmetics_id, 'teeth', '#f8fafc', true, 4),
        ('Дезодоранти и парфюми', cat_cosmetics_id, 'flower', '#a21caf', true, 5);

    -- Подкатегории за здраве и аптека
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Лекарства', cat_health_id, 'pill', '#dc2626', true, 1),
        ('Витамини и добавки', cat_health_id, 'heart-pulse', '#ea580c', true, 2),
        ('Медицински изделия', cat_health_id, 'stethoscope', '#64748b', true, 3),
        ('Детска грижа', cat_health_id, 'baby', '#fbbf24', true, 4);

    -- Подкатегории за дрехи и обувки
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Мъжки дрехи', cat_clothing_id, 'shirt', '#1e40af', true, 1),
        ('Дамски дрехи', cat_clothing_id, 'dress', '#be185d', true, 2),
        ('Детски дрехи', cat_clothing_id, 'baby-clothes', '#fbbf24', true, 3),
        ('Обувки', cat_clothing_id, 'footprints', '#374151', true, 4),
        ('Аксесоари', cat_clothing_id, 'watch', '#6b7280', true, 5);

    -- Подкатегории за дом и градина
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Мебели', cat_home_id, 'armchair', '#92400e', true, 1),
        ('Декорация', cat_home_id, 'palette', '#7c3aed', true, 2),
        ('Инструменти', cat_home_id, 'wrench', '#374151', true, 3),
        ('Градинарство', cat_home_id, 'flower-2', '#16a34a', true, 4),
        ('Текстил за дома', cat_home_id, 'pillow', '#f59e0b', true, 5);

    -- Подкатегории за техника и електроника
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Компютри и лаптопи', cat_tech_id, 'laptop', '#1e40af', true, 1),
        ('Телефони и таблети', cat_tech_id, 'smartphone', '#059669', true, 2),
        ('Домашна техника', cat_tech_id, 'refrigerator', '#0891b2', true, 3),
        ('Аудио и видео', cat_tech_id, 'headphones', '#7c3aed', true, 4),
        ('Аксесоари', cat_tech_id, 'usb', '#6b7280', true, 5);

    -- Подкатегории за транспорт
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Горива', cat_transport_id, 'fuel', '#dc2626', true, 1),
        ('Обществен транспорт', cat_transport_id, 'bus', '#059669', true, 2),
        ('Такси и превози', cat_transport_id, 'car', '#f59e0b', true, 3),
        ('Паркинг', cat_transport_id, 'parking-circle', '#6b7280', true, 4),
        ('Автосервиз', cat_transport_id, 'wrench', '#374151', true, 5);

    -- Подкатегории за развлечения
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Ресторанти и заведения', cat_entertainment_id, 'utensils', '#ea580c', true, 1),
        ('Кино и театър', cat_entertainment_id, 'film', '#7c3aed', true, 2),
        ('Спорт и фитнес', cat_entertainment_id, 'dumbbell', '#16a34a', true, 3),
        ('Игри и хобита', cat_entertainment_id, 'gamepad-2', '#f59e0b', true, 4),
        ('Пътувания', cat_entertainment_id, 'plane', '#0891b2', true, 5);

    -- Подкатегории за услуги
    INSERT INTO public.categories (name, parent_id, icon_name, color_hex, is_system, sort_order) VALUES
        ('Комунални услуги', cat_services_id, 'zap', '#f59e0b', true, 1),
        ('Телекомуникации', cat_services_id, 'wifi', '#1e40af', true, 2),
        ('Банкови услуги', cat_services_id, 'credit-card', '#059669', true, 3),
        ('Застраховки', cat_services_id, 'shield', '#6b7280', true, 4),
        ('Професионални услуги', cat_services_id, 'briefcase', '#374151', true, 5);
END $$;

-- ========================================
-- ШАБЛОНИ ЗА БЮДЖЕТИ
-- ========================================

-- Създаваме системен потребител за шаблони
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system@prizma.bg',
    NOW(),
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Профил за системния потребител
INSERT INTO public.profiles (id, email, full_name)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'system@prizma.bg',
    'Системни шаблони'
) ON CONFLICT (id) DO NOTHING;

-- Базов месечен бюджет за семейство
INSERT INTO public.budgets (
    user_id, name, description, start_date, end_date,
    total_budget, currency, budget_type, is_template, template_name,
    color_hex, auto_categorize, alert_threshold
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Базов семеен бюджет',
    'Месечен бюджет за семейство с 2-4 души в България',
    '2025-01-01', '2025-01-31',
    2500.00, 'BGN', 'monthly', true, 'Семеен месечен бюджет',
    '#2563eb', true, 0.85
);

-- Месечен бюджет за студент
INSERT INTO public.budgets (
    user_id, name, description, start_date, end_date,
    total_budget, currency, budget_type, is_template, template_name,
    color_hex, auto_categorize, alert_threshold
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Студентски бюджет',
    'Месечен бюджет за студент',
    '2025-01-01', '2025-01-31',
    800.00, 'BGN', 'monthly', true, 'Студентски месечен бюджет',
    '#059669', true, 0.80
);

-- Седмичен бюджет за основни нужди
INSERT INTO public.budgets (
    user_id, name, description, start_date, end_date,
    total_budget, currency, budget_type, is_template, template_name,
    color_hex, auto_categorize, alert_threshold
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Седмичен базов бюджет',
    'Бюджет за основни разходи за една седмица',
    '2025-01-01', '2025-01-07',
    300.00, 'BGN', 'weekly', true, 'Седмичен базов бюджет',
    '#ea580c', true, 0.75
);

-- Бюджетни линии за семейния шаблон
DO $$
DECLARE
    family_budget_id UUID;
    student_budget_id UUID;
    weekly_budget_id UUID;
    cat_food_id UUID;
    cat_household_id UUID;
    cat_cosmetics_id UUID;
    cat_health_id UUID;
    cat_transport_id UUID;
    cat_entertainment_id UUID;
    cat_services_id UUID;
BEGIN
    SELECT id INTO family_budget_id FROM public.budgets WHERE template_name = 'Семеен месечен бюджет';
    SELECT id INTO student_budget_id FROM public.budgets WHERE template_name = 'Студентски месечен бюджет';
    SELECT id INTO weekly_budget_id FROM public.budgets WHERE template_name = 'Седмичен базов бюджет';

    SELECT id INTO cat_food_id FROM public.categories WHERE name = 'Храни и напитки';
    SELECT id INTO cat_household_id FROM public.categories WHERE name = 'Битова химия';
    SELECT id INTO cat_cosmetics_id FROM public.categories WHERE name = 'Козметика и хигиена';
    SELECT id INTO cat_health_id FROM public.categories WHERE name = 'Здраве и аптека';
    SELECT id INTO cat_transport_id FROM public.categories WHERE name = 'Транспорт';
    SELECT id INTO cat_entertainment_id FROM public.categories WHERE name = 'Развлечения';
    SELECT id INTO cat_services_id FROM public.categories WHERE name = 'Услуги';

    -- Семеен бюджет линии
    INSERT INTO public.budget_lines (budget_id, category_id, name, allocated_amount, sort_order, color_hex) VALUES
        (family_budget_id, cat_food_id, 'Храни и напитки', 1200.00, 1, '#059669'),
        (family_budget_id, cat_household_id, 'Битова химия', 150.00, 2, '#0891b2'),
        (family_budget_id, cat_cosmetics_id, 'Козметика и хигиена', 200.00, 3, '#db2777'),
        (family_budget_id, cat_health_id, 'Здраве и лекарства', 300.00, 4, '#dc2626'),
        (family_budget_id, cat_transport_id, 'Транспорт', 400.00, 5, '#374151'),
        (family_budget_id, cat_entertainment_id, 'Развлечения', 150.00, 6, '#f59e0b'),
        (family_budget_id, cat_services_id, 'Услуги и сметки', 100.00, 7, '#6b7280');

    -- Студентски бюджет линии
    INSERT INTO public.budget_lines (budget_id, category_id, name, allocated_amount, sort_order, color_hex) VALUES
        (student_budget_id, cat_food_id, 'Храни и напитки', 400.00, 1, '#059669'),
        (student_budget_id, cat_household_id, 'Битова химия', 30.00, 2, '#0891b2'),
        (student_budget_id, cat_cosmetics_id, 'Козметика и хигиена', 50.00, 3, '#db2777'),
        (student_budget_id, cat_health_id, 'Здраве', 50.00, 4, '#dc2626'),
        (student_budget_id, cat_transport_id, 'Транспорт', 120.00, 5, '#374151'),
        (student_budget_id, cat_entertainment_id, 'Развлечения', 100.00, 6, '#f59e0b'),
        (student_budget_id, cat_services_id, 'Услуги', 50.00, 7, '#6b7280');

    -- Седмичен бюджет линии
    INSERT INTO public.budget_lines (budget_id, category_id, name, allocated_amount, sort_order, color_hex) VALUES
        (weekly_budget_id, cat_food_id, 'Храни и напитки', 200.00, 1, '#059669'),
        (weekly_budget_id, cat_household_id, 'Битова химия', 20.00, 2, '#0891b2'),
        (weekly_budget_id, cat_cosmetics_id, 'Козметика и хигиена', 25.00, 3, '#db2777'),
        (weekly_budget_id, cat_transport_id, 'Транспорт', 35.00, 4, '#374151'),
        (weekly_budget_id, cat_entertainment_id, 'Развлечения', 20.00, 5, '#f59e0b');
END $$;

-- ========================================
-- ТЕСТОВИ ДАННИ (САМО ЗА DEVELOPMENT)
-- ========================================

-- Ще бъдат добавени в отделна миграция за development среда

-- ========================================
-- КОМЕНТАРИ И ДОКУМЕНТАЦИЯ
-- ========================================

COMMENT ON TABLE public.retailers IS 'Предварително попълнени български търговци и вериги';
COMMENT ON TABLE public.categories IS 'Йерархични категории продукти с български имена';

-- ========================================
-- ФУНКЦИИ ЗА РАБОТА С БЪЛГАРСКИТЕ ДАННИ
-- ========================================

-- Функция за търсене на търговец по име (с tolerance за различия)
CREATE OR REPLACE FUNCTION find_retailer_by_name(search_name TEXT)
RETURNS UUID AS $$
DECLARE
    retailer_id UUID;
BEGIN
    -- Точно съвпадение
    SELECT id INTO retailer_id
    FROM public.retailers
    WHERE normalized_name = LOWER(TRIM(REGEXP_REPLACE(search_name, '[^\w\s]', '', 'g')))
    LIMIT 1;

    IF retailer_id IS NOT NULL THEN
        RETURN retailer_id;
    END IF;

    -- Частично съвпадение с triagram
    SELECT id INTO retailer_id
    FROM public.retailers
    WHERE normalized_name % LOWER(TRIM(REGEXP_REPLACE(search_name, '[^\w\s]', '', 'g')))
    ORDER BY similarity(normalized_name, LOWER(TRIM(REGEXP_REPLACE(search_name, '[^\w\s]', '', 'g')))) DESC
    LIMIT 1;

    RETURN retailer_id;
END;
$$ LANGUAGE plpgsql;

-- Функция за автоматично категоризиране на продукт
CREATE OR REPLACE FUNCTION auto_categorize_product(product_name TEXT)
RETURNS UUID AS $$
DECLARE
    category_id UUID;
    normalized_product TEXT;
BEGIN
    normalized_product := LOWER(TRIM(product_name));

    -- Основни храни
    IF normalized_product ~ '(хляб|хлябче|багет|франзела|питка|лепеш)' OR
       normalized_product ~ '(мляко|кисело мляко|айран|йогурт)' OR
       normalized_product ~ '(яйца|яйце)' OR
       normalized_product ~ '(ориз|макарони|спагети|паста)' OR
       normalized_product ~ '(брашно|захар|сол|олио|масло)' THEN
        SELECT id INTO category_id FROM public.categories WHERE name = 'Основни храни';

    -- Месо и риба
    ELSIF normalized_product ~ '(кебапче|кюфте|наденица|салам|шунка)' OR
          normalized_product ~ '(пилешко|говеждо|свинско|телешко)' OR
          normalized_product ~ '(риба|тон|сьомга|скумрия)' THEN
        SELECT id INTO category_id FROM public.categories WHERE name = 'Месо и риба';

    -- Плодове и зеленчуци
    ELSIF normalized_product ~ '(ябълки|банани|портокали|лимони|грозде)' OR
          normalized_product ~ '(домати|краставици|лук|картофи|моркови)' OR
          normalized_product ~ '(салата|спанак|броколи|зеле)' THEN
        SELECT id INTO category_id FROM public.categories WHERE name = 'Плодове и зеленчуци';

    -- Напитки
    ELSIF normalized_product ~ '(вода|сок|кока кола|фанта|спрайт|пепси)' OR
          normalized_product ~ '(бира|вино|кафе|чай)' THEN
        SELECT id INTO category_id FROM public.categories WHERE name = 'Напитки';

    -- Млечни продукти
    ELSIF normalized_product ~ '(сирене|кашкавал|краве сирене|овче сирене)' OR
          normalized_product ~ '(масло|сметана|крема)' THEN
        SELECT id INTO category_id FROM public.categories WHERE name = 'Млечни продукти';

    -- Битова химия
    ELSIF normalized_product ~ '(препарат|почистване|пране|белина)' OR
          normalized_product ~ '(торба|найлон|фолио)' THEN
        SELECT id INTO category_id FROM public.categories WHERE name = 'Битова химия';

    -- Козметика и хигиена
    ELSIF normalized_product ~ '(сапун|шампоан|паста|четка)' OR
          normalized_product ~ '(дезодорант|парфюм|крем)' THEN
        SELECT id INTO category_id FROM public.categories WHERE name = 'Козметика и хигиена';

    ELSE
        -- Връщаме NULL за ръчна категоризация
        RETURN NULL;
    END IF;

    RETURN category_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_retailer_by_name(TEXT) IS 'Намира търговец по име с tolerance за различия в изписването';
COMMENT ON FUNCTION auto_categorize_product(TEXT) IS 'Автоматично категоризира продукт на база българските му имена';

-- ========================================
-- ЗАВЪРШВАНЕ НА МИГРАЦИЯТА
-- ========================================

-- Обновяване на статистиките за по-добра производителност
ANALYZE public.retailers;
ANALYZE public.categories;
ANALYZE public.budgets;
ANALYZE public.budget_lines;