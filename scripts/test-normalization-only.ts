/**
 * Test Product Normalization System (No API Required)
 * Tests the product name parsing and normalization
 */

import { ProductNormalizer } from '../lib/product-normalizer';

// Sample products from Bulgarian receipts
const TEST_PRODUCTS = [
  // Dairy
  'МЛЯКО ВЕРЕЯ 3.6% 1Л',
  'СИРЕНЕ БЯЛО 400Г',
  'КАШКАВАЛ ВИТОША 200Г',
  'ЙОГУРТ ГУСТ 500ГР',
  'МАСЛО КРАВЕ 250Г',
  'АЙРАН 1Л',

  // Meat
  'ПИЛЕШКО ФИЛЕ 1КГ',
  'СВИНСКА КАЙМА 500Г',
  'ГОВЕЖДИ КЕБАПЧЕТА',
  'САЛАМ ЕЛЕНА 200Г',
  'ШУНКА МАДЖАРОВ',
  'ЛУКАНКА ПИКАНТНА',

  // Fish
  'ТОН В КОНСЕРВА 160Г',
  'СЬОМГА ФИЛЕ 300Г',
  'СКУМРИЯ ПУШЕНА',

  // Eggs
  'ЯЙЦА РАЗМЕР L 10БР',

  // Bread & Bakery
  'ХЛЯБ БЯЛ 500Г',
  'ФРАНЗЕЛА ПЪЛНОЗЪРНЕСТА',
  'КОЗУНАК ПЛЕТЕН',
  'КИФЛИ 6БР',

  // Vegetables
  'ДОМАТИ ЧЕРВЕНИ 1КГ',
  'КРАСТАВИЦИ 1КГ',
  'ЧУШКИ ЧЕРВЕНИ',
  'ЛУК ЖЪЛТ',
  'КАРТОФИ 2КГ',
  'МОРКОВИ',
  'ЗЕЛЕ БЯЛО',
  'ЧЕСЪН',

  // Fruits
  'ЯБЪЛКИ ГОЛД 1КГ',
  'БАНАНИ 1КГ',
  'ПОРТОКАЛИ 2КГ',
  'ГРОЗДЕ ЧЕРВЕНО',
  'ЛИМОНИ 500Г',
  'МАНДАРИНИ',

  // Staples
  'ЗАХАР КРИСТАЛ 1КГ',
  'СОЛ МОРСКА 500Г',
  'БРАШНО ТИП 500 1КГ',
  'ОРИЗ БАСМАТИ 500Г',
  'МАКАРОНИ СПАГЕТИ 500Г',
  'ОЛИО СЛЪНЧОГЛЕД 1Л',
  'ОЛИО ЗЕХТИН 500МЛ',
  'ОЦЕТ ЯБЪЛКОВ',

  // Condiments
  'КЕТЧУП HEINZ 500Г',
  'МАЙОНЕЗА 250МЛ',
  'ЛЮТЕНИЦА КЮФТЕНСКА',

  // Drinks - Cold
  'ВОДА ДЕВИН 1.5Л',
  'СОК ПОРТОКАЛ 1Л',
  'КОКА КОЛА 2Л',
  'ФАНТА ПОРТОКАЛ 1.5Л',
  'БИРА КАМЕНИЦА 500МЛ',
  'ВИНО МАВРУД',

  // Drinks - Hot
  'КАФЕ НЕСКАФЕ 100Г',
  'ЧАЙ ЧЕРЕН 20БР',
  'КАКАО НА ПРАХ',

  // Snacks
  'ЧИПС ПАПРКА 150Г',
  'ШОКОЛАД МИЛКА 100Г',
  'БИСКВИТИ ПЕТИФУРИ',
  'ВАФЛИ КУРАБИЙНИ',
  'БОНБОНИ ЖЕЛИРАНИ',
  'ЯДКИ МИКС 200Г',

  // Ready Meals
  'ПИЦА САЛАМ 400Г',
  'БАНИЦА С СИРЕНЕ',
  'МУСАКА ГОТОВА',

  // Household
  'ПРЕПАРАТ ЗА СЪДОВЕ',
  'ПРАХ ЗА ПРАНЕ 3КГ',
  'ТОАЛЕТНА ХАРТИЯ 8БР',
  'ТОРБИЧКИ ЗА СМЕТ',
  'БЕЛИНА 1Л',

  // Personal Care
  'ШАМПОАН PANTENE 400МЛ',
  'ПАСТА ЗА ЗЪБИ COLGATE',
  'САПУН ТЕЧЕН',
  'ДЕЗОДОРАНТ NIVEA',
  'КРЕМ ЗА РЪЦЕ',
];

