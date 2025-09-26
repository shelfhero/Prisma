/**
 * Advanced Analytics Types for Призма
 * Comprehensive financial insight interfaces for dashboard analytics
 */

// ============================================================================
// SPENDING TRENDS ANALYTICS
// ============================================================================

export interface MonthlySpendingData {
  month: number;
  year: number;
  monthName: string;
  totalSpent: number;
  receiptsCount: number;
  itemsCount: number;
  averageReceiptValue: number;
  categoryBreakdown: CategorySpendingMonth[];
  topStores: StoreSpendingMonth[];
  trend: {
    percentage: number;
    direction: 'up' | 'down' | 'stable';
    comparison: 'vs_previous_month' | 'vs_same_month_last_year';
  };
}

export interface CategorySpendingMonth {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  itemCount: number;
}

export interface StoreSpendingMonth {
  storeId: string;
  storeName: string;
  amount: number;
  receiptsCount: number;
  percentage: number;
}

export interface SpendingTrendChart {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    fill: boolean;
  }[];
  maxValue: number;
  avgValue: number;
  trendDirection: 'up' | 'down' | 'stable';
}

// ============================================================================
// STORE LOYALTY ANALYTICS
// ============================================================================

export interface StoreLoyaltyAnalysis {
  storeId: string;
  storeName: string;
  totalSpent: number;
  receiptsCount: number;
  itemsCount: number;
  averageReceiptValue: number;
  loyaltyScore: number; // 0-100 based on frequency and amount
  firstVisit: string;
  lastVisit: string;
  visitFrequency: {
    average: number; // days between visits
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  favoriteCategories: CategorySpendingStore[];
  priceComparison: {
    vs_average: number; // percentage difference from average market price
    ranking: 'cheapest' | 'expensive' | 'average';
  };
  recommendations: StoreLoyaltyRecommendation[];
}

export interface CategorySpendingStore {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  itemCount: number;
  averagePrice: number;
}

export interface StoreLoyaltyRecommendation {
  type: 'save_money' | 'visit_more' | 'try_alternatives' | 'price_alert';
  message: string;
  priority: 'high' | 'medium' | 'low';
  potentialSaving?: number;
}

// ============================================================================
// CATEGORY INSIGHTS ANALYTICS
// ============================================================================

export interface CategoryInsight {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  currentMonthSpent: number;
  previousMonthSpent: number;
  yearToDateSpent: number;
  trend: {
    monthOverMonth: {
      percentage: number;
      direction: 'growing' | 'shrinking' | 'stable';
      amount: number;
    };
    yearOverYear: {
      percentage: number;
      direction: 'growing' | 'shrinking' | 'stable';
      amount: number;
    };
  };
  seasonality: {
    peak_months: number[];
    low_months: number[];
    pattern: 'seasonal' | 'steady' | 'irregular';
  };
  insights: CategoryRecommendation[];
  priceEvolution: PriceEvolution[];
}

export interface CategoryRecommendation {
  type: 'budget_warning' | 'seasonal_tip' | 'price_alert' | 'saving_opportunity';
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  potentialSaving?: number;
}

export interface PriceEvolution {
  month: number;
  year: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  itemCount: number;
}

// ============================================================================
// RECEIPT PHOTO & THUMBNAILS
// ============================================================================

export interface ReceiptThumbnail {
  receiptId: string;
  imageId: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  ocrConfidence?: number;
  processingStatus: 'pending' | 'completed' | 'failed';
}

// ============================================================================
// DUPLICATE DETECTION
// ============================================================================

export interface DuplicateItemGroup {
  groupId: string;
  productName: string;
  similarityScore: number; // 0-1
  items: DuplicateItem[];
  recommendedAction: 'keep_all' | 'merge' | 'review_manually';
  potentialDuplicates: number;
}

export interface DuplicateItem {
  id: string;
  receiptId: string;
  productName: string;
  storeName: string;
  price: number;
  quantity: number;
  purchaseDate: string;
  confidence: number; // how confident we are this is a duplicate
  reasons: DuplicateReason[];
}

export interface DuplicateReason {
  type: 'exact_name' | 'similar_name' | 'same_barcode' | 'same_store_same_day' | 'price_similarity';
  confidence: number;
  description: string;
}

// ============================================================================
// PRICE COMPARISON
// ============================================================================

export interface PriceComparison {
  productName: string;
  normalizedName: string;
  barcode?: string;
  category: string;
  stores: StorePriceData[];
  analysis: {
    cheapestStore: string;
    mostExpensiveStore: string;
    averagePrice: number;
    priceRange: {
      min: number;
      max: number;
      spread: number;
      spreadPercentage: number;
    };
    recommendations: PriceRecommendation[];
  };
  priceHistory: PriceHistoryPoint[];
}

export interface StorePriceData {
  storeId: string;
  storeName: string;
  currentPrice: number;
  unit?: string;
  lastPurchase: string;
  purchaseCount: number;
  priceRank: number; // 1 = cheapest
  savingsVsAverage: number;
  priceStability: 'stable' | 'fluctuating' | 'increasing' | 'decreasing';
}

export interface PriceHistoryPoint {
  date: string;
  storeId: string;
  storeName: string;
  price: number;
  quantity: number;
}

export interface PriceRecommendation {
  type: 'switch_store' | 'buy_in_bulk' | 'wait_for_price_drop' | 'stock_up_now';
  message: string;
  priority: 'high' | 'medium' | 'low';
  potentialSaving: number;
  confidence: number;
}

// ============================================================================
// BUDGET ALERTS & RECOMMENDATIONS
// ============================================================================

export interface BudgetAlert {
  id: string;
  type: 'approaching_limit' | 'exceeded_budget' | 'unusual_spending' | 'saving_opportunity';
  severity: 'critical' | 'warning' | 'info';
  category?: string;
  message: string;
  detailedMessage: string;
  currentAmount: number;
  budgetAmount?: number;
  percentage?: number;
  recommendedAction: string;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
}

export interface SmartRecommendation {
  id: string;
  type: 'budget_optimization' | 'store_switching' | 'category_reduction' | 'seasonal_adjustment';
  title: string;
  description: string;
  impact: {
    potentialMonthlySaving: number;
    confidence: number;
    timeframe: string;
  };
  steps: RecommendationStep[];
  priority: 'high' | 'medium' | 'low';
  category?: string;
  relatedData: any;
  isApplied: boolean;
  createdAt: string;
}

export interface RecommendationStep {
  order: number;
  action: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  potentialSaving: number;
}

// ============================================================================
// DASHBOARD ANALYTICS AGGREGATION
// ============================================================================

export interface DashboardAnalytics {
  period: {
    startDate: string;
    endDate: string;
    type: 'month' | 'quarter' | 'year' | 'custom';
  };
  summary: {
    totalSpent: number;
    budgetStatus: 'on_track' | 'over_budget' | 'under_budget';
    savingsOpportunity: number;
    topCategory: string;
    topStore: string;
    receiptsCount: number;
    itemsCount: number;
  };
  spendingTrends: MonthlySpendingData[];
  storeLoyalty: StoreLoyaltyAnalysis[];
  categoryInsights: CategoryInsight[];
  duplicateDetection: DuplicateItemGroup[];
  priceComparisons: PriceComparison[];
  budgetAlerts: BudgetAlert[];
  recommendations: SmartRecommendation[];
  receiptThumbnails: ReceiptThumbnail[];
}

// ============================================================================
// CHART DATA INTERFACES
// ============================================================================

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  color?: string;
  metadata?: any;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  title: string;
  data: ChartDataPoint[];
  colors: string[];
  options: {
    showLegend: boolean;
    showGrid: boolean;
    showTooltip: boolean;
    responsive: boolean;
    height?: number;
  };
}

// ============================================================================
// FILTER & SEARCH INTERFACES
// ============================================================================

export interface AnalyticsFilters {
  dateRange: {
    start: string;
    end: string;
    preset?: 'last_month' | 'last_3_months' | 'last_6_months' | 'last_year' | 'custom';
  };
  categories?: string[];
  stores?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  includeAlerts?: boolean;
  includeRecommendations?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface AnalyticsSearchQuery {
  query: string;
  filters: AnalyticsFilters;
  sortBy: 'date' | 'amount' | 'frequency' | 'relevance';
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
}