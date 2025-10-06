# Error Handling System - Призма

## Overview

Comprehensive error handling system that provides user-friendly Bulgarian error messages, offline support, and automatic retry mechanisms.

## Principles

1. **Never show technical errors to users** - All errors are translated to Bulgarian
2. **Always be actionable** - Tell users what to do next
3. **Be helpful** - Provide retry buttons and support contact
4. **Offline-first** - Queue operations when offline, sync when back online
5. **Fail gracefully** - Show fallback UI instead of crashing

## Architecture

### 1. Error Translation (`lib/error-handler.ts`)

Central error translation system that converts any error to user-friendly Bulgarian messages.

```typescript
import { translateError, BudgetErrors, ReceiptErrors } from '@/lib/error-handler';

try {
  // Some operation
} catch (error) {
  const appError = translateError(error, 'ocr'); // Context helps translation
  // appError contains: title, message, canRetry, showSupport
}
```

### 2. Error Display (`components/error/ErrorDisplay.tsx`)

Reusable component for displaying errors:

```typescript
<ErrorDisplay
  error={appError}
  onRetry={() => retryOperation()}
  onDismiss={() => setError(null)}
  showDismiss={true}
/>
```

Features:
- Color-coded by error type (red for critical, yellow for validation, blue for network)
- Retry button when applicable
- Support contact info when needed
- Technical details in development mode

### 3. Error Boundary (`components/error/ErrorBoundary.tsx`)

Catches React errors and prevents app crashes:

```typescript
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

Features:
- Friendly error page
- Reload and home buttons
- Support contact info
- Technical details in development

### 4. Budget Validation (`lib/budget-validation.ts`)

Specific validation for budget operations:

```typescript
import { validateBudgetSetup, checkCategoryOverBudget } from '@/lib/budget-validation';

// Validate budget setup
const result = validateBudgetSetup(totalBudget, categoryAllocations);
if (!result.isValid) {
  // Show errors: result.errors
  // Show warnings: result.warnings
}

// Check if over budget
const error = checkCategoryOverBudget('Храни', 500, 400);
if (error) {
  // Show error
}
```

## Error Types

### Network Errors
- **Title**: "Няма връзка с интернет"
- **Message**: "Моля, проверете интернет връзката си и опитайте отново"
- **Can Retry**: Yes
- **Support**: No

### Authentication Errors
- **Title**: "Изтекла сесия"
- **Message**: "Вашата сесия е изтекла. Моля, влезте отново в профила си"
- **Can Retry**: No
- **Support**: No

### Upload Errors
- **Title**: "Грешка при качване"
- **Message**: "Файлът не може да бъде качен. Моля, проверете размера и формата на файла"
- **Can Retry**: Yes
- **Support**: Yes

### OCR Errors
- **Title**: "Грешка при разпознаване"
- **Message**: "Не успяхме да разпознаем текста от снимката. Моля, опитайте с по-ясна снимка"
- **Can Retry**: Yes
- **Support**: Yes

### Budget Validation Errors

#### Negative Budget
- **Title**: "Невалиден бюджет"
- **Message**: "Бюджетът не може да бъде отрицателен. Моля, въведете положителна сума"

#### Total Mismatch
- **Title**: "Несъответствие в сумата"
- **Message**: "Сумата по категории (X лв) не съвпада с общия бюджет (Y лв)"

#### Category Over Budget
- **Title**: "Надвишен бюджет"
- **Message**: "Надвишихте бюджета за [категория]. Похарчили сте X лв от Y лв"

#### Total Over Budget
- **Title**: "Надвишен общ бюджет"
- **Message**: "Похарчили сте X лв от общия бюджет Y лв"

### Receipt Errors

#### File Too Big
- **Title**: "Файлът е твърде голям"
- **Message**: "Файлът не може да бъде по-голям от X MB"

#### Invalid File Type
- **Title**: "Невалиден формат"
- **Message**: "Моля, качете снимка във формат JPG, PNG или PDF"

#### Blurry Image
- **Title**: "Неясна снимка"
- **Message**: "Снимката е твърде неясна за разпознаване. Моля, направете по-ясна снимка"

#### No Text Found
- **Title**: "Не е открит текст"
- **Message**: "Не успяхме да открием текст в снимката"

## Offline Support

### 1. Offline Detection (`hooks/useOffline.tsx`)

Hook for detecting network status:

```typescript
import { useOffline } from '@/hooks/useOffline';

function MyComponent() {
  const { isOffline, isOnline, wasOffline } = useOffline();

  if (isOffline) {
    return <div>Вие сте офлайн</div>;
  }

  if (wasOffline) {
    return <div>Връзката е възстановена!</div>;
  }
}
```

### 2. Offline Indicator (`components/offline/OfflineIndicator.tsx`)

Banner that shows at top of page when offline:
- Red banner: "Няма връзка с интернет"
- Green banner (temporary): "Връзката е възстановена"

### 3. Upload Queue (`lib/upload-queue.ts`)

Queue system for offline uploads:

```typescript
import { uploadQueue } from '@/lib/upload-queue';

// Add to queue
const id = uploadQueue.add({
  type: 'receipt',
  data: receiptData,
  file: imageFile,
});

