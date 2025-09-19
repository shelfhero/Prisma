# Supabase Database Setup за Призма

## Преглед

Тази документация описва пълната настройка на Supabase базата данни за приложението Призма - българска система за проследяване на касови бележки и бюджетиране.

## Архитектура на базата данни

### Основни таблици

1. **profiles** - Профили на потребители
2. **retailers** - Търговци и магазини
3. **categories** - Категории продукти (йерархични)
4. **receipts** - Касови бележки
5. **receipt_images** - Снимки на касови бележки
6. **items** - Артикули/продукти от касови бележки
7. **price_snapshots** - Ценови снимки за анализ
8. **budgets** - Бюджети на потребители
9. **budget_lines** - Линии в бюджетите

### Storage Buckets

1. **receipt-images** - Оригинални снимки на касови бележки
2. **receipt-thumbnails** - Компресирани/thumbnail версии

## Стъпки за настройка

### 1. Създаване на Supabase проект

1. Отидете на [supabase.com](https://supabase.com)
2. Кликнете "Start your project"
3. Създайте нов проект:
   - **Name**: "prizma-app"
   - **Database Password**: Генерирайте сигурна парола
   - **Region**: Europe (Dublin) - най-близо до България

### 2. Конфигуриране на environment variables

Копирайте настройките от вашия Supabase проект:

```bash
# В .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Изпълнение на миграциите

Изпълнете миграциите в следния ред:

```sql
-- 1. Основни таблици
\i supabase/migrations/001_core_tables.sql

-- 2. Касови бележки и артикули
\i supabase/migrations/002_receipts_items.sql

-- 3. Бюджети
\i supabase/migrations/003_budgets.sql

-- 4. Row Level Security
\i supabase/migrations/004_row_level_security.sql

-- 5. Performance индекси
\i supabase/migrations/005_performance_indexes.sql

-- 6. Български данни
\i supabase/migrations/006_bulgarian_data.sql

-- 7. Storage настройка
\i supabase/migrations/007_storage_setup.sql

-- 8. Разширени функции
\i supabase/migrations/008_advanced_functions.sql
```

### 4. Конфигуриране на Storage

В Supabase Dashboard:

1. **Storage > Settings**:
   - File upload limit: 10MB
   - Image optimization: Enabled
   - Image quality: 80%
   - Image resize: Max 2048x2048px

2. **Storage > Buckets**:
   - Buckets се създават автоматично от миграциите
   - Проверете че политиките са активни

### 5. Конфигуриране на Authentication

1. **Authentication > Settings**:
   - Enable email confirmations
   - Set site URL: https://your-domain.com
   - Add redirect URLs for development: http://localhost:3000

2. **Authentication > Providers**:
   - Enable email/password
   - Optional: Enable Google, GitHub за social login

## Структура на данните

### Йерархия на категориите

```
Храни и напитки
├── Основни храни
├── Месо и риба
├── Млечни продукти
├── Плодове и зеленчуци
├── Напитки
├── Сладкиши и закуски
├── Готови храни
└── Подправки и добавки

Битова химия
├── Препарати за почистване
├── Препарати за пране
├── Препарати за съдове
└── Торбички и фолио

Козметика и хигиена
├── Грижа за лице
├── Грижа за коса
├── Грижа за тяло
├── Орална хигиена
└── Дезодоранти и парфюми

... и още
```

### Предварително попълнени търговци

- **Хранителни вериги**: Kaufland, BILLA, Lidl, Fantastico, T-Market
- **Дискаунт магазини**: Penny Market, Hit, SPAR
- **Специализирани**: dm drogerie markt, LILLYDROGERIE, аптеки
- **Техника**: Технополис, Technomarket, Emag
- **Мода**: H&M, Zara, LC Waikiki
- **Дом**: IKEA, JYSK, Практикер
- **Горива**: Лукойл, ЕКО, OMV, Shell
- **Заведения**: McDonald's, KFC, Happy Bar & Grill

### Шаблони за бюджети

1. **Семеен месечен бюджет** (2500 лв):
   - Храни и напитки: 1200 лв
   - Транспорт: 400 лв
   - Здраве: 300 лв
   - Козметика: 200 лв
   - Битова химия: 150 лв
   - Развлечения: 150 лв
   - Услуги: 100 лв

2. **Студентски месечен бюджет** (800 лв):
   - Храни и напитки: 400 лв
   - Транспорт: 120 лв
   - Развлечения: 100 лв
   - Здраве: 50 лв
   - Козметика: 50 лв
   - Услуги: 50 лв
   - Битова химия: 30 лв

3. **Седмичен базов бюджет** (300 лв):
   - Храни и напитки: 200 лв
   - Транспорт: 35 лв
   - Козметика: 25 лв
   - Битова химия: 20 лв
   - Развлечения: 20 лв

## Сигурност (RLS Policies)

### Основни принципи

1. **Потребителите виждат само своите данни**
2. **Системните данни са достъпни за четене**
3. **Storage файлове са защитени per-user**
4. **Административни операции изискват специални права**

### Важни политики

```sql
-- Потребители виждат само своите касови бележки
CREATE POLICY "receipts_select_own" ON receipts
    FOR SELECT USING (auth.uid() = user_id);

-- Storage достъп само до собствени файлове
CREATE POLICY "receipt_images_select_own" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'receipt-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
```

## Performance оптимизация

### Ключови индекси

1. **Търсене**: Trigram индекси за имена на продукти
2. **Анализ**: Composite индекси за дати + потребители
3. **Ценово сравнение**: Индекси за баркодове и цени
4. **Бюджети**: Индекси за активни бюджети и превишения

### Monitoring заявки

```sql
-- Статистики за индекси
SELECT * FROM public.index_usage_stats;

-- Размери на индекси
SELECT * FROM public.index_size_stats;

-- Reindex всички таблици
SELECT reindex_all_tables();
```

## API функции

### Анализ на разходи

```sql
-- Детайлен анализ за последните 30 дни
SELECT * FROM get_spending_analysis(auth.uid());

-- Топ продукти по разходи
SELECT * FROM get_top_products_by_spending(auth.uid());

-- Сравнение на цени между търговци
SELECT * FROM compare_prices_across_retailers('хляб');
```

### Бюджетен анализ

```sql
-- Статус на бюджет
SELECT * FROM get_budget_status('budget-uuid');

-- Прогноза за разходи
SELECT * FROM forecast_budget_spending('budget-uuid');

-- Месечен отчет
SELECT * FROM generate_monthly_report(auth.uid(), 2025, 1);
```

### Автоматизация

```sql
-- Автоматично категоризиране
SELECT auto_categorize_product('хляб черен');

-- Намиране на търговец
SELECT find_retailer_by_name('Кауфланд');

-- Намиrane на дублирани продукти
SELECT * FROM find_duplicate_products(auth.uid());
```

## Maintenance операции

### Редовни задачи

```sql
-- Обновяване на статистики (седмично)
SELECT maintenance_update_stats();

-- Cleanup на стари файлове (месечно)
SELECT * FROM cleanup_old_receipts(365);

-- Cleanup на осиротели файлове
SELECT * FROM cleanup_orphaned_files();
```

### Migration на стари данни

```sql
-- При upgrade на съществуващи данни
SELECT migrate_legacy_data();
```

## Troubleshooting

### Чести проблеми

1. **RLS Policy грешки**:
   ```sql
   -- Проверка на политики
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

2. **Storage access грешки**:
   - Проверете bucket политиките
   - Валидирайте file paths
   - Проверете file size limits

3. **Performance проблеми**:
   ```sql
   -- Analyze slow queries
   SELECT * FROM pg_stat_statements ORDER BY total_time DESC;
   ```

### Backup стратегия

1. **Database backup**: Automatic daily backups в Supabase
2. **Storage backup**: Weekly backup на storage buckets
3. **Migration files**: Version control в Git

## Deployment checklist

### Pre-production

- [ ] Всички миграции изпълнени
- [ ] RLS политики тествани
- [ ] Storage buckets конфигурирани
- [ ] Performance тестване завършено
- [ ] Backup стратегия активна

### Production

- [ ] Environment variables настроени
- [ ] SSL сертификати валидни
- [ ] Monitoring setup
- [ ] Error tracking active
- [ ] Load testing completed

### Post-deployment

- [ ] Health check endpoints working
- [ ] API rate limiting configured
- [ ] User onboarding flow tested
- [ ] Data import/export tested

## Поддръжка

За въпроси и поддръжка:

1. **Документация**: Този файл и inline коментари
2. **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
3. **GitHub Issues**: За feature requests и bug reports
4. **Database Schema**: Визуализация в Supabase Dashboard

## Версии

- **v1.0.0**: Initial schema
- **v1.1.0**: Added advanced functions
- **v1.2.0**: Performance optimizations
- **Текуща**: v1.2.0

---

*Последна актуализация: 19.01.2025*