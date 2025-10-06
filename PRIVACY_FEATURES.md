# Privacy Features Implementation - Призма 🔒

## ✅ Completed Features

### 1. **Privacy Policy Page** (`/privacy`)
**Location:** `app/privacy/page.tsx`
**Accessible via:**
- Footer link: "Политика за поверителност"
- Navigation link (when logged out)
- Direct URL: `http://localhost:3000/privacy`

**Features:**
- ✅ Comprehensive GDPR-compliant policy in Bulgarian
- ✅ Clear explanation of what data we collect
- ✅ How we use data (personal budgeting only)
- ✅ AI processing disclosure (Google Vision, OpenAI)
- ✅ User rights (access, erasure, portability)
- ✅ How to delete data
- ✅ КЗЛД (Bulgarian DPA) contact information

### 2. **Terms of Service Page** (`/terms`)
**Location:** `app/terms/page.tsx`
**Accessible via:**
- Footer link: "Условия за ползване"
- Navigation link (when logged out)
- Direct URL: `http://localhost:3000/terms`

**Features:**
- ✅ Usage terms in Bulgarian
- ✅ User rights clearly stated
- ✅ Data ownership (user owns their data)
- ✅ Acceptable use policy
- ✅ Limitations and disclaimers
- ✅ Termination procedures

### 3. **Data Export** (`/settings`)
**Location:** Settings page with export buttons
**API Endpoint:** `app/api/user/export/route.ts`

**Features:**
- ✅ Export all user data in JSON format
- ✅ Export all user data in CSV format
- ✅ Includes: receipts, items, budgets, preferences, statistics
- ✅ GDPR data portability compliance
- ✅ Downloadable files with timestamp

**Usage:**
```typescript
// JSON export
window.open('/api/user/export?format=json', '_blank');

// CSV export
window.open('/api/user/export?format=csv', '_blank');
```

### 4. **Account Deletion** (`/settings`)
**Location:** Settings page with red warning section
**API Endpoint:** `app/api/user/delete/route.ts`

**Features:**
- ✅ Requires explicit "DELETE" confirmation
- ✅ Deletes ALL user data permanently:
  - Receipts and items
  - Budgets and budget lines
  - User preferences
  - Profile data
  - Auth account
- ✅ GDPR right to erasure compliance
- ✅ Warning before deletion
- ✅ Recommendation to export data first

**Usage:**
```typescript
const response = await fetch('/api/user/delete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ confirmation: 'DELETE' })
});
```

### 5. **Registration Consent** (`/auth/register`)
**Location:** `app/auth/register/page.tsx`

**Features:**
- ✅ Separate checkboxes for each consent:
  1. Terms of Service acceptance
  2. Privacy Policy acceptance
  3. AI data processing consent (Google Vision, OpenAI)
- ✅ All three required to register
- ✅ Clear links to legal documents
- ✅ GDPR explicit consent requirement

### 6. **Row Level Security (RLS)**
**Location:** `supabase/migrations/011_row_level_security.sql`

**Features:**
- ✅ Enabled on all tables: profiles, receipts, items, budgets, budget_lines, user_preferences
- ✅ Users can ONLY view their own data
- ✅ Users can ONLY modify their own data
- ✅ Nested policies for related tables (items → receipts → user)
- ✅ GDPR data isolation compliance

**To Apply:**
Run in Supabase SQL Editor:
```bash
npx supabase db push
# OR copy content of 011_row_level_security.sql to Supabase SQL Editor
```

### 7. **Navigation & Footer**
**Locations:**
- `components/layout/Navigation.tsx`
- `components/layout/Footer.tsx` (NEW)

**Features:**
- ✅ Footer on every page with privacy links
- ✅ Privacy features highlighted
- ✅ GDPR badge
- ✅ "Made in Bulgaria" 🇧🇬
- ✅ Links to Privacy & Terms easily accessible

---

## 📍 Where to Find Everything

### For Logged-In Users:
1. **Settings** → Click "Настройки" in top navigation
   - See data export buttons
   - See account deletion option

2. **Footer** → Scroll to bottom of any page
   - Click "Политика за поверителност"
   - Click "Условия за ползване"

### For Logged-Out Users:
1. **Navigation** → Top right links
   - "Поверителност" link
   - "Условия" link

