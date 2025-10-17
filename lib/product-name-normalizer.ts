/**
 * Product Name Normalizer
 *
 * Normalizes Bulgarian product names into detailed, human-readable format
 * with proper brand recognition, type identification, and attribute extraction.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ProductComponents {
  baseProduct: string;      // "Мляко", "Хляб", "Coca-Cola"
  brand?: string;           // "Верея", "Добруджа", "Nestle"
  type?: string;            // "прясно", "пълнозърнест", "класическа"
  keyAttributes?: string[]; // ["3.6%", "био", "нискомаслено"]
  size?: number;            // 1.0, 500, 2
  unit?: string;            // "л", "г", "кг", "бр"
  packaging?: string;       // "стъклена бутилка", "тетрапак"
}

// ============================================================================
// BULGARIAN BRANDS DATABASE
// ============================================================================

export const BULGARIAN_BRANDS = {
  dairy: [
    'Верея', 'Милковия', 'Бор Чвор', 'Валио', 'БДС',
    'Маджаров', 'Родопея', 'Здравец', 'Боровец',
    'Данон', 'Лакт', 'Олинеза', 'Манджа'
  ],
  meat: [
    'Карамел', 'Родопски деликатес', 'Свилоза',
    'Владимирови', 'Елит', 'Сарина'
  ],
  bread: [
    'Добруджа', 'Житен хляб', 'Хлебарна', 'Загора',
    'Елиаз', 'Панорама', 'Дунавски хляб'
  ],
  beverages: [
    'Coca-Cola', 'Pepsi', 'Fanta', 'Sprite',
    'Devin', 'Gorna Bania', 'Bankya', 'Mihalkovo',
    'Zagorka', 'Kamenitza', 'Shumensko', 'Burgasko',
    'Бианка', 'Пелин', 'Момина сълза'
  ],
  snacks: [
    'Кришни', 'Лайт', 'Чипс Трак', 'Милка',
    'Nestle', 'Черноморски фъстъци'
  ],
  general: [
    'Балканика', 'Екодар', 'Органико', 'Био',
    'Рила', 'Пирин', 'Родопи'
  ]
};

// Flatten all brands into searchable array
const ALL_BRANDS = Object.values(BULGARIAN_BRANDS).flat();

// ============================================================================
// PRODUCT TYPE VOCABULARY
// ============================================================================

interface ProductTypeConfig {
  keywords: string[];
  types: string[];
}

export const PRODUCT_TYPES: Record<string, ProductTypeConfig> = {
  dairy: {
    keywords: ['мляко', 'млеко', 'кисело мляко', 'айрян', 'mlqko', 'mleko', 'mliako'],
    types: ['прясно', 'пастьоризирано', 'УВТ', 'био', 'нискомаслено', 'пълномаслено']
  },
  cheese: {
    keywords: ['сирене', 'кашкавал', 'извара', 'sirene', 'kashkaval'],
    types: ['краве', 'овче', 'смесено', 'зрял', 'млад', 'топено']
  },
  bread: {
    keywords: ['хляб', 'франзела', 'питка', 'hliab', 'hlqb'],
    types: ['бял', 'черен', 'пълнозърнест', 'ръжен', 'многозърнест', 'грахамов', 'пшеничен']
  },
  meat: {
    keywords: ['месо', 'кебап', 'кюфте', 'наденица', 'салам', 'шунка', 'meso'],
    types: ['пилешко', 'свинско', 'говеждо', 'телешко', 'агнешко', 'прясно', 'охладено', 'замразено']
  },
  drinks: {
    keywords: ['сок', 'вода', 'безалкохолна', 'газирана', 'сода', 'sok', 'voda'],
    types: ['натурален', 'нектар', 'газирана', 'негазирана', 'минерална', 'изворна']
  },
  yogurt: {
    keywords: ['кисело мляко', 'йогурт', 'jogurt', 'kiselo'],
    types: ['българско', 'гръцко', 'био', '3.6%', '2%']
  }
};

// ============================================================================
// TRANSLITERATION MAP (Cyrillic <-> Latin)
// ============================================================================

const CYRILLIC_TO_LATIN: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
  'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
  'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sht', 'ъ': 'a', 'ь': 'y',
  'ю': 'yu', 'я': 'ya'
};

const LATIN_TO_CYRILLIC: Record<string, string> = {
  'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е',
  'z': 'з', 'i': 'и', 'y': 'й', 'k': 'к', 'l': 'л', 'm': 'м',
  'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р', 's': 'с', 't': 'т',
  'u': 'у', 'f': 'ф', 'h': 'х', 'q': 'я'
};

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Extracts size and unit from product name
 */
