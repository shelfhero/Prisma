import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9а-я\s]/g, ' ') // Keep only letters, numbers, spaces
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const { authorized, session, error: authError } = await adminMiddleware(request)

    if (!authorized) {
      return NextResponse.json({ error: authError }, { status: 403 })
    }

    const body = await request.json()
    const { itemId, categoryId, productName, originalCategoryId } = body

    if (!itemId || !productName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdminClient()
    const userId = session?.userId

    // Update the item's category
    const { error: updateError } = await supabase
      .from('items')
      .update({ category_id: categoryId || null })
      .eq('id', itemId)

    if (updateError) {
      console.error('Error updating item category:', updateError)
      throw updateError
    }

    // Store the correction for learning (if user is logged in)
    if (userId && categoryId) {
      const normalized = normalizeProductName(productName)

      const { error: correctionError } = await supabase
        .from('categorization_corrections')
        .insert({
          user_id: userId,
          product_name: productName,
          product_name_normalized: normalized,
          category_id: categoryId,
          original_category_id: originalCategoryId || null,
          confidence_score: 1.0 // Manual correction = 100% confidence
        })

      if (correctionError) {
        console.error('Error storing categorization correction:', correctionError)
        // Don't fail the request if storing correction fails
      } else {
        console.log(`[Categorization] Stored correction: "${productName}" -> category ${categoryId}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Category updated and correction stored for learning'
    })
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}