2. **Footer** → Scroll to bottom
   - Privacy Policy link
   - Terms of Service link

3. **Registration** → `/auth/register`
   - See 3 consent checkboxes
   - Links to Privacy & Terms

---

## 🔒 Security Features

### Implemented:
- ✅ **Row Level Security (RLS)** - Users can't see others' data
- ✅ **Middleware Authentication** - Protected routes
- ✅ **Explicit Consent** - All consents required on signup
- ✅ **Data Export** - JSON & CSV formats
- ✅ **Account Deletion** - Permanent with confirmation
- ✅ **Secure Headers** - XSS, clickjacking protection
- ✅ **HTTPS Only** - In production
- ✅ **Environment Variables** - Secrets not exposed

### To Implement (Recommended):
- ⏳ **Rate Limiting** - Prevent abuse
- ⏳ **Input Validation** - Sanitize all inputs
- ⏳ **File Upload Validation** - Check file types/sizes
- ⏳ **CSRF Protection** - Cross-site request forgery
- ⏳ **Analytics Consent** - Optional analytics with opt-out

---

## 🧪 Testing Checklist

### RLS Testing:
```sql
-- 1. Create test user 1, add some receipts
-- 2. Create test user 2, add some receipts
-- 3. Try to query user 1's receipts as user 2:
SELECT * FROM receipts WHERE user_id = '<user1_id>';
-- Should return EMPTY (RLS blocks it)

-- 4. Try to query own receipts:
SELECT * FROM receipts WHERE user_id = auth.uid();
-- Should return only YOUR receipts
```

### Export Testing:
1. Go to Settings
2. Click "Експорт JSON" - should download file
3. Click "Експорт CSV" - should download file
4. Verify files contain your data

### Deletion Testing:
1. Create test account with dummy data
2. Go to Settings
3. Click "Изтрий профила ми"
4. Type "DELETE" in confirmation
5. Click confirm
6. Verify redirect to home
7. Try to log in - should fail (account deleted)

### Consent Testing:
1. Go to `/auth/register`
2. Try to submit without checking boxes - should fail
3. Check only 1-2 boxes - should fail
4. Check all 3 boxes - should succeed

---

## 📊 GDPR Compliance Checklist

- [x] **Lawfulness** - Clear consent obtained
- [x] **Purpose Limitation** - Data used only for budgeting
- [x] **Data Minimization** - Only collect necessary data
- [x] **Accuracy** - Users can update their data
- [x] **Storage Limitation** - Can delete anytime
- [x] **Integrity & Confidentiality** - RLS + encryption
- [x] **Accountability** - Documented policies
- [x] **Right to Access** - Export functionality
- [x] **Right to Erasure** - Delete functionality
- [x] **Right to Portability** - JSON/CSV export
- [x] **Right to Rectification** - Can edit data
- [x] **Transparency** - Clear privacy policy
- [x] **Data Protection by Design** - RLS from start

---

## 🚀 Next Steps (Optional Enhancements)

### 1. Analytics Consent
Add to Settings page:
```typescript
<div className="border-t pt-4">
  <label className="flex items-center">
    <input
      type="checkbox"
      checked={analyticsConsent}
      onChange={(e) => setAnalyticsConsent(e.target.checked)}
    />
    <span className="ml-2">
      Разрешавам анонимна аналитика за подобряване на услугата
    </span>
  </label>
</div>
```

### 2. Data Access Log
Track when users access their data:
```sql
CREATE TABLE data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT, -- 'export', 'delete', 'view'
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Privacy Dashboard
Show users:
- When they registered
- How much data they have
- Last export date
- AI processing count

### 4. Cookie Consent Banner
If using analytics/cookies:
```typescript
<div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4">
  <p>Използваме бисквитки за подобряване на услугата.</p>
  <button onClick={acceptCookies}>Приемам</button>
</div>
```

---

## 📞 Support

Privacy-related questions:
- **Email:** privacy@prizma.bg
- **DPO:** dpo@prizma.bg
- **КЗЛД:** kzld@cpdp.bg

---

## 📚 Resources

- [GDPR Official Text](https://gdpr.eu/)
- [Bulgarian КЗЛД](https://www.cpdp.bg/)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/security)
