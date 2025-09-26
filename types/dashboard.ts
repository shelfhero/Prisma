/**
 * Dashboard-specific TypeScript interfaces for Призма
 * Extended types for the detailed expense breakdown dashboard
 */

import { Database, Tables } from './database';

// ============================================================================
// DASHBOARD DATA TYPES
// ============================================================================

export interface DashboardStats {
  totalReceipts: number;
  totalItems: number;
  totalSpent: number;
  averagePerReceipt: number;
  monthlyBudget?: number;
  budgetUsed: number;
  budgetRemaining: number;
  selectedMonth: string;
  selectedYear: number;
}

export interface CategoryWithDetails {
  id: string;
  name: string;
  icon: string;
  color: string;
  totalSpent: number;
  itemCount: number;
  percentage: number;
  budgetAmount?: number;
  budgetUsed: number;
  budgetRemaining: number;
  budgetStatus: 'good' | 'warning' | 'danger';
  isExpanded: boolean;
  items: DetailedReceiptItem[];
}

export interface DetailedReceiptItem {
  id: string;
  receiptId: string;
  productName: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  totalPrice: number;
  purchaseDate: string;
  storeName: string;
  storeId: string | null;
  receiptNumber: string | null;
  categoryId: string;
  categoryName: string;
}

export interface StoreGroup {
  storeId: string | null;
  storeName: string;
  totalSpent: number;
  itemCount: number;
  receiptCount: number;
  items: DetailedReceiptItem[];
}

export interface CategoryBreakdownData {
  category: CategoryWithDetails;
  stores: StoreGroup[];
  totalSpent: number;
  itemCount: number;
  averageItemPrice: number;
  mostExpensiveItem: DetailedReceiptItem | null;
  mostFrequentStore: string | null;
  spendingTrend: 'up' | 'down' | 'stable';
}

// ============================================================================
// DASHBOARD FILTERS & SORTING
// ============================================================================

