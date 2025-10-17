// Product Normalization System Types

export interface MasterProduct {
  id: number;
  normalized_name: string;
  category_id: string | null;
  base_product_name: string | null;
  brand: string | null;
  size: number | null;
  unit: string | null;
  fat_content: number | null;
  product_type: string | null;
  barcode: string | null;
  keywords: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ProductAlias {
  id: number;
  master_product_id: number;
  retailer_id: string;
  alias_name: string;
  barcode: string | null;
  created_at: string;
}

export interface Retailer {
  id: string;
  name: string;
  created_at: string;
}

export interface PriceHistory {
  id: number;
  master_product_id: number;
  retailer_id: string;
  unit_price: number;
  total_price: number | null;
  quantity: number | null;
  currency: string;
  seen_at: string;
  receipt_id: string | null;
  location: string | null;
}

export interface CurrentPrice {
  master_product_id: number;
  retailer_id: string;
  unit_price: number;
  total_price: number | null;
  quantity: number | null;
  seen_at: string;
  location: string | null;
}

export interface PriceComparison {
  master_product_id: number;
  normalized_name: string;
  brand: string | null;
  size: number | null;
  unit: string | null;
  category_id: string | null;
  retailer_id: string;
  retailer: string;
  unit_price: number;
  seen_at: string;
  location: string | null;
  price_rank: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  savings_percent: number | null;
  savings_vs_max_percent: number | null;
}

export interface NormalizedProductInput {
  raw_name: string;
  category_id?: string;
  retailer_id?: string;
}

export interface PriceRecordInput {
  master_product_id: number;
  retailer_id: string;
  unit_price: number;
  total_price?: number;
  quantity?: number;
  receipt_id?: string;
  location?: string;
}

export interface ProductMatchResult {
  master_product_id: number;
  confidence_score: number;
  normalized_name: string;
  brand: string | null;
}

export interface SizeUnit {
  size: number | null;
  unit: string | null;
}

// API Response Types
export interface PriceComparisonResponse {
  product: MasterProduct;
  prices: Array<{
    retailer: Retailer;
    current_price: number;
    last_seen: string;
    location: string | null;
    rank: number;
    savings_percent: number | null;
    is_best_price: boolean;
  }>;
  statistics: {
    avg_price: number;
    min_price: number;
    max_price: number;
    price_range: number;
    total_retailers: number;
  };
}

export interface ProductSearchResult {
  master_product: MasterProduct;
  current_prices: CurrentPrice[];
  best_price: {
    retailer: Retailer;
    price: number;
    savings: number;
  } | null;
}

export interface RetailerPriceHistory {
  retailer: Retailer;
  price_history: Array<{
    date: string;
    price: number;
    location: string | null;
  }>;
}

// Normalization Service Types
export interface NormalizationConfig {
  known_brands: string[];
  size_patterns: RegExp[];
  unit_mappings: Record<string, string>;
  confidence_threshold: number;
}

export interface ProductNormalizationResult {
  success: boolean;
  master_product_id: number | null;
  normalized_name: string | null;
  confidence_score: number;
  error?: string;
}

export interface BulkNormalizationResult {
  processed: number;
  successful: number;
  failed: number;
  results: Array<{
    item_id: number;
    master_product_id: number | null;
    confidence_score: number;
    error?: string;
  }>;
}

// Price Trends
export interface PriceTrend {
  master_product_id: number;
  product_name: string;
  retailer_id: number;
  retailer_name: string;
  trend_direction: 'up' | 'down' | 'stable';
  price_change_percent: number;
  current_price: number;
  previous_price: number;
  period_days: number;
}

// Budget Optimization
export interface BudgetOptimization {
  shopping_list: Array<{
    master_product_id: number;
    product_name: string;
    quantity: number;
  }>;
  recommendations: Array<{
    master_product_id: number;
    product_name: string;
    recommended_retailer: Retailer;
    price: number;
    alternative_retailers: Array<{
      retailer: Retailer;
      price: number;
      price_difference: number;
    }>;
  }>;
  total_cost: number;
  potential_savings: number;
  optimized_retailers: Retailer[];
}
