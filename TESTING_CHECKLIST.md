# Призма - Manual Testing Checklist

## Pre-Release Testing Checklist

### 🔐 Authentication & Authorization

#### Registration
- [ ] User can register with valid email and password
- [ ] Email validation works (invalid format shows error)
- [ ] Password strength validation works (min 8 chars)
- [ ] Email confirmation sent successfully
- [ ] Can't register with existing email (shows error)
- [ ] Terms and conditions checkbox required

#### Login
- [ ] User can login with valid credentials
- [ ] Invalid credentials show appropriate error
- [ ] "Remember me" functionality works
- [ ] Forgot password link works
- [ ] Social login works (if implemented)
- [ ] Session persists after browser refresh
- [ ] Auto-redirect to /receipts after login

#### Logout
- [ ] User can logout successfully
- [ ] Session cleared after logout
- [ ] Redirected to login page after logout
- [ ] Protected routes inaccessible after logout

---

### 📸 Receipt Upload & Processing

#### File Upload
- [ ] Can select image from device (JPG, PNG, WebP)
- [ ] File size validation works (<10MB)
- [ ] Drag-and-drop upload works
- [ ] Multiple file upload works
- [ ] Upload progress indicator shows
- [ ] Cancel upload works
- [ ] Error shown for unsupported formats
- [ ] Camera capture works on mobile

#### OCR Processing
- [ ] Receipt uploaded successfully triggers OCR
- [ ] Processing status shows (loading indicator)
- [ ] Lidl receipts recognized correctly
- [ ] Other Bulgarian stores recognized (Billa, Kaufland, etc)
- [ ] Text extraction accurate (merchant, date, items, total)
- [ ] Handwritten receipts handled gracefully
- [ ] Blurry/low quality images show appropriate message
- [ ] Dual OCR fallback works (Google Vision + GPT-4)

#### Data Verification
- [ ] Verification page shows extracted data
- [ ] Can edit merchant name
- [ ] Can edit date
- [ ] Can edit total amount
- [ ] Can edit individual items
- [ ] Can delete items
- [ ] Can add items manually
- [ ] Currency format correct (BGN/лв)
- [ ] Date format correct (DD.MM.YYYY)

---

### 🗂️ Receipt Management

#### Receipt List
- [ ] All receipts displayed correctly
- [ ] Receipts sorted by date (newest first)
- [ ] Pagination works (if >50 receipts)
- [ ] Search by merchant works
- [ ] Filter by category works
- [ ] Filter by date range works
- [ ] Filter by amount range works
- [ ] Empty state shown when no receipts

#### Receipt Details
- [ ] Can view full receipt details
- [ ] Image preview loads correctly
- [ ] Can zoom image
- [ ] All items displayed with prices
- [ ] Category shown for each item
- [ ] Can edit receipt after confirmation
- [ ] Can delete receipt (with confirmation)
- [ ] Receipt PDF export works

---

### 🏷️ Categorization

#### Auto-Categorization
- [ ] Items auto-categorized on upload
- [ ] Bulgarian product names recognized
- [ ] Learning from corrections works
- [ ] User-specific corrections saved
- [ ] Confidence score shown (if low confidence)

#### Manual Categorization
- [ ] Can change item category
- [ ] Category dropdown shows all options
- [ ] Custom categories can be added (if feature exists)
- [ ] Category change saves correctly
- [ ] Category statistics updated after change

---

### 💰 Budget & Analytics

#### Budget Settings
- [ ] Can set monthly budget per category
- [ ] Can set overall monthly budget
- [ ] Budget warnings shown when exceeded
- [ ] Budget reset works monthly
- [ ] Can edit budget limits
- [ ] Can disable budget tracking

#### Analytics Dashboard
- [ ] Total spending shown correctly
- [ ] Category breakdown accurate
- [ ] Charts render correctly
- [ ] Date range filter works
- [ ] Export analytics to CSV works
- [ ] Monthly comparison works
- [ ] Top merchants shown correctly

---

### 👤 User Settings

#### Profile Settings
- [ ] Can view profile information
- [ ] Can update display name
- [ ] Can change email (with verification)
- [ ] Can change password
- [ ] Can set preferred language (БГ/EN)
- [ ] Can set currency preference
- [ ] Can enable/disable notifications

#### Privacy Settings
- [ ] Can view data usage policy
- [ ] Can download personal data
- [ ] Can delete account (with confirmation)
- [ ] Data deletion confirmation sent
- [ ] Privacy settings persist

---

### 👨‍💼 Admin Dashboard (Admin Only)

#### System Metrics
- [ ] Total users count accurate
- [ ] Total receipts count accurate
- [ ] Storage usage shown correctly
- [ ] Active users (last 30 days) accurate
- [ ] Processing success rate shown
- [ ] Charts render correctly

#### User Management
- [ ] Can view all users
- [ ] Can search users by email
- [ ] Can view user details
- [ ] Can view user receipts
- [ ] Can view user activity
- [ ] Pagination works correctly

#### Data Management
- [ ] Can export all data (JSON/CSV)
- [ ] Can filter export by date
- [ ] Can export user list
- [ ] Can export receipts
- [ ] Can export metrics

#### Audit Logs (Super Admin Only)
- [ ] All admin actions logged
- [ ] Can filter by action type
- [ ] Can filter by admin user
- [ ] Can filter by date
- [ ] Export audit logs works

---

### 📱 Mobile Responsiveness

#### Mobile UI (375px - 768px)
- [ ] Navigation menu works (hamburger)
- [ ] Upload button accessible
- [ ] Receipt list readable
- [ ] Images display correctly
- [ ] Forms usable (inputs not too small)
- [ ] Buttons tap-friendly (min 44px)
- [ ] No horizontal scroll
- [ ] Camera access works

