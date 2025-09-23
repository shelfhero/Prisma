/**
 * Database TypeScript Types for Призма Receipt App
 * Auto-generated types that match the Supabase database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          role: 'user' | 'admin'
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      retailers: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          website: string | null
          address: string | null
          phone: string | null
          tax_id: string | null
          is_verified: boolean
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          website?: string | null
          address?: string | null
          phone?: string | null
          tax_id?: string | null
          is_verified?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          website?: string | null
          address?: string | null
          phone?: string | null
          tax_id?: string | null
          is_verified?: boolean
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          name_en: string | null
          icon: string | null
          color: string | null
          description: string | null
          parent_id: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          name_en?: string | null
          icon?: string | null
          color?: string | null
          description?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_en?: string | null
          icon?: string | null
          color?: string | null
          description?: string | null
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          retailer_id: string | null
          receipt_number: string | null
          total_amount: number
          tax_amount: number | null
          currency: string
          purchased_at: string
          location: string | null
          payment_method: string | null
          notes: string | null
          tags: string[] | null
          is_expense: boolean
          is_refunded: boolean
          refund_amount: number | null
          refund_date: string | null
          tabscanner_raw: Json | null
          confidence_score: number | null
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          retailer_id?: string | null
          receipt_number?: string | null
          total_amount: number
          tax_amount?: number | null
          currency?: string
          purchased_at: string
          location?: string | null
          payment_method?: string | null
          notes?: string | null
          tags?: string[] | null
          is_expense?: boolean
          is_refunded?: boolean
          refund_amount?: number | null
          refund_date?: string | null
          tabscanner_raw?: Json | null
          confidence_score?: number | null
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          retailer_id?: string | null
          receipt_number?: string | null
          total_amount?: number
          tax_amount?: number | null
          currency?: string
          purchased_at?: string
          location?: string | null
          payment_method?: string | null
          notes?: string | null
          tags?: string[] | null
          is_expense?: boolean
          is_refunded?: boolean
          refund_amount?: number | null
          refund_date?: string | null
          tabscanner_raw?: Json | null
          confidence_score?: number | null
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_retailer_id_fkey"
            columns: ["retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          }
        ]
      }
      receipt_images: {
        Row: {
          id: string
          receipt_id: string
          storage_path: string
          file_name: string
          file_size: number | null
          mime_type: string | null
          width: number | null
          height: number | null
          is_primary: boolean
          upload_status: 'uploading' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          receipt_id: string
          storage_path: string
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          width?: number | null
          height?: number | null
          is_primary?: boolean
          upload_status?: 'uploading' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          receipt_id?: string
          storage_path?: string
          file_name?: string
          file_size?: number | null
          mime_type?: string | null
          width?: number | null
          height?: number | null
          is_primary?: boolean
          upload_status?: 'uploading' | 'completed' | 'failed'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_images_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          }
        ]
      }
      items: {
        Row: {
          id: string
          receipt_id: string
          product_name: string
          product_description: string | null
          barcode: string | null
          sku: string | null
          brand: string | null
          category_id: string | null
          qty: number
          unit: string | null
          unit_price: number
          total_price: number
          discount_amount: number | null
          tax_rate: number | null
          tax_amount: number | null
          is_organic: boolean | null
          is_imported: boolean | null
          expiry_date: string | null
          batch_number: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          receipt_id: string
          product_name: string
          product_description?: string | null
          barcode?: string | null
          sku?: string | null
          brand?: string | null
          category_id?: string | null
          qty: number
          unit?: string | null
          unit_price: number
          total_price: number
          discount_amount?: number | null
          tax_rate?: number | null
          tax_amount?: number | null
          is_organic?: boolean | null
          is_imported?: boolean | null
          expiry_date?: string | null
          batch_number?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          receipt_id?: string
          product_name?: string
          product_description?: string | null
          barcode?: string | null
          sku?: string | null
          brand?: string | null
          category_id?: string | null
          qty?: number
          unit?: string | null
          unit_price?: number
          total_price?: number
          discount_amount?: number | null
          tax_rate?: number | null
          tax_amount?: number | null
          is_organic?: boolean | null
          is_imported?: boolean | null
          expiry_date?: string | null
          batch_number?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      product_analytics: {
        Row: {
          id: string
          user_id: string
          product_name: string
          barcode: string | null
          brand: string | null
          category_id: string | null
          total_purchases: number
          total_spent: number
          average_price: number
          last_purchase_date: string
          price_trend: 'increasing' | 'decreasing' | 'stable' | 'unknown'
          favorite_retailer_id: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_name: string
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          total_purchases?: number
          total_spent?: number
          average_price?: number
          last_purchase_date: string
          price_trend?: 'increasing' | 'decreasing' | 'stable' | 'unknown'
          favorite_retailer_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_name?: string
          barcode?: string | null
          brand?: string | null
          category_id?: string | null
          total_purchases?: number
          total_spent?: number
          average_price?: number
          last_purchase_date?: string
          price_trend?: 'increasing' | 'decreasing' | 'stable' | 'unknown'
          favorite_retailer_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_analytics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_analytics_favorite_retailer_id_fkey"
            columns: ["favorite_retailer_id"]
            isOneToOne: false
            referencedRelation: "retailers"
            referencedColumns: ["id"]
          }
        ]
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          currency: string
          language: string
          timezone: string
          date_format: string
          number_format: string
          default_categories: string[] | null
          email_notifications: boolean
          push_notifications: boolean
          weekly_reports: boolean
          monthly_reports: boolean
          auto_categorize: boolean
          receipt_retention_days: number
          privacy_settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          currency?: string
          language?: string
          timezone?: string
          date_format?: string
          number_format?: string
          default_categories?: string[] | null
          email_notifications?: boolean
          push_notifications?: boolean
          weekly_reports?: boolean
          monthly_reports?: boolean
          auto_categorize?: boolean
          receipt_retention_days?: number
          privacy_settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          currency?: string
          language?: string
          timezone?: string
          date_format?: string
          number_format?: string
          default_categories?: string[] | null
          email_notifications?: boolean
          push_notifications?: boolean
          weekly_reports?: boolean
          monthly_reports?: boolean
          auto_categorize?: boolean
          receipt_retention_days?: number
          privacy_settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      receipt_analytics: {
        Row: {
          user_id: string
          total_receipts: number
          total_spent: number
          average_receipt_value: number
          most_frequent_retailer: string | null
          most_expensive_category: string | null
          monthly_spend: number
          yearly_spend: number
        }
        Relationships: [
          {
            foreignKeyName: "receipt_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      category_spending: {
        Row: {
          user_id: string
          category_id: string
          category_name: string
          total_spent: number
          total_items: number
          percentage_of_total: number
          last_purchase_date: string
        }
        Relationships: [
          {
            foreignKeyName: "category_spending_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_spending_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      get_user_receipt_stats: {
        Args: {
          user_id: string
          start_date?: string
          end_date?: string
        }
        Returns: {
          total_receipts: number
          total_spent: number
          average_receipt_value: number
          total_items: number
          unique_retailers: number
          unique_categories: number
        }[]
      }
      search_receipts: {
        Args: {
          user_id: string
          search_query: string
          start_date?: string
          end_date?: string
          category_ids?: string[]
          retailer_ids?: string[]
          min_amount?: number
          max_amount?: number
          limit?: number
          offset?: number
        }
        Returns: {
          id: string
          retailer_name: string
          total_amount: number
          currency: string
          purchased_at: string
          items_count: number
          relevance_score: number
        }[]
      }
      update_product_analytics: {
        Args: {
          receipt_id: string
        }
        Returns: void
      }
    }
    Enums: {
      user_role: 'user' | 'admin'
      processing_status: 'pending' | 'processing' | 'completed' | 'failed'
      upload_status: 'uploading' | 'completed' | 'failed'
      price_trend: 'increasing' | 'decreasing' | 'stable' | 'unknown'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type helpers for better development experience
export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never