/**
 * Product Name Normalization Test Script
 *
 * Demonstrates the product name normalizer with real-world examples
 */

import { normalizeProductName, getProductComponents } from '../lib/product-name-normalizer';

// Test cases with expected outputs
const testCases = [
  {
    input: 'VEREIA MLEKO 3.6% 1L',
    description: 'Dairy product with Latin transliteration'
  },
  {
    input: 'ПРЯСНО МЛЯКО ВЕРЕЯ 3.6% 1Л',
    description: 'Dairy product in Cyrillic'
  },
  {
    input: 'хляб добруджа пълнозърнест 500гр',
    description: 'Bread product with type'
  },
  {
    input: 'Хляб Добруджа черен 500г',
    description: 'Bread product - black bread'
  },
  {
    input: 'coca cola 2л',
    description: 'Beverage - lowercase'
  },
  {
    input: 'Coca-Cola 2L',
    description: 'Beverage - uppercase'
  },
  {
    input: 'SIRENE BOR CHVOR 400G',
    description: 'Cheese product'
  },
  {
    input: 'Сирене Бор Чвор краве 400г',
    description: 'Cheese with type specification'
  },
  {
    input: 'bio mlqko 1l',
    description: 'Bio product'
  },
  {
    input: 'БИО МЛЯКО 1Л',
    description: 'Bio product in Cyrillic'
  },
  {
    input: 'кисело мляко Милковия 400г',
    description: 'Yogurt product'
  },
  {
    input: 'Coca-Cola Zero 330ml',
    description: 'Zero-calorie beverage'
  },
  {
    input: 'Coca-Cola Light 2L',
    description: 'Light beverage'
  },
  {
    input: 'минерална вода Devin 1.5л',
    description: 'Mineral water'
  },
  {
    input: 'пиво Zagorka 500мл',
    description: 'Beer product'
  },
  {
    input: 'кашкавал зрял 200г',
    description: 'Aged cheese'
  },
  {
    input: 'франзела бяла 400г',
    description: 'White baguette'
  },
  {
    input: 'LIDL BIO MLEKO 1L',
    description: 'Store brand bio milk'
  },
  {
    input: 'яйца 10бр',
    description: 'Eggs by count'
  },
  {
    input: 'Coca-Cola 6x330мл',
    description: 'Multi-pack format'
  },
  {
    input: 'мляко нискомаслено 1л',
    description: 'Low-fat milk'
  },
  {
    input: 'хляб ръжен 500г',
    description: 'Rye bread'
  },
  {
    input: 'месо пилешко охладено 1кг',
    description: 'Chicken meat'
  },
  {
    input: 'сок портокал натурален 1л',
    description: 'Orange juice'
  }
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('           PRODUCT NAME NORMALIZATION TEST');
console.log('═══════════════════════════════════════════════════════════════\n');

let successCount = 0;
let totalCount = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.description}`);
  console.log('─'.repeat(70));
  console.log(`Input:  ${testCase.input}`);

  try {
    const normalized = normalizeProductName(testCase.input);
    const components = getProductComponents(testCase.input);

    console.log(`Output: ${normalized}`);
    console.log('\nComponents:');
    console.log(`  • Base Product: ${components.baseProduct}`);
    if (components.brand) console.log(`  • Brand: ${components.brand}`);
    if (components.type) console.log(`  • Type: ${components.type}`);
    if (components.keyAttributes && components.keyAttributes.length > 0) {
      console.log(`  • Attributes: ${components.keyAttributes.join(', ')}`);
    }
    if (components.size && components.unit) {
      console.log(`  • Size: ${components.size}${components.unit}`);
    }

    successCount++;
    console.log('\n✓ Success');
  } catch (error) {
    console.log(`\n✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`                    SUMMARY`);
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Total Tests: ${totalCount}`);
console.log(`Successful: ${successCount}`);
console.log(`Failed: ${totalCount - successCount}`);
console.log(`Success Rate: ${((successCount / totalCount) * 100).toFixed(1)}%`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Example of batch processing
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('           BATCH PROCESSING EXAMPLE');
console.log('═══════════════════════════════════════════════════════════════\n');

const batchInput = [
  'VEREIA MLEKO 1L',
  'хляб Добруджа 500г',
  'Coca-Cola 2л',
  'сирене 400г',
  'био мляко 1л'
];

console.log('Input names:');
batchInput.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));

console.log('\nNormalized names:');
import { normalizeProductNames } from '../lib/product-name-normalizer';
const batchOutput = normalizeProductNames(batchInput);
batchOutput.forEach((name, i) => console.log(`  ${i + 1}. ${name}`));

console.log('\n═══════════════════════════════════════════════════════════════\n');
