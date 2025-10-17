// Product Normalization Service
// Handles product name normalization and matching across retailers
// Now powered by intelligent ProductNormalizer engine

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create singleton supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}
import {
  MasterProduct,
  ProductNormalizationResult,
  ProductMatchResult,
  SizeUnit,
  BulkNormalizationResult,
} from '@/types/normalization';
import { ProductNormalizer } from '@/lib/product-normalizer';

export class ProductNormalizationService {
  /**
   * Extract brand from product name (powered by ProductNormalizer)
   */
  static extractBrand(productName: string): string | null {
    const components = ProductNormalizer.parseProductName(productName);
    return components.brand || null;
  }

  /**
   * Extract size and unit from product name (powered by ProductNormalizer)
   */
  static extractSizeUnit(productName: string): SizeUnit {
    const components = ProductNormalizer.parseProductName(productName);
    return {
      size: components.size || null,
      unit: components.unit || null
    };
  }

  /**
   * Extract fat content from product name (powered by ProductNormalizer)
   */
  static extractFatContent(productName: string): number | null {
    const components = ProductNormalizer.parseProductName(productName);
    return components.fatContent || null;
  }

  /**
   * Normalize product name to standard format (powered by ProductNormalizer)
   */
  static normalizeProductName(rawName: string): string {
    const components = ProductNormalizer.parseProductName(rawName);
    return ProductNormalizer.normalizeProductName(components);
  }

  /**
   * Generate keywords for search (powered by ProductNormalizer)
   */
  static generateKeywords(productName: string): string[] {
    const components = ProductNormalizer.parseProductName(productName);
    return ProductNormalizer.generateKeywords(components);
  }

  /**
   * Calculate similarity score between two product names (powered by ProductNormalizer)
   */
  static calculateSimilarity(name1: string, name2: string): number {
    return ProductNormalizer.calculateSimilarity(name1, name2);
  }

  /**
   * Find best matching master product
   */
  static async findMasterProduct(
    rawName: string,
    categoryId?: string,
    retailerId?: string
  ): Promise<ProductMatchResult | null> {
    const supabase = getSupabaseClient();

    // First, try exact match on normalized name
    const normalizedName = this.normalizeProductName(rawName);

    let query = supabase
      .from('master_products')
      .select('*');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: exactMatch } = await query
      .eq('normalized_name', normalizedName)
      .single();

    if (exactMatch) {
      return {
        master_product_id: exactMatch.id,
        confidence_score: 1.0,
        normalized_name: exactMatch.normalized_name,
        brand: exactMatch.brand,
      };
    }

    // Use intelligent matching with ProductNormalizer
    const components = ProductNormalizer.parseProductName(rawName);

    // Get candidates (limit by category if provided, otherwise get broader set)
    const { data: products } = await query.limit(100);

    if (!products || products.length === 0) {
      return null;
    }

    // Use ProductNormalizer's intelligent matching algorithm
    const bestMatch = ProductNormalizer.matchProduct(components, products);

    // Only return if confidence is above threshold (0.6)
    if (bestMatch && bestMatch.score >= 0.6) {
      const matchedProduct = products.find(p => p.id === bestMatch.id);
      if (matchedProduct) {
        return {
          master_product_id: matchedProduct.id,
          confidence_score: bestMatch.score,
          normalized_name: matchedProduct.normalized_name,
          brand: matchedProduct.brand,
        };
      }
    }

