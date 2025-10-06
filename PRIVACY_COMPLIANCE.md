# Privacy & GDPR Compliance - Призма

## Overview

Complete implementation of Bulgarian data privacy requirements and GDPR compliance for Призма.

## ✅ Completed Features

### 1. Legal Pages (Bulgarian)

#### Privacy Policy (`/privacy`)
- **File:** `app/privacy/page.tsx`
- Comprehensive GDPR-compliant privacy policy
- Covers all required topics:
  - What data we collect
  - How we use it
  - AI processing disclosure
  - User rights (GDPR)
  - Data storage and security
  - How to delete data
  - Contact information
  - КЗЛД (Bulgarian DPA) contact

#### Terms of Service (`/terms`)
- **File:** `app/terms/page.tsx`
- Clear usage terms in Bulgarian
- Covers:
  - Service description
  - User rights and obligations
  - Data ownership (user owns their data)
  - Acceptable use policy
  - Intellectual property
  - Limitations and disclaimers
  - Termination procedures

### 2. Data Deletion

#### Delete Account API
- **File:** `app/api/user/delete/route.ts`
- **Endpoint:** `POST /api/user/delete`
- **Features:**
  - Requires explicit confirmation (`confirmation: "DELETE"`)
  - Deletes ALL user data:
    - Receipts and items
    - Budgets and budget lines
    - User preferences
    - Profile
    - Auth account
  - Cascade deletes related data
  - Logs all deletion steps
  - GDPR compliant (permanent deletion)

**Usage:**
```typescript
const response = await fetch('/api/user/delete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirmation: 'DELETE' })
});
```

### 3. Data Export

#### Export Data API
- **File:** `app/api/user/export/route.ts`
- **Endpoint:** `GET /api/user/export?format=json|csv`
- **Features:**
  - Exports ALL user data
  - Two formats: JSON (structured) or CSV (spreadsheet)
  - Includes:
    - Profile information
    - All receipts with items
    - All budgets with lines
    - User preferences
    - Statistics summary
  - Downloads as file with timestamp
  - GDPR compliant (data portability)

**Usage:**
```typescript
// JSON export
window.open('/api/user/export?format=json', '_blank');

// CSV export
window.open('/api/user/export?format=csv', '_blank');
```

## 🔧 TODO: Implementation in Settings Page

### Add to Settings Page

Add these sections to `app/settings/page.tsx`:

```typescript
// 1. Data Export Section
<Card className="p-6">
  <h3 className="text-xl font-bold mb-4">📦 Експорт на данни</h3>
  <p className="text-gray-600 mb-4">
    Изтеглете всички ваши данни в JSON или CSV формат (GDPR право на преносимост)
  </p>
  <div className="flex gap-3">
    <Button onClick={() => window.open('/api/user/export?format=json', '_blank')}>
      <Download className="w-4 h-4 mr-2" />
      Експорт JSON
    </Button>
    <Button variant="outline" onClick={() => window.open('/api/user/export?format=csv', '_blank')}>
      <Download className="w-4 h-4 mr-2" />
      Експорт CSV
    </Button>
  </div>
</Card>

// 2. Account Deletion Section
<Card className="p-6 border-red-200">
  <h3 className="text-xl font-bold mb-4 text-red-600">🗑️ Изтриване на профил</h3>
  <p className="text-gray-600 mb-4">
    Permanent изтриване на профила и всички данни. Това действие е необратимо!
  </p>
  <Button
    variant="destructive"
    onClick={() => setShowDeleteDialog(true)}
  >
    <Trash2 className="w-4 h-4 mr-2" />
    Изтрий профила ми
  </Button>
</Card>

// 3. Deletion Confirmation Dialog
{showDeleteDialog && (
  <Dialog>
    <DialogContent>
      <h3 className="text-xl font-bold text-red-600 mb-4">
        ⚠️ Сигурни ли сте?
      </h3>
      <p className="mb-4">
        Това ще изтрие <strong>PERMANENT</strong> всички ваши данни:
      </p>
      <ul className="list-disc pl-6 mb-4 text-sm">
        <li>Всички касови бележки и снимки</li>
        <li>Всички бюджети и категории</li>
        <li>Профил и настройки</li>
        <li>Статистики и анализи</li>
      </ul>
      <p className="font-bold mb-4">
        Препоръчваме да експортирате данните си преди изтриване!
      </p>
      <input
        type="text"
        placeholder='Въведете "DELETE" за потвърждение'
        value={deleteConfirmation}
        onChange={(e) => setDeleteConfirmation(e.target.value)}
        className="border p-2 rounded w-full mb-4"
      />
      <div className="flex gap-3">
        <Button onClick={() => setShowDeleteDialog(false)} variant="outline">
          Отказ
        </Button>
        <Button
          variant="destructive"
          disabled={deleteConfirmation !== 'DELETE'}
          onClick={handleDeleteAccount}
        >
          Изтрий профила ми
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)}
```

