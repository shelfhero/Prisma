# 🧪 Призма - Ръководство за тестване на Supabase интеграцията

Това ръководство описва как да тествате всички аспекти на Supabase интеграцията в приложението Призма.

## 📋 Преглед на тестовете

### 1. Автоматични тестове
- **Разположение**: `http://localhost:3002/test-supabase`
- **Цел**: Комплексно тестване на всички Supabase функции
- **Време за изпълнение**: 30-60 секунди

### 2. Компоненти за тестване
- **База данни**: Връзка, таблици, RLS политики
- **Автентикация**: Регистрация, вход, изход
- **Файлово съхранение**: Upload/Download файлове
- **Бизнес логика**: Пълен поток на касови бележки
- **Локализация**: Български текст и шрифтове

## 🚀 Как да стартирате тестовете

### Стъпка 1: Достъп до тестовата страница
```bash
# Уверете се, че сървърът работи
npm run dev

# Отворете в браузъра
http://localhost:3002/test-supabase
```

### Стъпка 2: Конфигурация
1. **Без автентикация**: Някои тестове ще бъдат пропуснати
2. **С автентикация**: Пълно тестване на всички функции
3. **Тестови данни**: Автоматично се изчистват след тестването

### Стъпка 3: Изпълнение
1. Натиснете "Стартиране на всички тестове"
2. Изчакайте завършването (30-60 сек)
3. Прегледайте резултатите
4. Свалете отчета ако е необходимо

## 📊 Видове тестове

### 🗄️ Тестове на базата данни

#### Тест на свързването
```typescript
// Проверява основната връзка с Supabase
const { data, error } = await supabase
  .from('profiles')
  .select('count')
  .limit(1);
```

**Очакван резултат**: ✅ Успешна връзка без грешки

#### Тест на достъпа до таблици
```typescript
// Проверява достъпа до всички основни таблици
const tables = ['profiles', 'receipts', 'items', 'categories', 'retailers'];
```

**Очакван резултат**: ✅ Достъп до всички таблици

#### Тест на RLS политиките
```typescript
// Проверява че потребителите могат да достъпят само своите данни
const { data } = await supabase
  .from('receipts')
  .select('*')
  .neq('user_id', userId);
```

**Очакван резултат**: ✅ Блокиран достъп до чужди данни

### 🔐 Тестове на автентикацията

#### Тест на регистрацията
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'test@prizma.bg',
  password: 'TestPassword123!'
});
```

**Очакван резултат**: ✅ Успешна регистрация

#### Тест на влизането
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@prizma.bg',
  password: 'TestPassword123!'
});
```

**Очакван резултат**: ✅ Успешен вход

### 📁 Тестове на файловото съхранение

#### Тест на достъпа до buckets
```typescript
const { data: buckets, error } = await supabase.storage.listBuckets();
```

**Очакван резултат**: ✅ Достъп до 'receipts' bucket

#### Тест на качването на файлове
```typescript
const { data, error } = await supabase.storage
  .from('receipts')
  .upload(path, file);
```

**Очакван резултат**: ✅ Успешно качване на тестов файл

### 🧾 Тестове на касовите бележки

#### Тест на създаването на бележка
```typescript
const { data: receipt, error } = await supabase
  .from('receipts')
  .insert({
    user_id: userId,
    retailer_id: retailer?.id,
    total_amount: 25.50,
    currency: 'BGN'
  });
```

**Очакван резултат**: ✅ Създадена тестова бележка

#### Тест на заявките с релации
```typescript
const { data: receipts } = await supabase
  .from('receipts')
  .select(`
    id, total_amount,
    retailer:retailers(name),
    items(id, product_name, category:categories(name))
  `);
```

**Очакван резултат**: ✅ Заредени бележки с релации

## 🇧🇬 Тест на българския текст

### Автоматична проверка
Тестът проверява:
- ✅ Правилно рендериране на кирилица
- ✅ Поддръжка на специални символи
- ✅ Форматиране на дати и валути
- ✅ Съобщения за грешки на български
- ✅ Шрифтове (Inter + Cyrillic subset)

### Ръчна проверка
1. Отворете секцията "🇧🇬 Тест на българския текст"
2. Изберете категория от лявата страна
3. Проверете дали всички текстове се показват правилно
4. Търсете квадратчета (□) вместо букви
5. Натиснете "Тествай всички текстове" за автоматична проверка

## 🔧 Debugging инструменти

### Quick Health Check
```typescript
import { quickHealthCheck } from '@/lib/debug-supabase';

const isHealthy = await quickHealthCheck();
console.log('Supabase status:', isHealthy ? 'OK' : 'Error');
```

### Подробна диагностика
```typescript
import debugSupabaseConnection from '@/lib/debug-supabase';

const results = await debugSupabaseConnection();
results.forEach(result => {
  console.log(`${result.success ? '✅' : '❌'} ${result.test}: ${result.message}`);
});
```

### Status компонент
```typescript
import SupabaseStatus from '@/components/debug/SupabaseStatus';

// Минимален статус
<SupabaseStatus minimal />

// Пълен статус
<SupabaseStatus />
```

## ❌ Възможни проблеми и решения

### Проблем: "NEXT_PUBLIC_SUPABASE_URL is required"
**Причина**: Липсват environment variables
**Решение**:
1. Проверете `.env.local` файла
2. Уверете се, че всички променливи са зададени
3. Рестартирайте сървъра

### Проблем: "Row Level Security policy violation"
**Причина**: Неправилни RLS политики
**Решение**:
1. Проверете RLS политиките в Supabase dashboard
2. Уверете се, че потребителят е автентикиран
3. Проверете user_id във всички заявки

### Проблем: "Cannot access table"
**Причина**: Липсват разрешения или таблицата не съществува
**Решение**:
1. Проверете дали таблицата съществува в Supabase
2. Проверете разрешенията на anon и authenticated роли
3. Проверете API settings в Supabase dashboard

### Проблем: Български текст се показва като квадратчета
**Причина**: Проблем със шрифтовете или кодировката
**Решение**:
1. Проверете дали Inter шрифтът поддържа кирилица
2. Добавете 'cyrillic' subset в шрифтовата конфигурация
3. Проверете meta charset в HTML

## 📈 Интерпретиране на резултатите

### ✅ Всички тестове минават
- Supabase интеграцията работи правилно
- Приложението е готово за production
- Всички основни функции работят

### ⚠️ Някои тестове минават
- Основната функционалност работи
- Има проблеми с отделни компоненти
- Нужна допълнителна диагностика

### ❌ Повечето тестове не минават
- Сериозни проблеми с конфигурацията
- Проверете environment variables
- Проверете Supabase настройките

## 🚀 Следващи стъпки

След успешно завършване на тестовете:

1. **Production deployment**: Конфигурирайте production environment
2. **Monitoring**: Настройте мониториране на Supabase
3. **Backup**: Настройте автоматични backup-и
4. **Performance**: Оптимизирайте заявките ако е необходимо

## 📞 Поддръжка

Ако срещнете проблеми:
1. Проверете този документ за решения
2. Прегледайте browser console за грешки
3. Проверете Supabase dashboard за логове
4. Използвайте debug инструментите в приложението

---

**Автор**: Claude Code
**Версия**: 1.0
**Дата**: Септември 2024