export interface DashboardFilters {
  month: number;
  year: number;
  storeFilter: string;
  searchQuery: string;
  dateRange: {
    start: string;
    end: string;
  };
  hideEmptyCategories: boolean;
  sortBy: 'date' | 'amount' | 'store' | 'product';
  sortOrder: 'asc' | 'desc';
  pageSize: number;
  currentPage: number;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  format?: 'currency' | 'date' | 'number' | 'text';
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface ItemActionResult {
  success: boolean;
  message: string;
  updatedItem?: DetailedReceiptItem;
  error?: string;
}

export interface BudgetUpdateData {
  categoryId: string;
  amount: number;
  month: number;
  year: number;
}

export interface ExportData {
  categories: CategoryBreakdownData[];
  totalStats: DashboardStats;
  filters: DashboardFilters;
  exportDate: string;
  format: 'csv' | 'excel' | 'pdf';
}

// ============================================================================
// BULGARIAN LOCALIZATION TYPES
// ============================================================================

export interface BulgarianDateFormats {
  short: string; // DD.MM.YYYY
  long: string;  // DD месец YYYY
  time: string;  // HH:mm
  dateTime: string; // DD.MM.YYYY HH:mm
}

export interface BulgarianNumberFormats {
  currency: (amount: number) => string; // 12,50 лв
  number: (num: number) => string;      // 1 234,56
  percentage: (pct: number) => string;  // 23,5%
  quantity: (qty: number, unit?: string) => string; // 2,5 кг
}

export interface BulgarianCategories {
  'cat-basic-foods': {
    id: string;
    name: 'Основни храни';
    icon: '🍎';
    color: string;
  };
  'cat-ready-foods': {
    id: string;
    name: 'Готови храни';
    icon: '🍕';
    color: string;
  };
  'cat-beverages': {
    id: string;
    name: 'Напитки';
    icon: '🍺';
    color: string;
  };
  'cat-snacks': {
    id: string;
    name: 'Закуски';
    icon: '🍭';
    color: string;
  };
  'cat-non-food': {
    id: string;
    name: 'Нехранителни';
    icon: '🧴';
    color: string;
  };
}

// ============================================================================
// DASHBOARD STATE MANAGEMENT
// ============================================================================

export interface DashboardState {
  loading: boolean;
  error: string | null;
  stats: DashboardStats;
  categories: CategoryBreakdownData[];
  filters: DashboardFilters;
  selectedCategory: string | null;
  expandedCategories: Set<string>;
  editingItem: DetailedReceiptItem | null;
  showExportModal: boolean;
  showBudgetModal: boolean;
}

export type DashboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_STATS'; payload: DashboardStats }
  | { type: 'SET_CATEGORIES'; payload: CategoryBreakdownData[] }
  | { type: 'UPDATE_FILTERS'; payload: Partial<DashboardFilters> }
  | { type: 'TOGGLE_CATEGORY'; payload: string }
  | { type: 'SELECT_CATEGORY'; payload: string | null }
  | { type: 'SET_EDITING_ITEM'; payload: DetailedReceiptItem | null }
  | { type: 'TOGGLE_MODAL'; payload: { modal: 'export' | 'budget'; show: boolean } }
  | { type: 'UPDATE_ITEM'; payload: { itemId: string; updates: Partial<DetailedReceiptItem> } }
  | { type: 'DELETE_ITEM'; payload: string };

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface DashboardApiResponse {
  success: boolean;
  data: {
    stats: DashboardStats;
    categories: CategoryBreakdownData[];
    totalRecords: number;
  };
  error?: string;
  timestamp: string;
}

export interface ItemUpdateRequest {
  itemId: string;
  productName?: string;
  quantity?: number;
  unitPrice?: number;
  categoryId?: string;
  notes?: string;
}

export interface BudgetApiResponse {
  success: boolean;
  data: {
    categoryId: string;
    budgetAmount: number;
    used: number;
    remaining: number;
    status: 'good' | 'warning' | 'danger';
  };
  error?: string;
}

// ============================================================================
// COMPONENT PROP TYPES
// ============================================================================

export interface DashboardHeaderProps {
  stats: DashboardStats;
  filters: DashboardFilters;
  onFiltersChange: (filters: Partial<DashboardFilters>) => void;
  onAddExpense: () => void;
  onEditBudget: () => void;
  onExportData: () => void;
}

export interface CategorySectionProps {
  category: CategoryBreakdownData;
  isExpanded: boolean;
  onToggle: () => void;
  onItemEdit: (item: DetailedReceiptItem) => void;
  onItemDelete: (itemId: string) => void;
  filters: DashboardFilters;
  onFiltersChange: (filters: Partial<DashboardFilters>) => void;
}

export interface ItemTableProps {
  items: DetailedReceiptItem[];
  loading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  onEdit: (item: DetailedReceiptItem) => void;
  onDelete: (itemId: string) => void;
  showReceipt: (receiptId: string) => void;
}

export interface StatsCardsProps {
  stats: DashboardStats;
  loading: boolean;
  trend?: {
    spending: number;
    receipts: number;
    comparison: 'vs_last_month' | 'vs_same_month_last_year';
  };
}

export interface BudgetProgressProps {
  budgetAmount: number;
  used: number;
  status: 'good' | 'warning' | 'danger';
  showDetails?: boolean;
  onEdit?: () => void;
}

// ============================================================================
// UTILITY TYPES FOR BULGARIAN FORMATTING
// ============================================================================

export interface BulgarianUIStrings {
  dashboard: {
    title: 'Призма - Табло за разходи';
    subtitle: 'Преглед на разходите по категории';
    loading: 'Зареждане на данни...';
    error: 'Възникна грешка при зареждането';
    noData: 'Няма данни за избрания период';
    refresh: 'Обнови данните';
  };
  categories: {
    basicFoods: 'Основни храни';
    readyFoods: 'Готови храни';
    beverages: 'Напитки';
    snacks: 'Закуски';
    nonFood: 'Нехранителни';
  };
  table: {
    store: 'Магазин';
    date: 'Дата';
    product: 'Продукт';
    quantity: 'Количество';
    amount: 'Сума';
    receipt: 'Касов бон';
    actions: 'Действия';
    edit: 'Редактирай';
    delete: 'Изтрий';
    view: 'Виж';
  };
  actions: {
    addExpense: 'Добави разход';
    editBudget: 'Редактирай бюджет';
    exportData: 'Експортирай данни';
    save: 'Запази';
    cancel: 'Откажи';
    confirm: 'Потвърди';
    delete: 'Изтрий';
  };
  filters: {
    searchPlaceholder: 'Търси продукт...';
    storePlaceholder: 'Всички магазини';
    sortBy: 'Сортирай по';
    sortOrder: 'Ред на сортиране';
    hideEmpty: 'Скрий празни категории';
    dateRange: 'Период';
    month: 'Месец';
    year: 'Година';
  };
  months: {
    january: 'Януари';
    february: 'Февруари';
    march: 'Март';
    april: 'Април';
    may: 'Май';
    june: 'Юни';
    july: 'Юли';
    august: 'Август';
    september: 'Септември';
    october: 'Октомври';
    november: 'Ноември';
    december: 'Декември';
  };
}