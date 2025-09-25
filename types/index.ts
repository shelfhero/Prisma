/**
 * Application Types for Призма Receipt App
 * High-level types for components, API responses, and business logic
 */

import { Database, Tables, TablesInsert, TablesUpdate } from './database';

// Re-export database types for convenience
export type { Database, Tables, TablesInsert, TablesUpdate };

// ============================================================================
// USER TYPES
// ============================================================================

export type User = Database['public']['Tables']['profiles']['Row'];
export type UserInsert = Database['public']['Tables']['profiles']['Insert'];
export type UserUpdate = Database['public']['Tables']['profiles']['Update'];

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
  preferences?: UserPreferences | null;
  analytics?: UserAnalytics | null;
}

export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

export interface UserAnalytics {
  totalReceipts: number;
  totalSpent: number;
  averageReceiptValue: number;
  monthlySpend: number;
  yearlySpend: number;
  topCategories: CategorySpending[];
  topRetailers: RetailerSpending[];
  spendingTrend: SpendingTrend[];
}

export interface SpendingTrend {
  date: string;
  amount: number;
  receipts: number;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  totalItems: number;
  percentage: number;
  lastPurchaseDate: string;
}

export interface RetailerSpending {
  retailerId: string;
  retailerName: string;
  totalSpent: number;
  totalReceipts: number;
  percentage: number;
  lastVisitDate: string;
}

// ============================================================================
// RECEIPT TYPES
// ============================================================================

export type Receipt = Database['public']['Tables']['receipts']['Row'];
export type ReceiptInsert = Database['public']['Tables']['receipts']['Insert'];
export type ReceiptUpdate = Database['public']['Tables']['receipts']['Update'];

export interface ReceiptWithDetails extends Receipt {
  retailer?: Retailer;
  items: ItemWithCategory[];
  images: ReceiptImage[];
  analytics?: ReceiptAnalytics;
}

export interface ReceiptAnalytics {
  totalItems: number;
  uniqueCategories: number;
  averageItemPrice: number;
  mostExpensiveItem: Item;
  categoryBreakdown: CategoryBreakdown[];
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  itemCount: number;
  percentage: number;
}

export interface ReceiptFormData {
  retailerName?: string;
  totalAmount: number;
  taxAmount?: number;
  currency: string;
  purchasedAt: string;
  location?: string;
  paymentMethod?: string;
  notes?: string;
  tags?: string[];
  isExpense: boolean;
  items: ItemFormData[];
}

export interface ItemFormData {
  productName: string;
  productDescription?: string;
  barcode?: string;
  categoryId?: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
}

// ============================================================================
// ITEM TYPES
// ============================================================================

export type Item = Database['public']['Tables']['items']['Row'];
export type ItemInsert = Database['public']['Tables']['items']['Insert'];
export type ItemUpdate = Database['public']['Tables']['items']['Update'];

export interface ItemWithCategory extends Item {
  category?: Category;
}

export interface ItemWithAnalytics extends ItemWithCategory {
  analytics?: ProductAnalytics;
  priceHistory?: PriceHistory[];
}

export interface PriceHistory {
  date: string;
  price: number;
  retailerId: string;
  receiptId: string;
}

export type ProductAnalytics = Database['public']['Tables']['product_analytics']['Row'];

// ============================================================================
// RETAILER TYPES
// ============================================================================

export type Retailer = Database['public']['Tables']['retailers']['Row'];
export type RetailerInsert = Database['public']['Tables']['retailers']['Insert'];
export type RetailerUpdate = Database['public']['Tables']['retailers']['Update'];

export interface RetailerWithAnalytics extends Retailer {
  totalSpent?: number;
  totalReceipts?: number;
  lastVisitDate?: string;
  averageReceiptValue?: number;
  favoriteProducts?: string[];
}

// ============================================================================
// CATEGORY TYPES
// ============================================================================

export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[];
  totalSpent?: number;
  itemCount?: number;
}

