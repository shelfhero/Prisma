import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-simple';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Category mapping
const CATEGORIES = [
  { id: '6', name: 'Основни храни', description: 'Fresh produce, dairy, meat, bread, eggs, basic cooking ingredients' },
  { id: '7', name: 'Готови храни', description: 'Ready-to-eat meals, prepared food, takeout, restaurant items' },
  { id: '3', name: 'Напитки', description: 'Beverages, drinks, water, juice, soda, alcohol, coffee, tea' },
  { id: '4', name: 'Закуски', description: 'Snacks, candy, chips, cookies, sweets, desserts' },
  { id: '5', name: 'Нехранителни', description: 'Non-food items, household products, toiletries, cleaning supplies' },
];

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const supabase = createServerClient(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Prepare prompt for OpenAI
    const categoriesDescription = CATEGORIES.map(cat =>
      `${cat.id}: ${cat.name} - ${cat.description}`
    ).join('\n');

    const itemsList = items.map((item: any, index: number) =>
      `${index + 1}. ${item.name}`
    ).join('\n');

    const prompt = `You are a Bulgarian grocery receipt categorizer. Categorize each product into one of these categories:

${categoriesDescription}

Products to categorize (Bulgarian names):
${itemsList}

Return ONLY a JSON array with this exact format:
[
  {"index": 1, "category_id": "6", "confidence": 0.95},
  {"index": 2, "category_id": "3", "confidence": 0.88}
]

Rules:
- index: the product number (1-based)
- category_id: one of [6, 7, 3, 4, 5]
- confidence: 0.0 to 1.0 (how confident you are)
- Use context clues from Bulgarian product names
- Consider common Bulgarian brands and products
- If unsure, use lower confidence (< 0.7)

Respond ONLY with the JSON array, no other text.`;

    console.log('Sending categorization request to OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that categorizes Bulgarian grocery products. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0].message.content?.trim() || '';
    console.log('OpenAI response:', responseText);

    // Parse the JSON response
    let categorizations;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      categorizations = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      return NextResponse.json({
        error: 'AI categorization failed - invalid response format'
      }, { status: 500 });
    }

    // Map the results back to item IDs
    const results = items.map((item: any, index: number) => {
      const result = categorizations.find((c: any) => c.index === index + 1);
      return {
        item_id: item.id,
        category_id: result?.category_id || '5', // Default to non-food
        confidence: result?.confidence || 0.5,
      };
    });

    console.log(`Successfully categorized ${results.length} items`);

    return NextResponse.json({
      categorizations: results,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
        total_tokens: completion.usage?.total_tokens,
      }
    });

  } catch (error) {
    console.error('Categorization error:', error);
    return NextResponse.json({
      error: 'Failed to categorize items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
