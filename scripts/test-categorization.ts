/**
 * Test Enhanced Categorization System
 * Tests the integrated product normalization and categorization
 */

import { categorizeProduct } from '../lib/categorization-engine';
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

async function testCategorization() {
  console.log('🧪 Testing Enhanced Bulgarian Product Categorization\n');
  console.log('='.repeat(80));

  const results: {
    product: string;
    normalized: string;
    category: string;
    method: string;
    confidence: number;
  }[] = [];

  let successCount = 0;
  let cacheHits = 0;
  let ruleMatches = 0;
  let aiMatches = 0;

  for (const product of TEST_PRODUCTS) {
    try {
      // Test normalization
      const normalized = ProductNormalizer.normalize(product);

      // Test categorization
      const category = await categorizeProduct(product, 'LIDL');

      const result = {
        product,
        normalized: normalized.normalized_name,
        category: category.category_name,
        method: category.method,
        confidence: category.confidence,
      };

      results.push(result);
      successCount++;

      // Count by method
      if (category.method === 'cache') cacheHits++;
      else if (category.method === 'rule') ruleMatches++;
      else if (category.method === 'ai') aiMatches++;

      // Log result
      const emoji = category.confidence >= 0.9 ? '✅' : category.confidence >= 0.7 ? '⚠️' : '❌';
      console.log(`\n${emoji} ${product}`);
      console.log(`   Normalized: ${normalized.normalized_name}`);
      console.log(`   Category: ${category.category_name} (${category.confidence.toFixed(2)})`);
      console.log(`   Method: ${category.method}`);

    } catch (error) {
      console.error(`\n❌ FAILED: ${product}`);
      console.error(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 CATEGORIZATION SUMMARY\n');
  console.log(`Total Products Tested: ${TEST_PRODUCTS.length}`);
  console.log(`Successfully Categorized: ${successCount} (${(successCount/TEST_PRODUCTS.length*100).toFixed(1)}%)`);
  console.log('\nBy Method:');
  console.log(`  Cache Hits: ${cacheHits} (${(cacheHits/successCount*100).toFixed(1)}%)`);
  console.log(`  Rule Matches: ${ruleMatches} (${(ruleMatches/successCount*100).toFixed(1)}%)`);
  console.log(`  AI Matches: ${aiMatches} (${(aiMatches/successCount*100).toFixed(1)}%)`);

  // Group by category
  const byCategory: Record<string, number> = {};
  results.forEach(r => {
    byCategory[r.category] = (byCategory[r.category] || 0) + 1;
  });

  console.log('\nBy Category:');
  Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} (${(count/successCount*100).toFixed(1)}%)`);
    });

  // Check for uncategorized
  const uncategorized = results.filter(r => r.category === 'Други');
  if (uncategorized.length > 0) {
    console.log('\n⚠️  Uncategorized Items:');
    uncategorized.forEach(r => {
      console.log(`  - ${r.product}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Test Complete!\n');
}

// Run the test
testCategorization().catch(console.error);
