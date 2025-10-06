import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { categorizeProduct } from '@/lib/categorization-engine'
import { adminMiddleware } from '@/lib/admin-auth'

function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Map internal category IDs to database category names
const CATEGORY_MAPPING: Record<string, string> = {
  'basic_foods': 'Основни храни',
  'ready_meals': 'Готови храни',
  'snacks': 'Закусни и снаксове',
  'drinks': 'Напитки',
  'household': 'Битова химия',
  'personal_care': 'Козметика и хигиена',
  'other': 'Други'
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const { authorized, error } = await adminMiddleware(request)

    if (!authorized) {
      return NextResponse.json({ error }, { status: 403 })
    }

    const supabase = getSupabaseAdminClient()

    // Get all uncategorized items
    const { data: uncategorizedItems, error: fetchError } = await supabase
      .from('items')
      .select('id, product_name, receipt_id')
      .is('category_id', null)
      .limit(500) // Process 500 at a time

    if (fetchError) {
      console.error('Error fetching uncategorized items:', fetchError)
      throw fetchError
    }

    if (!uncategorizedItems || uncategorizedItems.length === 0) {
      return NextResponse.json({
        message: 'No uncategorized items found',
        processed: 0
      })
    }

    console.log(`[Recategorize] Found ${uncategorizedItems.length} uncategorized items`)

    // Get category ID mapping
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name')

    if (catError) {
      console.error('Error fetching categories:', catError)
      throw catError
    }

    const categoryNameToId = new Map<string, string>()
    categories?.forEach(cat => {
      categoryNameToId.set(cat.name, cat.id)
    })

    // Process items in batches
    let processedCount = 0
    let errorCount = 0
    const BATCH_SIZE = 10

    for (let i = 0; i < uncategorizedItems.length; i += BATCH_SIZE) {
      const batch = uncategorizedItems.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (item) => {
          try {
            // Categorize the product using AI
            const result = await categorizeProduct(item.product_name)

            // Map the internal category ID to database category name
            const categoryName = CATEGORY_MAPPING[result.category_id] || 'Други'
            const categoryId = categoryNameToId.get(categoryName)

            if (!categoryId) {
              console.warn(`[Recategorize] Category not found: ${categoryName} for item: ${item.product_name}`)
              errorCount++
              return
            }

            // Update the item with the category
            const { error: updateError } = await supabase
              .from('items')
              .update({ category_id: categoryId })
              .eq('id', item.id)

            if (updateError) {
              console.error(`[Recategorize] Error updating item ${item.id}:`, updateError)
              errorCount++
            } else {
              console.log(`[Recategorize] ✓ "${item.product_name}" -> ${categoryName} (confidence: ${result.confidence})`)
              processedCount++
            }
          } catch (error) {
            console.error(`[Recategorize] Error processing item ${item.id}:`, error)
            errorCount++
          }
        })
      )

      // Small delay between batches to avoid rate limits
      if (i + BATCH_SIZE < uncategorizedItems.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return NextResponse.json({
      message: 'Recategorization complete',
      total: uncategorizedItems.length,
      processed: processedCount,
      errors: errorCount
    })
  } catch (error) {
    console.error('Error in recategorization:', error)
    return NextResponse.json(
      { error: 'Failed to recategorize items' },
      { status: 500 }
    )
  }
}