## 🔒 Security Implementation

### 1. Row-Level Security (RLS) Policies

**Check existing policies:**

```sql
-- View all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Required policies for each table:**

```sql
-- Receipts: Users can only see their own
CREATE POLICY "Users can view their own receipts"
ON public.receipts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own receipts"
ON public.receipts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own receipts"
ON public.receipts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own receipts"
ON public.receipts FOR DELETE
USING (auth.uid() = user_id);

-- Similar policies for: items, budgets, budget_lines, profiles, user_preferences
```

**Enable RLS:**

```sql
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
```

### 2. Input Validation

**Create validation utility (`lib/validation.ts`):**

```typescript
import { z } from 'zod';

// Email validation
export const emailSchema = z.string().email('Невалиден имейл адрес');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Паролата трябва да е поне 8 символа')
  .regex(/[A-Z]/, 'Паролата трябва да съдържа главна буква')
  .regex(/[a-z]/, 'Паролата трябва да съдържа малка буква')
  .regex(/[0-9]/, 'Паролата трябва да съдържа цифра');

// Sanitize file names
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 255);
}

// Sanitize text input (prevent XSS)
export function sanitizeText(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Validate image file
export function validateImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/webp'];
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Невалиден формат. Позволени: JPG, PNG, HEIC, WebP');
  }

  if (file.size > maxSize) {
    throw new Error('Файлът е твърде голям (макс. 50MB)');
  }

  return true;
}
```

### 3. Rate Limiting

**Create rate limiter (`lib/rate-limiter.ts`):**

```typescript
interface RateLimitConfig {
  interval: number; // milliseconds
  maxRequests: number;
}

class RateLimiter {
  private requests = new Map<string, number[]>();

  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const windowStart = now - config.interval;

    // Get existing requests for this key
    const userRequests = this.requests.get(key) || [];

    // Filter out old requests
    const recentRequests = userRequests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (recentRequests.length >= config.maxRequests) {
      return false; // Rate limit exceeded
    }

    // Add new request
    recentRequests.push(now);
    this.requests.set(key, recentRequests);

    return true; // Request allowed
  }

  // Clean old data periodically
  cleanup() {
    const now = Date.now();
    this.requests.forEach((timestamps, key) => {
      const recent = timestamps.filter(time => time > now - 3600000); // Keep last hour
      if (recent.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recent);
      }
    });
  }
}

export const rateLimiter = new RateLimiter();

// Cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

// Rate limit configs
export const RateLimits = {
  upload: { interval: 60000, maxRequests: 10 }, // 10 uploads per minute
  api: { interval: 60000, maxRequests: 60 }, // 60 API calls per minute
  login: { interval: 900000, maxRequests: 5 }, // 5 login attempts per 15 min
};
```

**Usage in API routes:**

```typescript
import { rateLimiter, RateLimits } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  const userId = getUserId(); // Get from session

  // Check rate limit
  if (!rateLimiter.check(userId, RateLimits.upload)) {
    return NextResponse.json(
      { error: 'Твърде много заявки. Моля, изчакайте малко.' },
      { status: 429 }
    );
  }

  // Process request...
}
```

### 4. Consent Management

**Update registration to include consent:**

```typescript
// In app/auth/register/page.tsx

