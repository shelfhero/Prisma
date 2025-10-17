/**
 * INTELLIGENT PRODUCT NORMALIZATION ENGINE
 * Handles Bulgarian grocery items with fuzzy matching and smart component extraction
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ProductComponents {
  baseProduct: string;      // "Мляко"
  brand?: string;           // "Верея"
  type?: string;            // "прясно"
  size?: number;            // 1.0
  unit?: string;            // "л"
  fatContent?: number;      // 3.6 (for dairy)
  attributes?: string[];    // ["пълномаслено", "био"]
  barcode?: string;
}

export interface NormalizedProduct {
  normalized_name: string;
  display_name: string;
  components: ProductComponents;
  keywords: string[];
  confidence: number;
}

export interface MatchResult {
  master_product_id: number | null;
  confidence: number;
  is_new: boolean;
  normalized_name: string;
}

// ============================================================================
// KNOWN BULGARIAN BRANDS DATABASE
// ============================================================================

const KNOWN_BRANDS = {
  dairy: [
    'верея', 'vereja', 'vereia',
    'милковия', 'milkovia',
    'бор чвор', 'bor cvor',
    'валио', 'valio',
    'бдс', 'bds',
    'родопско', 'rodopsko',
    'загора', 'zagora',
    'балканика', 'balkanika',
    'витоша', 'vitosha'
  ],
  meat: [
    'маджаров', 'madjarov',
    'тандем', 'tandem',
    'дунав', 'dunav',
    'свиленград', 'svilengrad',
    'елит', 'elit',
    'елена', 'elena'
  ],
  beverages: [
    'coca cola', 'coca-cola', 'кока кола',
    'pepsi', 'пепси',
    'fanta', 'фанта',
    'sprite', 'спрайт',
    'bankya', 'банкя',
    'devin', 'девин',
    'gorna banya', 'gorна баня',
    'каменица', 'kamenitsa'
  ],
  snacks: [
    'кириешки', 'kirieshki',
    'chipita', 'чипита',
    'nestle', 'нестле',
    'milka', 'милка',
    'ritter sport', 'ритер спорт',
    'heinz'
  ],
  personal_care: [
    'pantene',
    'colgate',
    'nivea'
  ],
  general: [
    'vita', 'вита',
    'danone', 'данон',
    'alpro', 'алпро',
    'arla', 'арла'
  ]
};

const ALL_BRANDS = [
  ...KNOWN_BRANDS.dairy,
  ...KNOWN_BRANDS.meat,
  ...KNOWN_BRANDS.beverages,
  ...KNOWN_BRANDS.snacks,
  ...KNOWN_BRANDS.personal_care,
  ...KNOWN_BRANDS.general
];

// ============================================================================
// PRODUCT TYPE KEYWORDS
// ============================================================================

const PRODUCT_TYPES = {
  'мляко': ['прясно', 'кисело', 'bio', 'био', 'lactose free', 'безлактозно'],
  'сирене': ['бяло', 'yellow', 'жълто', 'крема', 'извара'],
  'кашкавал': ['пресован', 'traditional', 'традиционен'],
  'масло': ['краве', 'cow', 'растително', 'слънчоглед'],
  'хляб': ['бял', 'черен', 'пълнозърнест', 'ръжен'],
  'яйца': ['от свободни', 'био', 'размер l', 'размер m', 'размер s']
};

// ============================================================================
// PRODUCT SYNONYMS FOR BETTER MATCHING
// ============================================================================

const PRODUCT_SYNONYMS: Record<string, string[]> = {
  'мляко': ['млеко', 'milk', 'mleko', 'млqко'],
  'хляб': ['bread', 'hlqb', 'хлqб', 'hleb'],
  'масло': ['butter', 'oil', 'масло'],
  'сирене': ['cheese', 'sirene', 'white cheese'],
  'кашкавал': ['kashkaval', 'yellow cheese'],
  'яйца': ['eggs', 'jajca', 'яйце'],
  'вода': ['water', 'voda'],
  'сок': ['juice', 'sok'],
  'месо': ['meat', 'meso'],
  'риба': ['fish', 'riba'],
  'плодове': ['fruits', 'plodove'],
  'зеленчуци': ['vegetables', 'zelenchutsi']
};

// ============================================================================
// UNIT NORMALIZATION
// ============================================================================

const UNIT_MAPPINGS: Record<string, string> = {
  'л': 'л',
  'литра': 'л',
  'литър': 'л',
  'l': 'л',
  'мл': 'мл',
  'ml': 'мл',
  'кг': 'кг',
  'kg': 'кг',
  'килограм': 'кг',
  'килограма': 'кг',
  'г': 'г',
  'gr': 'г',
  'g': 'г',
  'грам': 'г',
  'грама': 'г',
  'бр': 'бр',
  'брой': 'бр',
  'шт': 'бр',
  'бр.': 'бр'
};

// ============================================================================
// COMPONENT EXTRACTION
// ============================================================================

export class ProductNormalizer {

  /**
   * Parse raw product name into components
   */
  static parseProductName(rawName: string): ProductComponents {
    // Clean and normalize input
    let cleaned = rawName
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    // Extract barcode (EAN-13 or similar)
    const barcodePattern = /\b\d{8,14}\b/;
    const barcodeMatch = cleaned.match(barcodePattern);
    const barcode = barcodeMatch ? barcodeMatch[0] : undefined;

    // Extract size and unit (1л, 500г, 2кг, 1.5l, etc.)
    const sizePattern = /(\d+(?:[.,]\d+)?)\s*(л|литра|литър|l|мл|ml|кг|kg|килограм|г|gr|g|грам|бр|брой|шт)/i;
    const sizeMatch = cleaned.match(sizePattern);

    let size: number | undefined;
    let unit: string | undefined;

    if (sizeMatch) {
      size = parseFloat(sizeMatch[1].replace(',', '.'));
      const rawUnit = sizeMatch[2].toLowerCase();
      unit = UNIT_MAPPINGS[rawUnit] || rawUnit;
    }

    // Extract fat content percentage (3.6%, 2.5%, etc.)
    const fatPattern = /(\d+(?:[.,]\d+)?)\s*%/;
    const fatMatch = cleaned.match(fatPattern);
    const fatContent = fatMatch ? parseFloat(fatMatch[1].replace(',', '.')) : undefined;

    // Extract brand
    const brand = this.extractBrand(cleaned);

    // Extract product type attributes
    const attributes = this.extractAttributes(cleaned);

    // Extract base product (main product category)
    const baseProduct = this.extractBaseProduct(cleaned);

    // Extract product type (e.g., "прясно" for milk)
    const type = this.extractProductType(cleaned, baseProduct);

    return {
      baseProduct,
      brand,
      type,
      size,
      unit,
      fatContent,
      attributes,
      barcode
    };
  }

  /**
   * Extract brand from product name
   */
  private static extractBrand(text: string): string | undefined {
    // Normalize text for matching
    const normalized = text.toLowerCase();

    // Try to find brand in text
    for (const brand of ALL_BRANDS) {
      const brandLower = brand.toLowerCase();
      if (normalized.includes(brandLower)) {
        // Return properly capitalized brand name
        return brand.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }

    return undefined;
  }

  /**
   * Extract base product (main category)
   */
  private static extractBaseProduct(text: string): string {
    const normalized = text.toLowerCase();

    // Common Bulgarian product patterns - EXPANDED
    // IMPORTANT: Order matters! More specific patterns first
    const productPatterns = [
      // Condiments (must be before fruits/vegetables)
      { pattern: /\bоцет\b/i, product: 'оцет' },
      { pattern: /\bкетчуп\b/i, product: 'кетчуп' },
      { pattern: /\bмайонеза\b/i, product: 'майонеза' },
      { pattern: /\bлютеница\b/i, product: 'лютеница' },

      // Specific drinks (before generic ones)
      { pattern: /\bкока\s*кола\b/i, product: 'кока кола' },
      { pattern: /\bфанта\b/i, product: 'фанта' },
      { pattern: /\bспрайт\b/i, product: 'спрайт' },

      // Specific foods (before generic ones)
      { pattern: /\bшоколад\b/i, product: 'шоколад' },
      { pattern: /\bпица\b/i, product: 'пица' },
      { pattern: /\bбаница\b/i, product: 'баница' },
      { pattern: /\bмусака\b/i, product: 'мусака' },

      // Household (must be before other categories)
      { pattern: /\bпрепарат\b/i, product: 'препарат' },
      { pattern: /\bпрах\b/i, product: 'прах за пране' },
      { pattern: /\bтоалетна\s+хартия\b/i, product: 'тоалетна хартия' },
      { pattern: /\bторбички\b/i, product: 'торбички' },
      { pattern: /\bбелина\b/i, product: 'белина' },

      // Personal care (must be before general)
      { pattern: /\bшампоан\b/i, product: 'шампоан' },
      { pattern: /\bпаста\s+(за\s+)?зъби\b/i, product: 'паста за зъби' },
      { pattern: /\bдезодорант\b/i, product: 'дезодорант' },
      { pattern: /\bкрем\b/i, product: 'крем' },
      { pattern: /\bсапун\b/i, product: 'сапун' },

      // Dairy
      { pattern: /\bмл[ея]ко\b/i, product: 'мляко' },
      { pattern: /\bсирене\b/i, product: 'сирене' },
      { pattern: /\bкашкавал\b/i, product: 'кашкавал' },
      { pattern: /\bйогурт\b/i, product: 'йогурт' },
      { pattern: /\bмасло\b(?!.*олио)/i, product: 'масло' },
      { pattern: /\bизвара\b/i, product: 'извара' },
      { pattern: /\bкрема\b/i, product: 'крема' },
      { pattern: /\bсметана\b/i, product: 'сметана' },
      { pattern: /\bайран\b/i, product: 'айран' },

      // Meat
      { pattern: /\bмесо\b/i, product: 'месо' },
      { pattern: /\bпилешко\b|\bпиле\b/i, product: 'пилешко' },
      { pattern: /\bсвинско\b|\bсвински\b|\bсвинска\b/i, product: 'свинско' },
      { pattern: /\bговеждо\b|\bговежд/i, product: 'говеждо' },
      { pattern: /\bсалам\b/i, product: 'салам' },
      { pattern: /\bшунка\b/i, product: 'шунка' },
      { pattern: /\bкебап/i, product: 'кебап' },
      { pattern: /\bлуканка\b/i, product: 'луканка' },
      { pattern: /\bсуджук\b/i, product: 'суджук' },
      { pattern: /\bбекон\b/i, product: 'бекон' },
      { pattern: /\bнаденица\b/i, product: 'наденица' },

      // Fish
      { pattern: /\bриба\b/i, product: 'риба' },
      { pattern: /\bтон\b/i, product: 'тон' },
      { pattern: /\bсьомга\b/i, product: 'сьомга' },
      { pattern: /\bскумрия\b/i, product: 'скумрия' },

      // Eggs
      { pattern: /\bя[йи]ца\b/i, product: 'яйца' },

      // Bread & Bakery
      { pattern: /\bхл[ея]б\b/i, product: 'хляб' },
      { pattern: /\bпитка\b/i, product: 'питка' },
      { pattern: /\bкифл/i, product: 'кифла' },
      { pattern: /\bфранзела\b/i, product: 'франзела' },
      { pattern: /\bбагета\b/i, product: 'багета' },
      { pattern: /\bкозунак\b/i, product: 'козунак' },
      { pattern: /\bпогача\b/i, product: 'погача' },

      // Vegetables
      { pattern: /\bдомат/i, product: 'домат' },
      { pattern: /\bкраставиц/i, product: 'краставица' },
      { pattern: /\bчушк/i, product: 'чушка' },
      { pattern: /\bлук\b/i, product: 'лук' },
      { pattern: /\bкартоф/i, product: 'картоф' },
      { pattern: /\bморкови\b/i, product: 'моркови' },
      { pattern: /\bзеле\b|\bзелка\b/i, product: 'зеле' },
      { pattern: /\bчесън\b/i, product: 'чесън' },
      { pattern: /\bпатладжан\b/i, product: 'патладжан' },
      { pattern: /\bтиквичк/i, product: 'тиквички' },

      // Fruits
      { pattern: /\bябълк/i, product: 'ябълка' },
      { pattern: /\bбанан/i, product: 'банан' },
      { pattern: /\bпортокал/i, product: 'портокал' },
      { pattern: /\bгрозде\b/i, product: 'грозде' },
      { pattern: /\bкруша\b/i, product: 'круша' },
      { pattern: /\bпраскова\b/i, product: 'праскова' },
      { pattern: /\bкайсия\b/i, product: 'кайсия' },
      { pattern: /\bчереша\b/i, product: 'череша' },
      { pattern: /\bягода\b/i, product: 'ягода' },
      { pattern: /\bдиня\b/i, product: 'диня' },
      { pattern: /\bпъпеш\b/i, product: 'пъпеш' },
      { pattern: /\bлимон/i, product: 'лимон' },
      { pattern: /\bмандарин/i, product: 'мандарина' },

      // Staples
      { pattern: /\bзахар\b/i, product: 'захар' },
      { pattern: /\bсол\b/i, product: 'сол' },
      { pattern: /\bбрашно\b/i, product: 'брашно' },
      { pattern: /\bориз\b/i, product: 'ориз' },
      { pattern: /\bмакарони\b/i, product: 'макарони' },
      { pattern: /\bспагети\b/i, product: 'спагети' },
      { pattern: /\bфиде\b/i, product: 'фиде' },
      { pattern: /\bолио\b/i, product: 'олио' },
      { pattern: /\bзехтин\b/i, product: 'зехтин' },

      // Drinks
      { pattern: /\bвода\b/i, product: 'вода' },
      { pattern: /\bсок\b/i, product: 'сок' },
      { pattern: /\bкафе\b/i, product: 'кафе' },
      { pattern: /\bчай\b/i, product: 'чай' },
      { pattern: /\bбира\b/i, product: 'бира' },
      { pattern: /\bвино\b/i, product: 'вино' },
      { pattern: /\bкакао\b/i, product: 'какао' },

      // Snacks
      { pattern: /\bчипс\b/i, product: 'чипс' },
      { pattern: /\bбисквит/i, product: 'бисквити' },
      { pattern: /\bвафл/i, product: 'вафли' },
      { pattern: /\bбонбон/i, product: 'бонбони' },
      { pattern: /\bкекс\b/i, product: 'кекс' },
      { pattern: /\bядк/i, product: 'ядки' },
    ];

    for (const { pattern, product } of productPatterns) {
      if (pattern.test(normalized)) {
        return product;
      }
    }

    // If no pattern matches, return the full cleaned text (preserve product names)
    // Remove size/unit info and extra whitespace, but keep the full name
    let cleanedName = normalized
      .replace(/\d+(?:[.,]\d+)?\s*(?:л|литра|литър|l|мл|ml|кг|kg|килограм|г|gr|g|грам|бр|брой|шт)\b/gi, '') // Remove size
      .replace(/\d+(?:[.,]\d+)?\s*%/g, '') // Remove percentages
      .replace(/\s+/g, ' ')
      .trim();

    return cleanedName || 'продукт';
  }

  /**
   * Extract product type (e.g., "прясно" for milk)
   */
  private static extractProductType(text: string, baseProduct: string): string | undefined {
    const normalized = text.toLowerCase();
    const types = PRODUCT_TYPES[baseProduct];

    if (!types) return undefined;

    for (const type of types) {
      if (normalized.includes(type.toLowerCase())) {
        return type;
      }
    }

    return undefined;
  }

  /**
   * Extract product attributes
   */
  private static extractAttributes(text: string): string[] {
    const normalized = text.toLowerCase();
    const attributes: string[] = [];

    // Common attributes
    const attributePatterns = [
      { pattern: /\bbio\b|\bбио\b/i, attr: 'био' },
      { pattern: /lactose free|безлактозно/i, attr: 'безлактозно' },
      { pattern: /пълномаслено|full fat/i, attr: 'пълномаслено' },
      { pattern: /нископроцентно|low fat/i, attr: 'нископроцентно' },
      { pattern: /пълнозърнест|whole grain/i, attr: 'пълнозърнест' },
      { pattern: /gluten free|без глутен/i, attr: 'без глутен' },
      { pattern: /веган|vegan/i, attr: 'веган' },
      { pattern: /органик|organic/i, attr: 'органик' }
    ];

    for (const { pattern, attr } of attributePatterns) {
      if (pattern.test(normalized)) {
        attributes.push(attr);
      }
    }

    return attributes;
  }

  /**
   * Create normalized product name from components (for matching)
   */
  static normalizeProductName(components: ProductComponents): string {
    const parts: string[] = [];

    // Base product (always first)
    parts.push(components.baseProduct);

    // Product type
    if (components.type) {
      parts.push(components.type);
    }

    // Brand
    if (components.brand) {
      parts.push(components.brand);
    }

    // Fat content
    if (components.fatContent) {
      parts.push(`${components.fatContent}%`);
    }

    // Attributes
    if (components.attributes && components.attributes.length > 0) {
      parts.push(...components.attributes);
    }

    // Size and unit
    if (components.size && components.unit) {
      parts.push(`${components.size}${components.unit}`);
    }

    return parts
      .filter(Boolean)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Create human-readable display name from components
   * Uses proper capitalization and natural language formatting
   */
  static createDisplayName(components: ProductComponents): string {
    const parts: string[] = [];

    // Capitalize first letter of each word for base product
    const capitalizeWord = (word: string) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

    // Base product (capitalized)
    parts.push(capitalizeWord(components.baseProduct));

    // Product type (lowercase unless it's an acronym)
    if (components.type) {
      const typeWord = components.type.length <= 3 && components.type.toUpperCase() === components.type
        ? components.type.toUpperCase()  // Keep acronyms uppercase
        : components.type.toLowerCase();
      parts.push(typeWord);
    }

    // Brand (properly capitalized)
    if (components.brand) {
      parts.push(components.brand);
    }

    // Fat content
    if (components.fatContent) {
      parts.push(`${components.fatContent}%`);
    }

    // Attributes (lowercase)
    if (components.attributes && components.attributes.length > 0) {
      parts.push(...components.attributes.map(attr => attr.toLowerCase()));
    }

    // Size and unit with proper spacing
    if (components.size && components.unit) {
      parts.push(`${components.size} ${components.unit}`);
    }

    return parts
      .filter(Boolean)
      .join(' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Generate keywords for search and matching
   */
  static generateKeywords(components: ProductComponents): string[] {
    const keywords = new Set<string>();

    // Add base product
    keywords.add(components.baseProduct.toLowerCase());

    // Add synonyms for base product
    const synonyms = PRODUCT_SYNONYMS[components.baseProduct];
    if (synonyms) {
      synonyms.forEach(syn => keywords.add(syn.toLowerCase()));
    }

    // Add brand
    if (components.brand) {
      keywords.add(components.brand.toLowerCase());
      // Add brand without spaces
      keywords.add(components.brand.toLowerCase().replace(/\s+/g, ''));
    }

    // Add type
    if (components.type) {
      keywords.add(components.type.toLowerCase());
    }

    // Add size
    if (components.size && components.unit) {
      keywords.add(`${components.size}${components.unit}`);
    }

    // Add attributes
    if (components.attributes) {
      components.attributes.forEach(attr => keywords.add(attr.toLowerCase()));
    }

    // Add barcode
    if (components.barcode) {
      keywords.add(components.barcode);
    }

    return Array.from(keywords).filter(k => k.length > 1);
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   */
  static calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const costs: number[] = [];
    for (let i = 0; i <= s2.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s1.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
            newValue = Math.min(
              Math.min(newValue, lastValue),
              costs[j]
            ) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s1.length] = lastValue;
    }

    const maxLength = Math.max(s1.length, s2.length);
    const distance = costs[s1.length];

    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Jaccard similarity between two keyword sets
   */
  static calculateJaccardSimilarity(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1.map(k => k.toLowerCase()));
    const set2 = new Set(keywords2.map(k => k.toLowerCase()));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  /**
   * Match product against candidates with scoring
   */
  static matchProduct(
    components: ProductComponents,
    candidates: Array<{
      id: number;
      normalized_name: string;
      brand: string | null;
      size: number | null;
      unit: string | null;
      keywords: string[] | null;
    }>
  ): { id: number; score: number } | null {

    const normalizedName = this.normalizeProductName(components);
    const keywords = this.generateKeywords(components);

    let bestMatch: { id: number; score: number } | null = null;

    for (const candidate of candidates) {
      let score = 0;
      let weights = 0;

      // Exact name match (very high weight)
      if (candidate.normalized_name.toLowerCase() === normalizedName.toLowerCase()) {
        return { id: candidate.id, score: 1.0 };
      }

      // Name similarity (high weight)
      const nameSimilarity = this.calculateSimilarity(normalizedName, candidate.normalized_name);
      score += nameSimilarity * 0.4;
      weights += 0.4;

      // Brand match (medium-high weight)
      if (components.brand && candidate.brand) {
        if (components.brand.toLowerCase() === candidate.brand.toLowerCase()) {
          score += 0.25;
        }
        weights += 0.25;
      }

      // Size and unit match (medium weight)
      if (components.size && components.unit && candidate.size && candidate.unit) {
        if (components.size === candidate.size && components.unit === candidate.unit) {
          score += 0.2;
        }
        weights += 0.2;
      }

      // Keyword similarity (medium weight)
      if (candidate.keywords) {
        const keywordSimilarity = this.calculateJaccardSimilarity(keywords, candidate.keywords);
        score += keywordSimilarity * 0.15;
        weights += 0.15;
      }

      // Normalize score
      const finalScore = weights > 0 ? score / weights : 0;

      // Update best match if this is better
      if (finalScore > 0.6 && (!bestMatch || finalScore > bestMatch.score)) {
        bestMatch = { id: candidate.id, score: finalScore };
      }
    }

    return bestMatch;
  }

  /**
   * Full normalization pipeline
   */
  static normalize(rawName: string): NormalizedProduct {
    const components = this.parseProductName(rawName);
    const normalized_name = this.normalizeProductName(components);
    const display_name = this.createDisplayName(components);
    const keywords = this.generateKeywords(components);

    // Calculate confidence based on how much we extracted
    let confidence = 0.5; // Base confidence

    if (components.brand) confidence += 0.15;
    if (components.size && components.unit) confidence += 0.15;
    if (components.type) confidence += 0.1;
    if (components.fatContent) confidence += 0.05;
    if (components.barcode) confidence += 0.05;

    return {
      normalized_name,
      display_name,
      components,
      keywords,
      confidence: Math.min(confidence, 1.0)
    };
  }
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

export function normalizeProductName(rawName: string): string {
  const components = ProductNormalizer.parseProductName(rawName);
  return ProductNormalizer.normalizeProductName(components);
}

export function generateKeywords(rawName: string): string[] {
  const components = ProductNormalizer.parseProductName(rawName);
  return ProductNormalizer.generateKeywords(components);
}

export function calculateSimilarity(name1: string, name2: string): number {
  return ProductNormalizer.calculateSimilarity(name1, name2);
}
