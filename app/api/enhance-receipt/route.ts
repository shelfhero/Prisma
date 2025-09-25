import { NextRequest, NextResponse } from 'next/server'
import { openai, OPENAI_MODELS } from '@/lib/openai'
import type { ReceiptExtraction, ExtractedItem } from '@/lib/receipt-parsing/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageBase64, ocrResults } = body

    if (!imageBase64 || !ocrResults) {
      return NextResponse.json(
        { error: 'Missing required fields: imageBase64 and ocrResults' },
        { status: 400 }
      )
    }

    // Extract existing items from OCR results for comparison
    const existingItems = ocrResults.items || []
    const existingItemsText = existingItems
      .map((item: ExtractedItem) => `${item.name}: ${item.price} лв`)
      .join('\n')

    // Determine if this is a fresh analysis (no existing items) or enhancement
    const isDirectAnalysis = existingItems.length === 0

    // Prepare GPT-4o Vision prompt
    const prompt = isDirectAnalysis ?
      // Direct analysis when no OCR results available
      `You are an expert at analyzing Bulgarian grocery receipt images. Extract EVERY SINGLE product line item AND the receipt total amount AND store name with extreme attention to detail.

CRITICAL INSTRUCTIONS:
1. Scan the ENTIRE receipt from top to bottom systematically
2. Extract EVERY product name and its corresponding price
3. Find the FINAL TOTAL amount (usually near the bottom, may say "СУМА", "ОБЩО", "TOTAL" or similar)
4. Find the STORE NAME (usually at the top of the receipt)
5. Don't miss any items - even small ones, partially visible ones, or ones with unclear text
6. Include weighted items (kg products) with their calculated prices
7. Look for both individual items and quantity items (e.g., "2x Product")
8. Ignore only: VAT lines, change amounts, thank you messages
9. Product names should be in Bulgarian as they appear on receipt
10. Prices must be in BGN format (e.g., 1.23)

SCANNING STRATEGY:
- Start from the first product line after store header
- Go line by line until you reach VAT/total section
- Double-check you haven't missed any items
- Count your extracted items and verify against visual count
- Look for the final total amount (biggest number at bottom)

Return EVERYTHING as JSON in this exact format:
{
  "storeName": "Exact store name from receipt header",
  "totalAmount": 213.66,
  "items": [
    {
      "name": "Exact product name in Bulgarian",
      "price": 1.23,
      "confidence": 0.9
    }
  ]
}

IMPORTANT: Be extremely thorough. Missing items means missing money for the customer. Extract EVERYTHING including the correct total!`
      :
      // Enhancement mode when OCR results exist
      `Analyze this Bulgarian grocery receipt image. Compare with the OCR text provided and find any line items that were missed. Focus on product names and prices.

Existing OCR items found:
${existingItemsText}

Instructions:
1. Look for any products/items that appear on the receipt but are NOT in the OCR list above
2. Focus on clear product names and their prices
3. Ignore VAT lines, totals, and store information
4. Product names should be in Bulgarian
5. Prices should include "лв" suffix

Return ONLY the missed items as a JSON array in this exact format:
[
  {
    "name": "Product name in Bulgarian",
    "price": 1.23,
    "confidence": 0.85
  }
]

If no items were missed, return an empty array: []`

    // Call GPT-4o Vision API
    const response = await openai.chat.completions.create({
      model: OPENAI_MODELS.GPT4O,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 2000, // Increased for longer receipts
      temperature: 0.05, // Very low temperature for maximum accuracy
    })

    const content = response.choices[0]?.message?.content?.trim()
    if (!content) {
      throw new Error('No response from GPT-4o Vision')
    }

    // Parse the JSON response
    let enhancedItems: Array<{
      name: string
      price: number
      confidence: number
    }> = []
    let extractedStoreName: string | undefined
    let extractedTotalAmount: number | undefined

    try {
      // Remove any markdown code block wrappers
      let cleanContent = content.replace(/```json\s*\n?/g, '').replace(/```\s*$/g, '').trim()

      const parsedResponse = JSON.parse(cleanContent)

      if (isDirectAnalysis && parsedResponse.storeName && parsedResponse.totalAmount && parsedResponse.items) {
        // Direct analysis mode - extract store name, total, and items
        extractedStoreName = parsedResponse.storeName
        extractedTotalAmount = parsedResponse.totalAmount
        enhancedItems = parsedResponse.items
      } else if (Array.isArray(parsedResponse)) {
        // Enhancement mode - just array of missed items
        enhancedItems = parsedResponse
      } else {
        throw new Error('Unexpected response format')
      }
    } catch (parseError) {
      console.error('Failed to parse GPT-4o response:', content)
      // Try to extract JSON from the response if it's wrapped in text
      const jsonMatch = content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
      if (jsonMatch) {
        try {
          const parsedResponse = JSON.parse(jsonMatch[0])
          if (isDirectAnalysis && parsedResponse.storeName && parsedResponse.totalAmount && parsedResponse.items) {
            extractedStoreName = parsedResponse.storeName
            extractedTotalAmount = parsedResponse.totalAmount
            enhancedItems = parsedResponse.items
          } else if (Array.isArray(parsedResponse)) {
            enhancedItems = parsedResponse
          } else {
            throw new Error('Could not parse response')
          }
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON response from GPT-4o', rawResponse: content },
            { status: 500 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Could not extract JSON from response', rawResponse: content },
          { status: 500 }
        )
      }
    }

    // Convert enhanced items to ExtractedItem format
    const convertedItems: ExtractedItem[] = enhancedItems.map((item, index) => ({
      name: item.name,
      originalText: item.name,
      price: item.price,
      quantity: 1,
      confidence: item.confidence || 0.8,
      qualityFlags: [
        {
          type: 'ocr_uncertain',
          confidence: item.confidence || 0.8,
          description: 'Item found by GPT-4o Vision enhancement',
        },
      ],
      lineNumber: existingItems.length + index + 1,
      normalizedName: item.name.toLowerCase().trim(),
    }))

    // Return the enhanced results
    return NextResponse.json({
      success: true,
      enhancedItems: convertedItems,
      originalItemCount: existingItems.length,
      newItemsFound: enhancedItems.length,
      totalItems: existingItems.length + enhancedItems.length,
      processingEngine: 'gpt4o_vision_enhancement',
      ...(extractedStoreName && { extractedStoreName }),
      ...(extractedTotalAmount && { extractedTotalAmount }),
    })
  } catch (error) {
    console.error('GPT-4o Vision enhancement error:', error)
    return NextResponse.json(
      {
        error: 'Failed to enhance receipt with GPT-4o Vision',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}