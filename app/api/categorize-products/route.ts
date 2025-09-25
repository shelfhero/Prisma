import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-simple'
import { handleCategorizationRequest, storeUserCorrection, type CategoryName } from '@/lib/categorization'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { products, corrections } = body

    // Get user from auth header
    const authHeader = request.headers.get('authorization')
    let userId: string | undefined

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const supabase = createServerClient(true)
      const { data: { user } } = await supabase.auth.getUser(token)
      userId = user?.id
    }

    // Handle user corrections for learning
    if (corrections && Array.isArray(corrections) && userId) {
      await Promise.all(
        corrections.map((correction: { productName: string; category: CategoryName }) =>
          storeUserCorrection(userId!, correction.productName, correction.category)
        )
      )
    }

    // Categorize products
    if (!products || !Array.isArray(products)) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      )
    }

    const categorizedProducts = await handleCategorizationRequest(products, userId)

    return NextResponse.json({
      success: true,
      categorizedProducts,
      totalProcessed: products.length,
      userId: userId ? 'authenticated' : 'anonymous',
    })
  } catch (error) {
    console.error('Product categorization error:', error)
    return NextResponse.json(
      {
        error: 'Failed to categorize products',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}