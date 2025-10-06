# Admin Dashboard Setup Guide

## Overview
The admin dashboard provides comprehensive analytics, user management, and system monitoring capabilities for your receipt management application.

## Database Setup

### 1. Run Migrations

First, apply the admin system migration:

```bash
npx supabase migration up
```

Or manually run the migration file:
```sql
-- Execute: supabase/migrations/013_admin_system.sql
```

### 2. Create Your First Admin User

Connect to your Supabase database and run:

```sql
-- Replace 'YOUR_USER_ID' with your actual user ID from auth.users
INSERT INTO admin_roles (user_id, role, is_active)
VALUES ('YOUR_USER_ID', 'super_admin', true);
```

To find your user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

## Admin Roles

The system supports four admin roles with different permission levels:

1. **super_admin** - Full access to all features, including:
   - View and manage all users
   - View audit logs
   - Grant/revoke admin roles
   - Export all data
   - System configuration

2. **admin** - Standard admin access:
   - View all users
   - View analytics
   - Export data
   - Cannot manage admin roles or view audit logs

3. **moderator** - Content moderation:
   - View users
   - Moderate receipts
   - Limited analytics access

4. **analyst** - Read-only analytics access:
   - View metrics and analytics
   - Export reports
   - Cannot modify data

## Accessing the Admin Dashboard

Navigate to: `http://localhost:3000/admin`

**Security Note:** The dashboard automatically checks if the logged-in user has admin privileges. Non-admin users are redirected to the home page.

## Features

### 1. Key Metrics (Overview Tab)
- Total users and active users (7-day window)
- New users today
- Total receipts and daily receipts
- OCR success rate
- Average receipts per user
- Average receipt value
- Top stores by receipt count
- Category spending analysis

### 2. User Management (Users Tab)
- Search users by email
- Paginated user list
- View user details including:
  - Registration date
  - Last sign-in
  - Receipt count
  - Total spending
  - Category distribution
  - Recent receipts

### 3. System Health (System Tab)
- Recent errors and failures
- OCR processing issues
- System status monitoring

### 4. Analytics (Analytics Tab)
- Export data in CSV or JSON format
- Date range filtering
- Aggregated insights

## API Endpoints

All admin endpoints require authentication and admin role verification.

### GET /api/admin/metrics
Returns real-time system metrics, top stores, category spending, and recent errors.

**Response:**
```json
{
  "metrics": {
    "total_users": 247,
    "active_users_7d": 156,
    "new_users_today": 12,
    "total_receipts": 5234,
    "receipts_today": 89,
    "success_rate": 94.2,
    "avg_receipts_per_user": 21.2,
    "avg_receipt_value": 34.50
  },
  "topStores": [...],
  "categorySpending": [...],
  "recentErrors": [...]
}
```

### GET /api/admin/users
Get paginated list of users.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)
- `search` - Email search filter

### POST /api/admin/users
Get detailed information about a specific user.

**Request Body:**
```json
{
  "userId": "uuid"
}
```

### GET /api/admin/audit
View audit logs (super_admin only).

**Query Parameters:**
- `page` - Page number
- `limit` - Results per page
- `action` - Filter by action type
- `admin_id` - Filter by admin user

### GET /api/admin/export
Export data in various formats.

**Query Parameters:**
- `type` - Data type: `metrics`, `users`, or `receipts`
- `format` - Export format: `json` or `csv`
- `start_date` - Optional start date filter
- `end_date` - Optional end date filter

## Activity Logging

All admin actions are automatically logged in the `admin_audit_log` table with:
- Admin user ID
- Action type
- Resource type and ID
- Details (JSON)
- IP address
- User agent
- Timestamp

View logs via: GET /api/admin/audit (super_admin only)

## Security Features

### 1. Role-Based Access Control (RBAC)
Every API endpoint checks admin roles before processing requests.

### 2. Row Level Security (RLS)
Database-level security ensures users can only access authorized data.

### 3. Audit Trail
All administrative actions are logged for compliance and security monitoring.

### 4. Session Management
Admin sessions are tracked separately with:
- Session tokens
- IP address logging
- User agent tracking
- Activity timestamps
- Auto-expiration

### 5. Two-Factor Authentication (2FA) Support
The `admin_sessions` table includes `two_factor_verified` flag for future 2FA implementation.

## Granting Admin Access

To grant admin access to a user (must be executed by super_admin):

```sql
-- Grant admin role
INSERT INTO admin_roles (user_id, role, granted_by, is_active)
VALUES (
  'NEW_ADMIN_USER_ID',
  'admin', -- or 'moderator', 'analyst'
  'YOUR_USER_ID', -- granting admin's ID
  true
);
```

To grant with expiration:
```sql
INSERT INTO admin_roles (user_id, role, granted_by, expires_at, is_active)
VALUES (
  'NEW_ADMIN_USER_ID',
  'moderator',
  'YOUR_USER_ID',
  NOW() + INTERVAL '30 days', -- Expires in 30 days
  true
);
```

## Revoking Admin Access

```sql
UPDATE admin_roles
SET is_active = false
WHERE user_id = 'ADMIN_USER_ID';
```

## Monitoring System Health

The system automatically tracks:
- Total users and growth
- Active user engagement
- Receipt processing success rates
- Error frequencies
- Store and category trends

### Manual Metrics Snapshot

Create a historical snapshot of current metrics:

```sql
SELECT snapshot_system_metrics();
```

This is useful for:
- Daily/weekly reporting
- Trend analysis
- Historical comparisons

## Data Privacy

**IMPORTANT:** Admin dashboard follows privacy-first principles:

1. **Anonymized aggregations** - Store rankings and category spending use aggregated data
2. **No PII exposure** - User emails are only visible to super_admin
3. **Limited data retention** - Audit logs can be configured to auto-expire
4. **Secure exports** - All exports are logged and tracked

## Rate Limiting

Consider implementing rate limiting on admin endpoints:

```typescript
// Example middleware (not included)
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each admin to 100 requests per window
})
```

## IP Whitelisting (Optional)

For additional security, restrict admin access to specific IPs:

```typescript
// Add to admin middleware
const ALLOWED_IPS = ['1.2.3.4', '5.6.7.8']

if (!ALLOWED_IPS.includes(clientIP)) {
  return { authorized: false, error: 'IP not whitelisted' }
}
```

## Troubleshooting

### "Unauthorized: Admin access required"
1. Verify user has an active admin role in `admin_roles` table
2. Check `is_active = true`
3. Verify `expires_at` is NULL or in the future

### Metrics not loading
1. Check Supabase connection
2. Verify RPC functions exist: `get_system_metrics()`, `get_top_stores()`, etc.
3. Check browser console for API errors

### Users not appearing
1. Verify RLS policies allow admin access
2. Check `auth.users` table has data
3. Try clearing filters/search

## Future Enhancements

Consider adding:
- Real-time dashboard updates via WebSockets
- Advanced analytics with charts (Chart.js, Recharts)
- Email notifications for critical events
- Scheduled reports
- Two-factor authentication
- Advanced filtering and search
- Bulk user operations
- System configuration UI

## Support

For issues or questions:
- Check logs in `/api/admin/*` endpoints
- Review `admin_audit_log` table
- Contact: office@myshelfhero.com