export interface CategoryTree {
  categories: CategoryWithChildren[];
  totalCategories: number;
  maxDepth: number;
}

// ============================================================================
// IMAGE TYPES
// ============================================================================

export type ReceiptImage = Database['public']['Tables']['receipt_images']['Row'];
export type ReceiptImageInsert = Database['public']['Tables']['receipt_images']['Insert'];
export type ReceiptImageUpdate = Database['public']['Tables']['receipt_images']['Update'];

export interface ImageUploadData {
  file: File;
  isPrimary?: boolean;
  receiptId: string;
}

export interface ImageProcessingResult {
  imageId: string;
  storagePath: string;
  publicUrl: string;
  processingStatus: 'completed' | 'failed';
  error?: string;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchFilters {
  query?: string;
  startDate?: string;
  endDate?: string;
  categoryIds?: string[];
  retailerIds?: string[];
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
  isExpense?: boolean;
  paymentMethods?: string[];
}

export interface SortOptions {
  field: 'purchased_at' | 'total_amount' | 'created_at' | 'retailer_name';
  direction: 'asc' | 'desc';
}

export interface SearchParams extends SearchFilters {
  page?: number;
  limit?: number;
  sort?: SortOptions;
}


// ============================================================================
// FORM VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FormState<T = any> {
  data: T;
  errors: ValidationError[];
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

export interface ReceiptFormState extends FormState<ReceiptFormData> {
  images: File[];
  processingStatus: 'idle' | 'scanning' | 'processing' | 'completed' | 'error';
}

// ============================================================================
// ANALYTICS & REPORTING TYPES
// ============================================================================

export interface DateRange {
  start: string;
  end: string;
}

export interface ReportFilters extends SearchFilters {
  dateRange: DateRange;
  groupBy: 'day' | 'week' | 'month' | 'year';
  chartType: 'line' | 'bar' | 'pie' | 'area';
}

export interface SpendingReport {
  title: string;
  dateRange: DateRange;
  totalSpent: number;
  totalReceipts: number;
  averageReceiptValue: number;
  data: ReportDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
  retailerBreakdown: RetailerSpending[];
  trends: {
    spendingTrend: 'increasing' | 'decreasing' | 'stable';
    percentageChange: number;
    comparison: 'vs_previous_period' | 'vs_same_period_last_year';
  };
}

export interface ReportDataPoint {
  date: string;
  amount: number;
  receipts: number;
  averageValue: number;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  timestamp: string;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'bg' | 'en';
  currency: string;
  dateFormat: string;
  numberFormat: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
  };
  privacy: {
    shareAnalytics: boolean;
    allowCookies: boolean;
    dataRetention: number; // in days
  };
  features: {
    autoCategorize: boolean;
    smartReceipts: boolean;
    priceTracking: boolean;
    expenseReports: boolean;
  };
}

// ============================================================================
// EXPORT/IMPORT TYPES
// ============================================================================

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  dateRange: DateRange;
  includeImages: boolean;
  includeAnalytics: boolean;
  filters?: SearchFilters;
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileName?: string;
  error?: string;
}

export interface ImportOptions {
  format: 'csv' | 'xlsx' | 'json';
  file: File;
  mapping: Record<string, string>; // Maps CSV columns to receipt fields
  skipDuplicates: boolean;
  validateData: boolean;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
  details: ImportResultDetail[];
}

export interface ImportResultDetail {
  row: number;
  status: 'imported' | 'skipped' | 'error';
  message: string;
  data?: any;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export interface ErrorBoundaryProps extends BaseComponentProps {
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// For better type inference in API responses
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
  ...args: any
) => Promise<infer R>
  ? R
  : any;

// For creating type-safe event handlers
export type EventHandler<T = Event> = (event: T) => void | Promise<void>;

// For creating type-safe form handlers
export type FormHandler<T = any> = (data: T) => void | Promise<void>;