#### Tablet UI (768px - 1024px)
- [ ] Layout adapts correctly
- [ ] Multi-column layout works
- [ ] Touch interactions work
- [ ] Navigation accessible

---

### 🌐 Browser Compatibility

#### Chrome/Edge (Chromium)
- [ ] All features work
- [ ] Camera access works
- [ ] File upload works
- [ ] No console errors

#### Firefox
- [ ] All features work
- [ ] Camera access works
- [ ] File upload works
- [ ] No console errors

#### Safari (iOS/macOS)
- [ ] All features work
- [ ] Camera access works
- [ ] File upload works
- [ ] No console errors
- [ ] Image orientation correct

---

### ⚡ Performance

#### Page Load
- [ ] Homepage loads <3s (on 3G)
- [ ] Receipt list loads <2s
- [ ] Images lazy-load
- [ ] No layout shift (CLS < 0.1)

#### Interactions
- [ ] Upload responsive (<500ms)
- [ ] Navigation instant (<100ms)
- [ ] Search results <1s
- [ ] No janky animations

#### Bundle Size
- [ ] Initial bundle <500KB
- [ ] Gzipped bundle <200KB
- [ ] Code splitting works
- [ ] Tree-shaking effective

---

### 🔄 Offline Support

- [ ] App loads offline (cached)
- [ ] Offline indicator shown
- [ ] Queued uploads work when back online
- [ ] Service worker registered
- [ ] Cache updated on new version

---

### 🛡️ Security

#### Authentication
- [ ] Passwords hashed (not visible in DB)
- [ ] JWT tokens expire correctly
- [ ] Refresh token rotation works
- [ ] CSRF protection enabled

#### Authorization
- [ ] Protected routes require auth
- [ ] Admin routes require admin role
- [ ] API endpoints check permissions
- [ ] User can only see own data

#### Data Protection
- [ ] HTTPS enforced
- [ ] XSS protection enabled
- [ ] SQL injection prevented (parameterized queries)
- [ ] File upload validation (type, size)
- [ ] Rate limiting on API endpoints

---

### 🐛 Error Handling

#### User Errors
- [ ] Form validation errors clear
- [ ] API errors shown to user
- [ ] Network errors handled gracefully
- [ ] Retry logic for failed requests

#### System Errors
- [ ] 404 page shown for invalid routes
- [ ] 500 page shown for server errors
- [ ] Error boundary catches React errors
- [ ] Errors logged to Sentry (when integrated)

---

### ♿ Accessibility

#### Keyboard Navigation
- [ ] All interactive elements focusable
- [ ] Focus indicators visible
- [ ] Tab order logical
- [ ] Can use app without mouse

#### Screen Readers
- [ ] Alt text on all images
- [ ] ARIA labels on buttons
- [ ] Form labels associated
- [ ] Status messages announced

#### Visual
- [ ] Color contrast ratio >4.5:1
- [ ] Text resizable to 200%
- [ ] No info conveyed by color alone

---

### 🌍 Internationalization

#### Bulgarian Language
- [ ] All UI text in Bulgarian
- [ ] Date format DD.MM.YYYY
- [ ] Currency BGN/лв
- [ ] Number format 1.234,56

#### English Language (if supported)
- [ ] All UI text in English
- [ ] Date format MM/DD/YYYY
- [ ] Currency symbols correct
- [ ] Number format 1,234.56

---

## Beta Testing Focus Areas

### High Priority
1. **Receipt OCR Accuracy** - Test with receipts from major Bulgarian stores
2. **Auto-Categorization** - Verify Bulgarian product recognition
3. **Mobile Camera Upload** - Test on various devices
4. **Budget Tracking** - Ensure calculations accurate
5. **Performance** - Page load times, bundle size

### Medium Priority
6. **Data Export** - Verify CSV/JSON format
7. **Search & Filters** - Test various combinations
8. **Error Messages** - Clear and helpful in Bulgarian
9. **Offline Support** - Queue and sync behavior

### Low Priority (Nice to Have)
10. **Animation Performance** - Smooth on low-end devices
11. **Dark Mode** - If implemented
12. **PWA Install** - Add to home screen

---

## Bug Report Template

When reporting bugs, include:

```markdown
**Bug Title**: [Clear, concise description]

**Steps to Reproduce**:
1. Go to...
2. Click on...
3. See error

**Expected Behavior**:
What should happen

**Actual Behavior**:
What actually happens

**Screenshots/Video**:
[Attach if possible]

**Environment**:
- Browser: Chrome 120
- Device: iPhone 14
- OS: iOS 17.2
- App Version: 1.0.0

**Additional Context**:
Any other relevant info
```

---

## Testing Tools

### Automated Tests
- `npm run test:e2e` - Run Playwright tests
- `npm run test:e2e:ui` - Run tests with UI
- `npm run test:e2e:debug` - Debug mode

### Performance Tests
- Google Lighthouse (Chrome DevTools)
- WebPageTest.org
- Chrome UX Report

### Accessibility Tests
- axe DevTools (Chrome Extension)
- WAVE (Web Accessibility Evaluation Tool)
- Screen reader testing (NVDA/JAWS/VoiceOver)

---

## Sign-off Checklist

Before releasing to production:

- [ ] All critical bugs fixed
- [ ] Playwright tests passing
- [ ] Lighthouse score >70
- [ ] No console errors
- [ ] Documentation updated
- [ ] Privacy policy reviewed
- [ ] Terms of service reviewed
- [ ] Backup strategy tested
- [ ] Monitoring configured
- [ ] Error tracking active
- [ ] Beta testers approved