function testNormalization() {
  console.log('🧪 Testing Enhanced Bulgarian Product Normalization\n');
  console.log('='.repeat(100));

  const results: {
    raw: string;
    normalized: string;
    base: string;
    brand: string | undefined;
    size: string;
    confidence: number;
    keywords: string[];
  }[] = [];

  let successCount = 0;
  let withBrand = 0;
  let withSize = 0;
  let withType = 0;

  for (const product of TEST_PRODUCTS) {
    try {
      // Parse and normalize
      const normalized = ProductNormalizer.normalize(product);
      const components = normalized.components;

      const sizeStr = components.size && components.unit
        ? `${components.size}${components.unit}`
        : 'N/A';

      const result = {
        raw: product,
        normalized: normalized.normalized_name,
        base: components.baseProduct,
        brand: components.brand,
        size: sizeStr,
        confidence: normalized.confidence,
        keywords: normalized.keywords,
      };

      results.push(result);
      successCount++;

      // Count features
      if (components.brand) withBrand++;
      if (components.size && components.unit) withSize++;
      if (components.type) withType++;

      // Log result
      const emoji = normalized.confidence >= 0.9 ? '✅' : normalized.confidence >= 0.7 ? '⚠️' : '❌';
      console.log(`\n${emoji} ${product}`);
      console.log(`   → ${normalized.normalized_name}`);
      console.log(`   Base: ${components.baseProduct} | Brand: ${components.brand || 'N/A'} | Size: ${sizeStr}`);
      if (components.type) console.log(`   Type: ${components.type}`);
      if (components.fatContent) console.log(`   Fat: ${components.fatContent}%`);
      console.log(`   Confidence: ${normalized.confidence.toFixed(2)}`);
      console.log(`   Keywords: ${normalized.keywords.slice(0, 5).join(', ')}${normalized.keywords.length > 5 ? '...' : ''}`);

    } catch (error) {
      console.error(`\n❌ FAILED: ${product}`);
      console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(100));
  console.log('\n📊 NORMALIZATION SUMMARY\n');
  console.log(`Total Products Tested: ${TEST_PRODUCTS.length}`);
  console.log(`Successfully Normalized: ${successCount} (${(successCount/TEST_PRODUCTS.length*100).toFixed(1)}%)`);
  console.log('\nExtracted Features:');
  console.log(`  With Brand: ${withBrand} (${(withBrand/successCount*100).toFixed(1)}%)`);
  console.log(`  With Size/Unit: ${withSize} (${(withSize/successCount*100).toFixed(1)}%)`);
  console.log(`  With Type: ${withType} (${(withType/successCount*100).toFixed(1)}%)`);

  // Group by base product
  const byBase: Record<string, number> = {};
  results.forEach(r => {
    byBase[r.base] = (byBase[r.base] || 0) + 1;
  });

  console.log('\nBy Base Product (Top 10):');
  Object.entries(byBase)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([base, count]) => {
      console.log(`  ${base}: ${count}`);
    });

  // Average confidence
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  console.log(`\nAverage Confidence: ${avgConfidence.toFixed(3)}`);

  // Check low confidence items
  const lowConfidence = results.filter(r => r.confidence < 0.7);
  if (lowConfidence.length > 0) {
    console.log(`\n⚠️  Low Confidence Items (< 0.7): ${lowConfidence.length}`);
    lowConfidence.forEach(r => {
      console.log(`  - ${r.raw} (${r.confidence.toFixed(2)})`);
    });
  }

  console.log('\n' + '='.repeat(100));
  console.log('\n✅ Normalization Test Complete!\n');

  return {
    total: TEST_PRODUCTS.length,
    success: successCount,
    withBrand,
    withSize,
    withType,
    avgConfidence,
    lowConfidence: lowConfidence.length,
  };
}

// Run the test
const stats = testNormalization();
console.log('📈 Final Statistics:', JSON.stringify(stats, null, 2));