function extractSizeAndUnit(text: string): { size?: number; unit?: string; cleaned: string } {
  let size: number | undefined;
  let unit: string | undefined;
  let cleaned = text;

  const sizePatterns = [
    /(\d+(?:[.,]\d+)?)\s*(л|литра?|litr[ao]?)/i,          // 1л, 1 литър
    /(\d+(?:[.,]\d+)?)\s*(мл|ml)/i,                        // 500мл
    /(\d+(?:[.,]\d+)?)\s*(кг|килограма?|kg)/i,            // 2кг
    /(\d+(?:[.,]\d+)?)\s*(г|гр|грама?|gr?)/i,             // 500г, 500гр
    /(\d+)\s*(бр|броя?|br|pcs)/i,                          // 6бр
    /(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(мл|г|ml|gr?)/i      // 6x330мл
  ];

  for (const pattern of sizePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes('x')) {
        // Handle pack format: 6x330мл
        size = parseFloat(match[1]) * parseFloat(match[2].replace(',', '.'));
        unit = match[3].toLowerCase();
      } else {
        size = parseFloat(match[1].replace(',', '.'));
        unit = match[2].toLowerCase();
      }

      // Normalize units
      if (unit.match(/^(литр|litr)/i)) unit = 'л';
      else if (unit.match(/^(грам|gr)/i)) unit = 'г';
      else if (unit.match(/^(килограм|kg)/i)) unit = 'кг';
      else if (unit.match(/^(бро|br|pcs)/i)) unit = 'бр';
      else if (unit === 'ml') unit = 'мл';

      // Remove size from text
      cleaned = text.replace(match[0], '').trim();
      break;
    }
  }

  return { size, unit, cleaned };
}

/**
 * Extracts percentage (fat content, alcohol, etc.)
 */
function extractPercentage(text: string): { percentage?: string; cleaned: string } {
  const percentPattern = /(\d+(?:[.,]\d+)?)\s*%/;
  const match = text.match(percentPattern);

  if (match) {
    return {
      percentage: match[0],
      cleaned: text.replace(match[0], '').trim()
    };
  }

  return { cleaned: text };
}

/**
 * Extracts brand from text
 */
function extractBrand(text: string): { brand?: string; cleaned: string } {
  let cleaned = text;

  for (const brand of ALL_BRANDS) {
    // Case-insensitive search with word boundaries
    const regex = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const match = text.match(regex);

    if (match) {
      cleaned = text.replace(regex, '').trim();
      return { brand, cleaned };
    }
  }

  return { cleaned };
}

/**
 * Identifies base product and type
 */
function identifyBaseProduct(text: string): {
  baseProduct: string;
  type?: string;
  cleaned: string
} {
  const lowerText = text.toLowerCase();

  for (const [category, data] of Object.entries(PRODUCT_TYPES)) {
    // Check keywords
    for (const keyword of data.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        // Found base product
        const baseProduct = keyword.charAt(0).toUpperCase() + keyword.slice(1);

        // Look for product type
        let type: string | undefined;
        for (const t of data.types) {
          if (lowerText.includes(t.toLowerCase())) {
            type = t;
            break;
          }
        }

        // Clean text
        let cleaned = text;
        cleaned = cleaned.replace(new RegExp(keyword, 'gi'), '').trim();
        if (type) {
          cleaned = cleaned.replace(new RegExp(type, 'gi'), '').trim();
        }

        return { baseProduct, type, cleaned };
      }
    }
  }

  // Fallback: use first significant word
  const words = text.split(/\s+/).filter(w => w.length > 2);
  const baseProduct = words[0] || text;

  return {
    baseProduct: baseProduct.charAt(0).toUpperCase() + baseProduct.slice(1).toLowerCase(),
    cleaned: words.slice(1).join(' ')
  };
}

/**
 * Extracts key attributes (bio, eco, light, etc.)
 */