    return null;
  }

  /**
   * Create or get master product
   */
  static async getOrCreateMasterProduct(
    rawName: string,
    categoryId?: string,
    retailerId?: string
  ): Promise<ProductNormalizationResult> {
    const supabase = getSupabaseClient();

    try {
      // Try to find existing match
      const match = await this.findMasterProduct(rawName, categoryId, retailerId);

      if (match) {
        // Update alias if retailer provided
        if (retailerId) {
          await supabase
            .from('product_aliases')
            .upsert({
              master_product_id: match.master_product_id,
              retailer_id: retailerId,
              alias_name: rawName,
            }, {
              onConflict: 'retailer_id,alias_name'
            });
        }

        return {
          success: true,
          master_product_id: match.master_product_id,
          normalized_name: match.normalized_name,
          confidence_score: match.confidence_score,
        };
      }

      // Create new master product
      const normalizedName = this.normalizeProductName(rawName);
      const brand = this.extractBrand(rawName);
      const { size, unit } = this.extractSizeUnit(rawName);
      const fatContent = this.extractFatContent(rawName);
      const keywords = this.generateKeywords(rawName);

      // Generate human-readable display name
      const components = ProductNormalizer.parseProductName(rawName);
      const displayName = ProductNormalizer.createDisplayName(components);

      const { data: newProduct, error } = await supabase
        .from('master_products')
        .insert({
          normalized_name: normalizedName,
          display_name: displayName,
          category_id: categoryId,
          brand,
          size,
          unit,
          fat_content: fatContent,
          keywords,
        })
        .select()
        .single();

      if (error) throw error;

      // Create alias
      if (retailerId && newProduct) {
        await supabase
          .from('product_aliases')
          .insert({
            master_product_id: newProduct.id,
            retailer_id: retailerId,
            alias_name: rawName,
          });
      }

      return {
        success: true,
        master_product_id: newProduct!.id,
        normalized_name: normalizedName,
        confidence_score: 1.0,
      };

    } catch (error) {
      console.error('Product normalization error:', error);
      return {
        success: false,
        master_product_id: null,
        normalized_name: null,
        confidence_score: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Record price for a product
   */
  static async recordPrice(
    masterProductId: number,
    retailerId: string,
    unitPrice: number,
    options?: {
      totalPrice?: number;
      quantity?: number;
      receiptId?: string;
      location?: string;
    }
  ): Promise<number | null> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase
        .from('price_history')
        .insert({
          master_product_id: masterProductId,
          retailer_id: retailerId,
          unit_price: unitPrice,
          total_price: options?.totalPrice,
          quantity: options?.quantity || 1,
          receipt_id: options?.receiptId,
          location: options?.location,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Trigger materialized view refresh
      await supabase.rpc('refresh_current_prices');

      return data.id;
    } catch (error) {
      console.error('Price recording error:', error);
      return null;
    }
  }

  /**
   * Bulk normalize items from a receipt
   */
  static async bulkNormalizeReceiptItems(
    receiptId: string,
    retailerId: string
  ): Promise<BulkNormalizationResult> {
    const supabase = getSupabaseClient();

    try {
      // Get all items from receipt
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('receipt_id', receiptId)
        .is('master_product_id', null);

      if (itemsError) throw itemsError;

      const results: BulkNormalizationResult = {
        processed: 0,
        successful: 0,
        failed: 0,
        results: [],
      };

      for (const item of items || []) {
        results.processed++;

        const normResult = await this.getOrCreateMasterProduct(
          item.product_name,
          item.category_id,
          retailerId
        );

        if (normResult.success && normResult.master_product_id) {
          // Update item with master product
          await supabase
            .from('items')
            .update({
              master_product_id: normResult.master_product_id,
              raw_product_name: item.product_name,
              confidence_score: normResult.confidence_score,
            })
            .eq('id', item.id);

          // Record price
          await this.recordPrice(
            normResult.master_product_id,
            retailerId,
            item.unit_price,
            {
              totalPrice: item.total_price,
              quantity: item.qty,
              receiptId,
            }
          );

          results.successful++;
          results.results.push({
            item_id: item.id,
            master_product_id: normResult.master_product_id,
            confidence_score: normResult.confidence_score,
          });
        } else {
          results.failed++;
          results.results.push({
            item_id: item.id,
            master_product_id: null,
            confidence_score: 0,
            error: normResult.error,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Bulk normalization error:', error);
      throw error;
    }
  }

  /**
   * Get retailer by name (create if not exists)
   */
  static async getRetailerByName(name: string): Promise<string> {
    const supabase = getSupabaseClient();

    // Try to find by exact name
    const { data: existing } = await supabase
      .from('retailers')
      .select('id')
      .eq('name', name)
      .single();

    if (existing) {
      return existing.id;
    }

    // Try to find by normalized name (case-insensitive)
    const { data: normalized } = await supabase
      .from('retailers')
      .select('id')
      .ilike('name', name)
      .single();

    if (normalized) {
      return normalized.id;
    }

    // Create new retailer
    const { data: newRetailer } = await supabase
      .from('retailers')
      .insert({ name })
      .select('id')
      .single();

    if (!newRetailer) {
      throw new Error('Failed to create retailer');
    }

    return newRetailer.id;
  }
}