// Process queue when online
await uploadQueue.process(async (item) => {
  // Upload the item
  await uploadReceipt(item.data, item.file);
});
```

Features:
- Persists to localStorage
- Auto-retries (max 3 times)
- Processes automatically when back online
- Shows queue status to user

### 4. Upload Queue Hook (`hooks/useUploadQueue.tsx`)

React hook for upload queue:

```typescript
import { useUploadQueue } from '@/hooks/useUploadQueue';

function MyComponent() {
  const { queue, pendingCount, add, process } = useUploadQueue();

  // Add to queue
  add({
    type: 'receipt',
    data: receiptData,
  });

  // Process queue
  await process(async (item) => {
    await uploadItem(item);
  });

  return <div>Pending uploads: {pendingCount}</div>;
}
```

## Usage Examples

### Example 1: Handle API Error

```typescript
import { translateError, logError } from '@/lib/error-handler';
import ErrorDisplay from '@/components/error/ErrorDisplay';

async function fetchData() {
  try {
    const response = await fetch('/api/receipts');
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    const appError = translateError(error);
    logError(appError, error);
    setError(appError);
  }
}

return error ? (
  <ErrorDisplay
    error={error}
    onRetry={fetchData}
    onDismiss={() => setError(null)}
  />
) : (
  <div>Content</div>
);
```

### Example 2: Validate Budget

```typescript
import { validateBudgetSetup } from '@/lib/budget-validation';
import { toast } from 'sonner';

function saveBudget() {
  const result = validateBudgetSetup(totalBudget, categoryAllocations);

  if (!result.isValid) {
    // Show errors
    result.errors.forEach(error => {
      toast.error(error.title, { description: error.message });
    });
    return;
  }

  // Show warnings (but allow to continue)
  result.warnings.forEach(warning => {
    toast.warning(warning.title, { description: warning.message });
  });

  // Proceed with save
  await saveBudgetToDatabase();
}
```

### Example 3: Upload with Queue

```typescript
import { useUploadQueue } from '@/hooks/useUploadQueue';
import { useOffline } from '@/hooks/useOffline';
import { toast } from 'sonner';

function UploadReceipt() {
  const { add, process } = useUploadQueue();
  const { isOffline } = useOffline();

  async function handleUpload(file: File) {
    if (isOffline) {
      // Add to queue
      add({
        type: 'receipt',
        data: { file },
      });
      toast.info('Добавено в опашка', {
        description: 'Ще се качи когато се свържете отново'
      });
    } else {
      // Upload directly
      try {
        await uploadReceipt(file);
        toast.success('Качено успешно!');
      } catch (error) {
        const appError = translateError(error);
        toast.error(appError.title, { description: appError.message });
      }
    }
  }
}
```

### Example 4: Check Budget Status

```typescript
import { getBudgetStatus } from '@/lib/budget-validation';

function BudgetProgress({ spent, limit, category }) {
  const status = getBudgetStatus(spent, limit, category);

  return (
    <div>
      <ProgressBar percentage={status.percentage} status={status.status} />
      <p className={getStatusColor(status.status)}>
        {status.message}
      </p>
      {status.error && <ErrorDisplay error={status.error} />}
    </div>
  );
}
```

## Best Practices

### 1. Always Use translateError

```typescript
// ❌ Bad
catch (error) {
  toast.error(error.message);
}

// ✅ Good
catch (error) {
  const appError = translateError(error, 'upload');
  toast.error(appError.title, { description: appError.message });
}
```

### 2. Provide Context

```typescript
// ❌ Bad
const error = translateError(err);

// ✅ Good
const error = translateError(err, 'ocr'); // Helps with better error messages
```

### 3. Log Errors in Development

```typescript
import { logError } from '@/lib/error-handler';

catch (error) {
  const appError = translateError(error);
  logError(appError, error); // Logs technical details in dev mode
}
```

### 4. Show Retry for Recoverable Errors

```typescript
// ✅ Good
<ErrorDisplay
  error={networkError} // canRetry: true
  onRetry={() => refetch()}
/>
```

### 5. Use Upload Queue for Offline Support

```typescript
// ✅ Good
if (navigator.onLine) {
  await uploadDirectly();
} else {
  uploadQueue.add({ type: 'receipt', data });
  toast.info('Ще се качи когато се свържете отново');
}
```

## Testing

### Test Offline Mode
1. Open DevTools → Network tab
2. Set to "Offline"
3. Try to upload a receipt
4. Should see red banner and item added to queue
5. Set back to "Online"
6. Should see green banner and queue processing

### Test Error Boundary
1. Throw an error in a component
2. Should see friendly error page instead of crash
3. Click "Презареди страницата"
4. Should recover

### Test Budget Validation
1. Try to create budget with negative amount
2. Should see: "Бюджетът не може да бъде отрицателен"
3. Try category allocations that don't match total
4. Should see: "Сумата по категории не съвпада"

## Support Contact

Default support info (can be customized):
- Email: support@prizma.bg
- Phone: +359 888 123 456
- Hours: Пон-Пет: 9:00-18:00

## Future Enhancements

1. **Error Analytics** - Track error frequency and types
2. **Sentry Integration** - Automatic error reporting
3. **Smart Retry** - Exponential backoff with jitter
4. **Queue UI** - Show queue status in UI
5. **Offline Mode** - Cache more data for offline use
6. **Error Recovery** - Auto-fix common errors
