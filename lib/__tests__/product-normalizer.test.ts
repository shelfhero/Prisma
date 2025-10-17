/**
 * Product Normalizer Tests
 * Demonstrates Bulgarian product name normalization
 */

import { ProductNormalizer } from '../product-normalizer';

describe('ProductNormalizer', () => {

  describe('parseProductName', () => {
    it('should parse Kaufland milk product (Latin)', () => {
      const result = ProductNormalizer.parseProductName('VEREIA MLEKO 3.6% 1L');

      expect(result.baseProduct).toBe('мляко');
      expect(result.brand).toBe('Vereia');
      expect(result.size).toBe(1);
      expect(result.unit).toBe('л');
      expect(result.fatContent).toBe(3.6);
    });

    it('should parse BILLA milk product (Cyrillic)', () => {
      const result = ProductNormalizer.parseProductName('Мляко Верея прясно 3,6% 1л');

      expect(result.baseProduct).toBe('мляко');
      expect(result.brand).toBe('Верея');
      expect(result.type).toBe('прясно');
      expect(result.size).toBe(1);
      expect(result.unit).toBe('л');
      expect(result.fatContent).toBe(3.6);
    });

    it('should parse Lidl milk product (Mixed)', () => {
      const result = ProductNormalizer.parseProductName('Mleko prqsno Vereja 3.6% 1l');

      expect(result.baseProduct).toBe('мляко');
      expect(result.brand).toBe('Vereja');
      expect(result.size).toBe(1);
      expect(result.unit).toBe('л');
    });

    it('should parse bread product', () => {
      const result = ProductNormalizer.parseProductName('HLEB BEL 500G');

      expect(result.baseProduct).toBe('хляб');
      expect(result.size).toBe(500);
      expect(result.unit).toBe('г');
    });

    it('should parse cheese product', () => {
      const result = ProductNormalizer.parseProductName('SIRENE BJALO BDS 400gr');

      expect(result.baseProduct).toBe('сирене');
      expect(result.brand).toBe('Bds');
      expect(result.size).toBe(400);
      expect(result.unit).toBe('г');
    });

    it('should parse yogurt with attributes', () => {
      const result = ProductNormalizer.parseProductName('Йогурт Данон био 2.5% 500мл');

      expect(result.baseProduct).toBe('йогурт');
      expect(result.brand).toBe('Danone');
      expect(result.fatContent).toBe(2.5);
      expect(result.size).toBe(500);
      expect(result.unit).toBe('мл');
      expect(result.attributes).toContain('био');
    });
  });

  describe('normalizeProductName', () => {
    it('should create consistent format from Kaufland OCR', () => {
      const components = ProductNormalizer.parseProductName('VEREIA MLEKO 3.6% 1L');
      const normalized = ProductNormalizer.normalizeProductName(components);

      expect(normalized).toBe('мляко Vereia 3.6% 1л');
    });

    it('should create consistent format from BILLA', () => {
      const components = ProductNormalizer.parseProductName('Мляко Верея прясно 3,6% 1л');
      const normalized = ProductNormalizer.normalizeProductName(components);

      expect(normalized).toBe('мляко прясно Верея 3.6% 1л');
    });

    it('should create consistent format from Lidl', () => {
      const components = ProductNormalizer.parseProductName('Mleko prqsno Vereja 3.6% 1l');
      const normalized = ProductNormalizer.normalizeProductName(components);

      expect(normalized).toBe('мляко Vereja 3.6% 1л');
    });

    it('should handle products with multiple attributes', () => {
      const components = ProductNormalizer.parseProductName('Мляко Alpro соево био 1л');
      const normalized = ProductNormalizer.normalizeProductName(components);

      // Should have base product, brand, attributes, and size
      expect(normalized).toContain('мляко');
      expect(normalized).toContain('Alpro');
      expect(normalized).toContain('1л');
    });
  });

  describe('generateKeywords', () => {
    it('should generate search keywords', () => {
      const components = ProductNormalizer.parseProductName('Мляко Верея 3.6% 1л');
      const keywords = ProductNormalizer.generateKeywords(components);

      expect(keywords).toContain('мляко');
      expect(keywords).toContain('верея');
      expect(keywords).toContain('1л');
      // Should include synonyms
      expect(keywords.some(k => ['milk', 'mleko', 'млеко'].includes(k))).toBe(true);
    });

    it('should handle brand without spaces', () => {
      const components = ProductNormalizer.parseProductName('Coca Cola 2л');
      const keywords = ProductNormalizer.generateKeywords(components);

      // Should have both "coca cola" and "cocacola"
      expect(keywords).toContain('coca cola');
      expect(keywords).toContain('cocacola');
    });
  });

  describe('calculateSimilarity', () => {
    it('should match identical products', () => {
      const similarity = ProductNormalizer.calculateSimilarity(
        'мляко верея 3.6% 1л',
        'мляко верея 3.6% 1л'
      );

      expect(similarity).toBe(1.0);
    });

    it('should match similar products with high score', () => {
      const similarity = ProductNormalizer.calculateSimilarity(
        'VEREIA MLEKO 3.6% 1L',
        'Мляко Верея 3,6% 1л'
      );

      // Should have high similarity despite OCR/language differences
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should score different products low', () => {
      const similarity = ProductNormalizer.calculateSimilarity(
        'мляко верея 1л',
        'хляб бял 500г'
      );

      expect(similarity).toBeLessThan(0.3);
    });
  });

  describe('matchProduct', () => {
    const candidates = [
      {
        id: 1,
        normalized_name: 'мляко прясно Верея 3.6% 1л',
        brand: 'Верея',
        size: 1,
        unit: 'л',
        keywords: ['мляко', 'прясно', 'верея', '3.6%', '1л']
      },
      {
        id: 2,
        normalized_name: 'мляко Милковия 2.5% 1л',
        brand: 'Милковия',
        size: 1,
        unit: 'л',
        keywords: ['мляко', 'милковия', '2.5%', '1л']
      },
      {
        id: 3,
        normalized_name: 'хляб бял 500г',
        brand: null,
        size: 500,
        unit: 'г',
        keywords: ['хляб', 'бял', '500г']
      }
    ];

    it('should match exact product', () => {
      const components = ProductNormalizer.parseProductName('VEREIA MLEKO 3.6% 1L');
      const match = ProductNormalizer.matchProduct(components, candidates);

      expect(match).toBeDefined();
      expect(match?.id).toBe(1); // Should match Верея
      expect(match?.score).toBeGreaterThan(0.7);
    });

    it('should match by brand and size', () => {
      const components = ProductNormalizer.parseProductName('Мляко Верея 3.6% 1 литър');
      const match = ProductNormalizer.matchProduct(components, candidates);

      expect(match?.id).toBe(1);
    });

    it('should not match different products', () => {
      const components = ProductNormalizer.parseProductName('Хляб черен 1кг');
      const match = ProductNormalizer.matchProduct(components, candidates);

      // Should either not match or have low score
      if (match) {
        expect(match.score).toBeLessThan(0.6);
      }
    });

    it('should match by keywords when brand differs', () => {
      const components = ProductNormalizer.parseProductName('Mleko 2.5% 1L'); // No brand
      const match = ProductNormalizer.matchProduct(components, candidates);

      // Should match one of the milk products
      expect(match).toBeDefined();
      expect([1, 2]).toContain(match?.id);
    });
  });

  describe('Real-world Bulgarian products', () => {
    const testCases = [
      // Dairy products
      { raw: 'VEREIA MLEKO 3.6% 1L', expected: { base: 'мляко', brand: 'Vereia' } },
      { raw: 'Мляко прясно Милковия 1.5% 500мл', expected: { base: 'мляко', brand: 'Милковия' } },
      { raw: 'Сирене бяло БДС 400г', expected: { base: 'сирене', brand: 'Bds' } },
      { raw: 'KASHKAVAL PRESOVAN 300GR', expected: { base: 'кашкавал', size: 300 } },

      // Beverages
      { raw: 'Вода минерална Девин 1.5л', expected: { base: 'вода', brand: 'Devin' } },
      { raw: 'COCA COLA 2L', expected: { brand: 'Coca Cola', size: 2 } },

      // Bread
      { raw: 'Хляб пълнозърнест 500г', expected: { base: 'хляб', attributes: ['пълнозърнест'] } },

      // Meat
      { raw: 'Салам Маджаров 200г', expected: { base: 'салам', brand: 'Маджаров' } },

      // Snacks
      { raw: 'Кириешки пушени 80г', expected: { base: 'кириешки', brand: 'Kirieshki' } }
    ];

    testCases.forEach(({ raw, expected }) => {
      it(`should correctly parse: "${raw}"`, () => {
        const components = ProductNormalizer.parseProductName(raw);

        if (expected.base) {
          expect(components.baseProduct).toBe(expected.base);
        }
        if (expected.brand) {
          expect(components.brand).toContain(expected.brand);
        }
        if (expected.size) {
          expect(components.size).toBe(expected.size);
        }
        if (expected.attributes) {
          expected.attributes.forEach(attr => {
            expect(components.attributes).toContain(attr);
          });
        }
      });
    });
  });

  describe('normalize() - Full pipeline', () => {
    it('should provide full normalization with confidence', () => {
      const result = ProductNormalizer.normalize('VEREIA MLEKO 3.6% 1L');

      expect(result.normalized_name).toBeTruthy();
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.components.brand).toBeTruthy();
      expect(result.components.size).toBeTruthy();
    });

    it('should have lower confidence for incomplete data', () => {
      const result = ProductNormalizer.normalize('Продукт');

      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should have high confidence for complete data', () => {
      const result = ProductNormalizer.normalize('Мляко прясно Верея био 3.6% 1л');

      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });
});
