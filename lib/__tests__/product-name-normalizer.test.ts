/**
 * Product Name Normalizer Tests
 *
 * Tests for Bulgarian product name normalization system
 */

import {
  normalizeProductName,
  normalizeProductNames,
  getProductComponents,
  BULGARIAN_BRANDS,
  PRODUCT_TYPES
} from '../product-name-normalizer';

describe('Product Name Normalizer', () => {
  describe('Basic Normalization', () => {
    it('should normalize dairy products with brand and fat content', () => {
      expect(normalizeProductName('VEREIA MLEKO 3.6% 1L')).toMatch(/мляко/i);
      expect(normalizeProductName('VEREIA MLEKO 3.6% 1L')).toContain('Верея');
      expect(normalizeProductName('VEREIA MLEKO 3.6% 1L')).toContain('3.6%');
      expect(normalizeProductName('VEREIA MLEKO 3.6% 1L')).toContain('1л');
    });

    it('should normalize bread products', () => {
      const result = normalizeProductName('хляб добруджа пълнозърнест 500гр');
      expect(result).toMatch(/хляб/i);
      expect(result).toContain('Добруджа');
      expect(result).toContain('пълнозърнест');
      expect(result).toContain('500г');
    });

    it('should normalize beverages', () => {
      const result = normalizeProductName('coca cola 2л');
      expect(result).toContain('Coca-Cola');
      expect(result).toContain('2л');
    });

    it('should normalize cheese products', () => {
      const result = normalizeProductName('SIRENE BOR CHVOR 400G');
      expect(result).toMatch(/сирене/i);
      expect(result).toContain('Бор Чвор');
      expect(result).toContain('400г');
    });

    it('should normalize bio products', () => {
      const result = normalizeProductName('bio mlqko 1l');
      expect(result).toMatch(/мляко/i);
      expect(result).toContain('био');
      expect(result).toContain('1л');
    });
  });

  describe('Size and Unit Extraction', () => {
    it('should handle liters', () => {
      expect(normalizeProductName('мляко 1л')).toContain('1л');
      expect(normalizeProductName('мляко 1.5л')).toContain('1,5л');
      expect(normalizeProductName('мляко 1 литър')).toContain('1л');
    });

    it('should handle milliliters', () => {
      expect(normalizeProductName('сок 500мл')).toContain('500мл');
      expect(normalizeProductName('сок 330 ml')).toContain('330мл');
    });

    it('should handle grams', () => {
      expect(normalizeProductName('сирене 400г')).toContain('400г');
      expect(normalizeProductName('сирене 400гр')).toContain('400г');
      expect(normalizeProductName('сирене 400 грама')).toContain('400г');
    });

    it('should handle kilograms', () => {
      expect(normalizeProductName('месо 2кг')).toContain('2кг');
      expect(normalizeProductName('месо 1.5 килограма')).toContain('1,5кг');
    });

    it('should handle piece counts', () => {
      expect(normalizeProductName('яйца 10бр')).toContain('10бр');
      expect(normalizeProductName('яйца 6 броя')).toContain('6бр');
    });

    it('should handle pack formats', () => {
      const result = normalizeProductName('coca cola 6x330мл');
      expect(result).toContain('1980мл'); // 6 * 330
    });
  });

  describe('Brand Recognition', () => {
    it('should recognize dairy brands', () => {
      expect(normalizeProductName('Верея мляко 1л')).toContain('Верея');
      expect(normalizeProductName('Милковия кисело мляко')).toContain('Милковия');
      expect(normalizeProductName('Бор Чвор сирене')).toContain('Бор Чвор');
    });

    it('should recognize bread brands', () => {
      expect(normalizeProductName('Добруджа хляб')).toContain('Добруджа');
      expect(normalizeProductName('Загора франзела')).toContain('Загора');
    });

    it('should recognize beverage brands', () => {
      expect(normalizeProductName('Coca-Cola 2л')).toContain('Coca-Cola');
      expect(normalizeProductName('Devin вода')).toContain('Devin');
    });

    it('should be case-insensitive', () => {
      expect(normalizeProductName('vereia mleko')).toContain('Верея');
      expect(normalizeProductName('VEREIA MLEKO')).toContain('Верея');
      expect(normalizeProductName('VeReIa MlEkO')).toContain('Верея');
    });
  });

  describe('Product Type Detection', () => {
    it('should detect dairy types', () => {
      expect(normalizeProductName('мляко прясно 1л')).toContain('прясно');
      expect(normalizeProductName('мляко био 1л')).toContain('био');
      expect(normalizeProductName('мляко нискомаслено')).toContain('нискомаслено');
    });

    it('should detect bread types', () => {
      expect(normalizeProductName('хляб пълнозърнест')).toContain('пълнозърнест');
      expect(normalizeProductName('хляб черен')).toContain('черен');
      expect(normalizeProductName('хляб грахамов')).toContain('грахамов');
    });

    it('should detect cheese types', () => {
      expect(normalizeProductName('сирене краве')).toContain('краве');
      expect(normalizeProductName('сирене овче')).toContain('овче');
      expect(normalizeProductName('кашкавал зрял')).toContain('зрял');
    });
  });

  describe('Attribute Extraction', () => {
    it('should extract percentage', () => {
      expect(normalizeProductName('мляко 3.6%')).toContain('3.6%');
      expect(normalizeProductName('мляко 2%')).toContain('2%');
      expect(normalizeProductName('бира 5% алкохол')).toContain('5%');
    });

    it('should extract bio/eco attributes', () => {
      expect(normalizeProductName('био мляко')).toContain('био');
      expect(normalizeProductName('еко продукт')).toContain('био');
      expect(normalizeProductName('organic milk')).toContain('био');
    });

    it('should extract light/zero attributes', () => {
      expect(normalizeProductName('coca cola light')).toContain('light');
      expect(normalizeProductName('кока кола zero')).toContain('zero');
    });
  });

  describe('Component Extraction', () => {
    it('should extract all components correctly', () => {
      const components = getProductComponents('VEREIA MLEKO 3.6% 1L');

      expect(components.baseProduct).toMatch(/мляко/i);
      expect(components.brand).toBe('Верея');
      expect(components.keyAttributes).toContain('3.6%');
      expect(components.size).toBe(1);
      expect(components.unit).toBe('л');
    });

    it('should handle missing components gracefully', () => {
      const components = getProductComponents('хляб');

      expect(components.baseProduct).toMatch(/хляб/i);
      expect(components.brand).toBeUndefined();
      expect(components.size).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle mixed Cyrillic and Latin', () => {
      const result = normalizeProductName('mleko Верея 1L');
      expect(result).toMatch(/мляко/i);
      expect(result).toContain('Верея');
      expect(result).toContain('1л');
    });

    it('should handle extra whitespace', () => {
      const result = normalizeProductName('  мляко   Верея   1л  ');
      expect(result).not.toMatch(/\s{2,}/); // No double spaces
    });

    it('should handle special characters', () => {
      const result = normalizeProductName('мляко-Верея, 1л.');
      expect(result).toMatch(/мляко/i);
      expect(result).toContain('Верея');
    });

    it('should handle empty or very short names', () => {
      expect(normalizeProductName('')).toBe('');
      expect(normalizeProductName('м')).toBeTruthy();
    });

    it('should handle unknown products', () => {
      const result = normalizeProductName('unknown product xyz');
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Normalization', () => {
    it('should normalize multiple names', () => {
      const names = [
        'VEREIA MLEKO 1L',
        'хляб Добруджа 500г',
        'Coca-Cola 2л'
      ];

      const normalized = normalizeProductNames(names);

      expect(normalized).toHaveLength(3);
      expect(normalized[0]).toMatch(/мляко/i);
      expect(normalized[1]).toMatch(/хляб/i);
      expect(normalized[2]).toContain('Coca-Cola');
    });
  });

  describe('Real-World Examples', () => {
    const testCases = [
      {
        input: 'ПРЯСНО МЛЯКО ВЕРЕЯ 3.6% 1Л',
        expected: {
          baseProduct: /мляко/i,
          brand: 'Верея',
          attributes: ['3.6%'],
          size: '1л'
        }
      },
      {
        input: 'Хляб пълнозърнест Добруджа 500гр',
        expected: {
          baseProduct: /хляб/i,
          brand: 'Добруджа',
          type: 'пълнозърнест',
          size: '500г'
        }
      },
      {
        input: 'СИРЕНЕ БОР ЧВОР КРАВЕ 400Г',
        expected: {
          baseProduct: /сирене/i,
          brand: 'Бор Чвор',
          type: 'краве',
          size: '400г'
        }
      },
      {
        input: 'Coca-Cola 2L',
        expected: {
          brand: 'Coca-Cola',
          size: '2л'
        }
      },
      {
        input: 'BIO MLQKO 1L',
        expected: {
          baseProduct: /мляко/i,
          attributes: ['био'],
          size: '1л'
        }
      }
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should normalize: ${input}`, () => {
        const result = normalizeProductName(input);

        if (expected.baseProduct) {
          expect(result).toMatch(expected.baseProduct);
        }
        if (expected.brand) {
          expect(result).toContain(expected.brand);
        }
        if (expected.type) {
          expect(result).toContain(expected.type);
        }
        if (expected.attributes) {
          expected.attributes.forEach(attr => {
            expect(result).toContain(attr);
          });
        }
        if (expected.size) {
          expect(result).toContain(expected.size);
        }
      });
    });
  });

  describe('Configuration Exports', () => {
    it('should export Bulgarian brands database', () => {
      expect(BULGARIAN_BRANDS).toBeDefined();
      expect(BULGARIAN_BRANDS.dairy).toContain('Верея');
      expect(BULGARIAN_BRANDS.bread).toContain('Добруджа');
      expect(BULGARIAN_BRANDS.beverages).toContain('Coca-Cola');
    });

    it('should export product types', () => {
      expect(PRODUCT_TYPES).toBeDefined();
      expect(PRODUCT_TYPES.dairy.keywords).toContain('мляко');
      expect(PRODUCT_TYPES.bread.types).toContain('пълнозърнест');
    });
  });
});
