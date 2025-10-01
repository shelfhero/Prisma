import { openai, OPENAI_MODELS } from '@/lib/openai'
import { createServerClient } from '@/lib/supabase-simple'

// Bulgarian grocery categories
export const BULGARIAN_CATEGORIES = [
  'Основни храни', // Basic foods (bread, rice, pasta, etc.)
  'Готови храни', // Ready foods (prepared meals, deli items)
  'Напитки', // Beverages (water, juice, alcohol, etc.)
  'Хигиена и козметика', // Hygiene and cosmetics
  'Други', // Other/miscellaneous
] as const

export type CategoryName = typeof BULGARIAN_CATEGORIES[number]

interface CategorizationResult {
  category: CategoryName
  confidence: number
  reasoning: string
}

interface LearningData {
  productName: string
  category: CategoryName
  userConfirmed: boolean
  createdAt: string
}

/**
 * Categorize a product using GPT-4o Mini
 */
export async function categorizeProduct(
  productName: string,
  userId?: string
): Promise<CategorizationResult> {
  try {
    // Get learning data from previous categorizations if user provided
    let learningContext = ''
    if (userId) {
      const learningData = await getUserLearningData(userId)
      if (learningData.length > 0) {
        learningContext = `\n\nPrevious user categorizations for learning:\n${learningData
          .map(item => `"${item.productName}" -> "${item.category}"`)
          .join('\n')}`
      }
    }

    const prompt = `Categorize this Bulgarian grocery product into one of these 5 categories:

Categories:
1. "Основни храни" - Basic foods like bread, rice, pasta, flour, sugar, milk, eggs, meat, fish, vegetables, fruits
2. "Готови храни" - Ready/prepared foods like sandwiches, salads, cooked meals, deli items
3. "Напитки" - All beverages including water, juice, soda, coffee, tea, alcohol
4. "Хигиена и козметика" - Personal care items like soap, shampoo, toothpaste, cosmetics
5. "Други" - Everything else that doesn't fit the above categories

Product name: "${productName}"${learningContext}

Return your answer as JSON in this exact format:
{
  "category": "category name from the list above",
  "confidence": 0.95,
  "reasoning": "Brief explanation why this product belongs to this category"
}

Use only the exact category names listed above in Bulgarian.`

    const response = await openai.chat.completions.create({
      model: OPENAI_MODELS.GPT4O_MINI, // Using cheaper model for simple categorization
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 200,
      temperature: 0.1, // Low temperature for consistency
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) {
      throw new Error('No response from GPT-4o Mini')
    }

    // Parse the JSON response
    let result: CategorizationResult
    try {
      result = JSON.parse(content)

      // Validate the category is one of our allowed categories
      if (!BULGARIAN_CATEGORIES.includes(result.category as CategoryName)) {
        console.warn(`Invalid category returned: ${result.category}. Defaulting to "Други"`)
        result.category = 'Други'
      }
    } catch (parseError) {
      console.error('Failed to parse GPT-4o Mini response:', content)
      // Default fallback
      result = {
        category: 'Други',
        confidence: 0.5,
        reasoning: 'Failed to parse AI response, using default category',
      }
    }

    return result
  } catch (error) {
    console.error('Categorization error:', error)
    // Return fallback result
    return {
      category: 'Други',
      confidence: 0.3,
      reasoning: 'Error occurred during categorization, using default category',
    }
  }
}

/**
 * Categorize multiple products in batch
 */
export async function categorizeProducts(
  productNames: string[],
  userId?: string
): Promise<CategorizationResult[]> {
  // Process products in parallel, but limit concurrent requests
  const BATCH_SIZE = 5
  const results: CategorizationResult[] = []

  for (let i = 0; i < productNames.length; i += BATCH_SIZE) {
    const batch = productNames.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(name => categorizeProduct(name, userId))
    )
    results.push(...batchResults)
  }

  return results
}

/**
 * Store user correction for learning
 */
export async function storeUserCorrection(
  userId: string,
  productName: string,
  correctedCategory: CategoryName
): Promise<void> {
  try {
    const supabase = createServerClient(true)

    // TODO: Create product_categorizations table
    // await supabase
    //   .from('product_categorizations')
    //   .upsert({
    //     user_id: userId,
    //     product_name: productName.toLowerCase().trim(),
    //     category: correctedCategory,
    //     user_confirmed: true,
    //     created_at: new Date().toISOString(),
    //   })

    console.log(`Stored user correction: "${productName}" -> "${correctedCategory}"`)
  } catch (error) {
    console.error('Failed to store user correction:', error)
  }
}

/**
 * Get user's previous categorizations for learning
 */
async function getUserLearningData(userId: string): Promise<LearningData[]> {
  try {
    const supabase = createServerClient(true)

    // TODO: Create product_categorizations table
    // const { data, error } = await supabase
    //   .from('product_categorizations')
    //   .select('product_name, category, user_confirmed, created_at')
    //   .eq('user_id', userId)
    //   .eq('user_confirmed', true)
    //   .order('created_at', { ascending: false })
    //   .limit(20) // Get last 20 corrections for context

    // if (error) {
    //   console.error('Failed to fetch learning data:', error)
    //   return []
    // }

    // return data?.map(item => ({
    //   productName: item.product_name,
    //   category: item.category as CategoryName,
    //   userConfirmed: item.user_confirmed,
    //   createdAt: item.created_at,
    // })) || []

    return [] // Temporary return until table is created
  } catch (error) {
    console.error('Error fetching learning data:', error)
    return []
  }
}

/**
 * API endpoint for categorization with learning
 */
export async function handleCategorizationRequest(
  products: Array<{ name: string; id?: string }>,
  userId?: string
): Promise<Array<{ id?: string; name: string; category: CategoryName; confidence: number }>> {
  const results = await categorizeProducts(
    products.map(p => p.name),
    userId
  )

  return products.map((product, index) => ({
    id: product.id,
    name: product.name,
    category: results[index].category,
    confidence: results[index].confidence,
  }))
}