function extractAttributes(text: string): { attributes: string[]; cleaned: string } {
  const attributes: string[] = [];
  let cleaned = text;

  const attrKeywords = [
    'био', 'bio', 'еко', 'eco', 'органично', 'organic',
    'light', 'лайт', 'zero', 'без захар', 'no sugar',
    'нiskомаслено', 'низкомаслено', 'обезмаслено'
  ];

  for (const attr of attrKeywords) {
    const regex = new RegExp(`\\b${attr}\\b`, 'gi');
    if (regex.test(cleaned)) {
      // Normalize attribute
      let normalizedAttr = attr;
      if (attr.match(/bio|еко|eco|органично|organic/i)) {
        normalizedAttr = 'био';
      } else if (attr.match(/light|лайт/i)) {
        normalizedAttr = 'light';
      } else if (attr.match(/zero|без захар|no sugar/i)) {
        normalizedAttr = 'zero';
      }

      if (!attributes.includes(normalizedAttr)) {
        attributes.push(normalizedAttr);
      }
      cleaned = cleaned.replace(regex, '').trim();
    }
  }

  return { attributes, cleaned };
}

/**
 * Main parsing function - extracts all components
 */
function parseProductName(rawName: string): ProductComponents {
  // Initial cleanup
  let text = rawName
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[""„]/g, '"')
    .replace(/\s*[-–—]\s*/g, ' ')
    .replace(/\s*[,;]\s*/g, ' ');

  // Extract components in order
  const sizeResult = extractSizeAndUnit(text);
  text = sizeResult.cleaned;

  const percentResult = extractPercentage(text);
  text = percentResult.cleaned;

  const brandResult = extractBrand(text);
  text = brandResult.cleaned;

  const productResult = identifyBaseProduct(text);
  text = productResult.cleaned;

  const attrResult = extractAttributes(text);

  // Combine attributes
  const keyAttributes: string[] = [];
  if (percentResult.percentage) keyAttributes.push(percentResult.percentage);
  keyAttributes.push(...attrResult.attributes);

  return {
    baseProduct: productResult.baseProduct,
    brand: brandResult.brand,
    type: productResult.type,
    keyAttributes: keyAttributes.length > 0 ? keyAttributes : undefined,
    size: sizeResult.size,
    unit: sizeResult.unit
  };
}

// ============================================================================
// NAME BUILDING
// ============================================================================

/**
 * Builds human-readable normalized name from components
 */
function buildNormalizedName(components: ProductComponents): string {
  const parts: string[] = [];

  // 1. Base product (always first)
  parts.push(components.baseProduct);

  // 2. Brand (if available)
  if (components.brand) {
    parts.push(components.brand);
  }

  // 3. Type/variant (if available)
  if (components.type) {
    parts.push(components.type);
  }

  // 4. Key attributes (percentage, bio, etc.)
  if (components.keyAttributes && components.keyAttributes.length > 0) {
    parts.push(...components.keyAttributes);
  }

  // 5. Size and unit (always last if available)
  if (components.size && components.unit) {
    // Format size nicely
    const formattedSize = components.size % 1 === 0
      ? components.size.toString()
      : components.size.toFixed(1).replace('.', ',');

    parts.push(`${formattedSize}${components.unit}`);
  }

  // Join all parts with spaces
  return parts.join(' ');
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Normalizes a product name into detailed, human-readable format
 *
 * @param rawName - Original product name from receipt
 * @returns Normalized, human-readable product name
 *
 * @example
 * normalizeProductName("VEREIA MLEKO 3.6% 1L")
 * // Returns: "Мляко Верея прясно 3.6% 1л"
 *
 * @example
 * normalizeProductName("хляб добруджа пълнозърнест 500гр")
 * // Returns: "Хляб Добруджа пълнозърнест 500г"
 */
export function normalizeProductName(rawName: string): string {
  try {
    // Parse components
    const components = parseProductName(rawName);

    // Build readable name
    const normalized = buildNormalizedName(components);

    // Final cleanup
    return normalized
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.])/g, '$1'); // Fix spacing before punctuation

  } catch (error) {
    console.error('Product normalization error:', error);
    // Fallback: return cleaned original
    return rawName.trim().replace(/\s+/g, ' ');
  }
}

/**
 * Normalizes a batch of product names
 */
export function normalizeProductNames(names: string[]): string[] {
  return names.map(name => normalizeProductName(name));
}

/**
 * Gets normalized components without building full name
 * (useful for debugging or advanced use cases)
 */
export function getProductComponents(rawName: string): ProductComponents {
  return parseProductName(rawName);
}