const [consent, setConsent] = useState({
  terms: false,
  privacy: false,
  dataProcessing: false,
});

// Form
<div className="space-y-3">
  <label className="flex items-start">
    <input
      type="checkbox"
      checked={consent.terms}
      onChange={(e) => setConsent({...consent, terms: e.target.checked})}
      className="mt-1"
    />
    <span className="ml-2 text-sm">
      Приемам{' '}
      <Link href="/terms" target="_blank" className="text-blue-600 underline">
        Условията за ползване
      </Link>
    </span>
  </label>

  <label className="flex items-start">
    <input
      type="checkbox"
      checked={consent.privacy}
      onChange={(e) => setConsent({...consent, privacy: e.target.checked})}
      className="mt-1"
    />
    <span className="ml-2 text-sm">
      Приемам{' '}
      <Link href="/privacy" target="_blank" className="text-blue-600 underline">
        Политиката за поверителност
      </Link>
    </span>
  </label>

  <label className="flex items-start">
    <input
      type="checkbox"
      checked={consent.dataProcessing}
      onChange={(e) => setConsent({...consent, dataProcessing: e.target.checked})}
      className="mt-1"
    />
    <span className="ml-2 text-sm">
      Съгласен съм личните ми данни да бъдат обработвани с AI технологии
      (Google Vision, OpenAI) за целите на услугата
    </span>
  </label>
</div>

<Button
  type="submit"
  disabled={!consent.terms || !consent.privacy || !consent.dataProcessing}
>
  Регистрация
</Button>
```

## 📋 Compliance Checklist

### GDPR Requirements

- [x] **Privacy Policy** - Clear, accessible, in Bulgarian
- [x] **Terms of Service** - Legal terms in Bulgarian
- [x] **Right to Access** - Users can export data
- [x] **Right to Erasure** - Users can delete account
- [x] **Right to Portability** - Export in machine-readable format (JSON, CSV)
- [ ] **Consent Management** - Explicit consent on registration
- [ ] **Data Minimization** - Only collect necessary data
- [x] **Purpose Limitation** - Clear purpose for each data type
- [x] **Storage Limitation** - Delete data within 30 days of account deletion
- [ ] **Data Security** - RLS, encryption, validation
- [x] **Transparency** - Clear AI processing disclosure
- [ ] **Right to Object** - Users can opt-out of processing
- [x] **Contact DPO** - Contact info provided

### Bulgarian ЗЗЛД Requirements

- [x] **Bulgarian Language** - All legal docs in Bulgarian
- [x] **КЗЛД Contact** - Bulgarian DPA contact info provided
- [x] **Local Jurisdiction** - Bulgarian law specified
- [x] **User Rights** - All GDPR rights explained in Bulgarian

### Security Requirements

- [ ] **RLS Enabled** - Row-level security on all tables
- [ ] **RLS Tested** - Verified users can't see others' data
- [ ] **Input Validation** - All inputs validated and sanitized
- [ ] **Rate Limiting** - API routes protected
- [ ] **Secure Storage** - Data encrypted at rest and in transit
- [ ] **Password Security** - Bcrypt hashing with high cost
- [ ] **HTTPS Only** - All connections encrypted

## 🚀 Next Steps

1. **Enable RLS policies** (run SQL in Supabase)
2. **Add settings UI** for deletion/export
3. **Update registration** with consent checkboxes
4. **Test RLS** - ensure data isolation
5. **Add rate limiting** to API routes
6. **Validate all inputs** throughout app
7. **Security audit** - test for vulnerabilities

## 📞 Support

For privacy-related questions:
- **Email:** privacy@prizma.bg
- **DPO:** dpo@prizma.bg
- **КЗЛД:** kzld@cpdp.bg

## 📚 Resources

- [GDPR Official Text](https://gdpr.eu/)
- [Bulgarian КЗЛД](https://www.cpdp.bg/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
