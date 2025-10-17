// API endpoint for normalizing product names
import { NextRequest, NextResponse } from 'next/server';
import { ProductNormalizationService } from '@/lib/services/product-normalization';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { raw_name, category_id, retailer_id } = body;

    if (!raw_name) {
      return NextResponse.json(
        { error: 'raw_name is required' },
        { status: 400 }
      );
    }

    const result = await ProductNormalizationService.getOrCreateMasterProduct(
      raw_name,
      category_id,
      retailer_id
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Normalization error:', error);
    return NextResponse.json(
      { error: 'Failed to normalize product' },
      { status: 500 }
    );
  }
}
