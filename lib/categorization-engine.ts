import OpenAI from 'openai';
import { createServerClient } from './supabase-simple';
import { getCategoryFromCache, normalizeProductName as normalizeBulgarianProduct } from './bulgarian-product-cache';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Category definitions with emojis and colors
export const CATEGORIES = {
  BASIC_FOODS: {
    id: 'basic_foods',
    name: 'Основни храни',
    icon: '🍎',
    color: 'green',
  },
  READY_MEALS: {
    id: 'ready_meals',
    name: 'Готови храни',
    icon: '🍕',
    color: 'orange',
  },
  SNACKS: {
    id: 'snacks',
    name: 'Снакове',
    icon: '🍿',
    color: 'yellow',
  },
  DRINKS: {
    id: 'drinks',
    name: 'Напитки',
    icon: '🥤',
    color: 'blue',
  },
  HOUSEHOLD: {
    id: 'household',
    name: 'Домакински',
    icon: '🧹',
    color: 'purple',
  },
  PERSONAL_CARE: {
    id: 'personal_care',
    name: 'Лична хигиена',
    icon: '🧴',
    color: 'pink',
  },
  OTHER: {
    id: 'other',
    name: 'Други',
    icon: '📦',
    color: 'gray',
  },
} as const;

// Rule-based keyword matching for Bulgarian products
const KEYWORD_RULES = {
  basic_foods: [
    // Месо (Meat)
    'месо', 'пилешко', 'пиле', 'свинско', 'свински', 'говеждо', 'говежд', 'кебап', 'кебапче',
    'шунка', 'салам', 'луканка', 'суджук', 'наденица', 'бекон', 'патешко', 'агнешко',
    'пържола', 'котлет', 'карначе', 'кюфте', 'телешко', 'дроб', 'черен дроб', 'език',
    'сърца', 'гърди', 'бут', 'филе', 'кайма', 'чевермета',

    // Риба (Fish)
    'риба', 'сьомга', 'скумрия', 'тон', 'паламуд', 'цаца', 'пъстърва',
    'морски', 'морска', 'калмар', 'октопод', 'скарида', 'миди', 'раци',
    'хек', 'сафрид', 'сардина', 'аншоа',

    // Млечни (Dairy)
    'мляко', 'млеко', 'сирене', 'кашкавал', 'йогурт', 'кисело', 'масло', 'извара', 'крема',
    'сметана', 'айран', 'кефир', 'катък', 'моцарела', 'пармезан', 'фета', 'рикота',
    'зрънест', 'топено', 'прясно', 'био мляко', 'краве', 'овче', 'кози',

    // Хляб (Bread & Bakery)
    'хляб', 'питка', 'кифла', 'франзела', 'багета', 'симит', 'геврек', 'козунак',
    'тост', 'гевреци', 'пита', 'фокача', 'чиабата', 'погача',

    // Яйца (Eggs)
    'яйца', 'яйце',

    // Зеленчуци (Vegetables)
    'домат', 'доматен', 'краставица', 'краставиц', 'моркови', 'морков', 'лук', 'картоф',
    'чушка', 'чушки', 'пипер', 'броколи', 'карфиол', 'зеле', 'спанак', 'маруля',
    'салата', 'магданоз', 'копър', 'целина', 'патладжан', 'тиква', 'тиквичка',
    'зелка', 'чесън', 'праз', 'грах', 'репа', 'цвекло', 'аспержи',
    'зелен фасул', 'тиквички', 'киселец', 'дафинов лист',

    // Плодове (Fruits)
    'ябълка', 'ябълк', 'банан', 'портокал', 'грозде', 'круша', 'праскова', 'кайсия',
    'череша', 'вишна', 'ягода', 'малина', 'боровинка', 'диня', 'пъпеш', 'киви',
    'мандарина', 'лимон', 'грейпфрут', 'нектарина', 'сливи', 'смокини',
    'авокадо', 'манго', 'папая', 'ананас', 'маракуя',

    // Основни продукти (Staples)
    'олио', 'захар', 'брашно', 'ориз', 'макарони', 'паста', 'спагети', 'сол', 'пипер',
    'оцет', 'зехтин', 'боб', 'леща', 'нахут', 'фасул', 'грис', 'булгур',
    'фиде', 'царевично брашно', 'сода', 'бакпулвер', 'мая', 'ванилия',
    'канела', 'карамфил', 'черен пипер', 'кимион', 'босилек', 'риган',
    'чубрица', 'джоджен', 'дафинов', 'мащерка',

    // Ядки и семена (Nuts and seeds)
    'ядка', 'ядки', 'бадем', 'орех', 'фъстък', 'лешник', 'кашу', 'слънчоглед',
    'тиквени семки', 'сусам', 'чия', 'лен',

    // Подправки и сосове
    'кетчуп', 'майонеза', 'горчица', 'лютеница', 'айвар', 'пинджур',
    'туршия', 'зеленчукова', 'сол', 'бульон', 'супа', 'сос',
    'доматен', 'доматена паста', 'домати консерва',
  ],

  ready_meals: [
    'пица', 'пици', 'сандвич', 'хамбургер', 'бургер', 'кроасан', 'понички', 'донът',
    'тортила', 'фахита', 'буррито', 'супа', 'готово', 'готова', 'готови', 'предварително',
    'препечен', 'печено', 'пържено', 'мусака', 'баница', 'зелник', 'тиквеник',
    'гьозлеме', 'пататник', 'палачинка', 'крепи',
  ],

  snacks: [
    'чипс', 'чипове', 'бисквита', 'бисквити', 'вафла', 'шоколад', 'бонбон', 'желе',
    'курабия', 'кекс', 'мъфин', 'сладко', 'сладки', 'понички', 'поп корн', 'попкорн',
    'крекер', 'стафиди', 'сушен', 'сушени', 'снакс', 'гризини', 'соленки', 'стръкчета',
    'царевица', 'стик', 'пуканки', 'локум', 'халва', 'тахан', 'мед', 'близалка',
    'желирани', 'захарно изделие', 'торта', 'сладкиш', 'баклава', 'еклер',
    'медена пита', 'солети', 'крекер',
  ],

  drinks: [
    'вода', 'сок', 'кока', 'кола', 'фанта', 'спрайт', 'пепси', 'напитка', 'чай',
    'кафе', 'бира', 'вино', 'ракия', 'уиски', 'водка', 'джин', 'коняк', 'бренди',
    'енергийна', 'енергиен', 'лимонада', 'айс ти', 'нестий', 'боза', 'компот',
    'нектар', 'витаминка', 'алкохол', 'алкохолна', 'безалкохолна', 'газирана',
    'негазирана', 'минерална', 'банкя', 'девин', 'горна баня',
    'вермут', 'шампанско', 'мастика', 'нес кафе', 'какао',
  ],

  household: [
    'препарат', 'миещ', 'почистващ', 'тоалетна', 'хартия', 'салфетки', 'торбички',
    'торби', 'фолио', 'прах', 'течност', 'саше', 'сапун', 'препарат', 'почистване',
    'домакински', 'кухненски', 'кърпа', 'кърпи', 'гъба', 'четка', 'ароматизатор',
    'освежител', 'препарат за', 'препарат за съдове', 'за прането', 'за пране',
    'омекотител', 'белина', 'дезинфектант', 'инсектицид', 'свещ', 'клечка',
    'торбички за смет', 'перилен', 'гел', 'препарат за миене', 'за съдомиялна',
    'таблетки за', 'капсули за', 'кибрит', 'запалка',
  ],

  personal_care: [
    'шампоан', 'балсам', 'душ', 'гел', 'сапун', 'паста', 'четка за зъби', 'крем',
    'лосион', 'дезодорант', 'парфюм', 'памперс', 'пелени', 'превръзки', 'тампони',
    'бръснене', 'козметика', 'грим', 'маска', 'пилинг', 'скраб', 'серум', 'олио за',
    'хигиена', 'хигиенни', 'интимна', 'измиващ', 'почистващ', 'мокри', 'влажни',
    'антиперспирант', 'слънцезащитен', 'след слънце', 'маска за коса',
    'боя за коса', 'лак за коса', 'стайлинг', 'мус', 'спрей за коса',
    'дезодорант', 'парфюм', 'тоалетна вода', 'одеколон',
  ],
};

// Store-specific patterns for better matching
const STORE_PATTERNS = {
  LIDL: {
    // LIDL-specific product patterns
    prefixes: ['FRESH', 'BIO', 'ORGANIC', 'PREMIUM'],
    brands: ['MILBONA', 'FREEWAY', 'COMBINO', 'PIRATO', 'SOLEVITA', 'ALESTO'],
    patterns: [
      { regex: /MILBONA/i, category: 'basic_foods', subcategory: 'dairy' },
      { regex: /PIRATO/i, category: 'snacks' },
      { regex: /SOLEVITA/i, category: 'drinks' },
      { regex: /CIEN/i, category: 'personal_care' },
      { regex: /W5/i, category: 'household' },
    ],
  },
  KAUFLAND: {
    brands: ['K-CLASSIC', 'K-BIO', 'K-TAKE IT VEGGIE', 'K-FREE'],
    patterns: [
      { regex: /K-CLASSIC/i, category: 'basic_foods' },
      { regex: /K-BIO/i, category: 'basic_foods' },
      { regex: /K-TAKE IT/i, category: 'ready_meals' },
    ],
  },
  BILLA: {
    brands: ['CLEVER', 'BILLA BIO', 'SPAR'],
    patterns: [
      { regex: /CLEVER/i, category: 'basic_foods' },
      { regex: /BILLA BIO/i, category: 'basic_foods' },
    ],
  },
  FANTASTICO: {
    brands: ['FANTASTICO', 'ФАНТАСТИКО'],
  },
  METRO: {
    brands: ['METRO CHEF', 'ARO', 'FINE FOOD'],
  },
};

export interface CategorizationResult {
  category_id: string;
  category_name: string;
  confidence: number;
  method: 'rule' | 'store_pattern' | 'ai' | 'user_correction' | 'cache';
  subcategory?: string;
}

// In-memory cache for AI categorizations
const categorizationCache = new Map<string, CategorizationResult>();

/**
 * Normalize product name for better matching
 */
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9а-я\s]/g, ' ') // Keep only letters, numbers, spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Rule-based categorization using keyword matching
 */
function categorizeByRules(productName: string): CategorizationResult | null {
  const normalized = normalizeProductName(productName);

  for (const [categoryId, keywords] of Object.entries(KEYWORD_RULES)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        const category = Object.values(CATEGORIES).find(c => c.id === categoryId);
        if (category) {
          return {
            category_id: categoryId,
            category_name: category.name,
            confidence: 0.95,
            method: 'rule',
          };
        }
      }
    }
  }

  return null;
}

/**
 * Store-specific pattern matching
 */
function categorizeByStorePattern(
  productName: string,
  storeName?: string
): CategorizationResult | null {
  if (!storeName) return null;

  const storeKey = Object.keys(STORE_PATTERNS).find(key =>
    storeName.toUpperCase().includes(key)
  ) as keyof typeof STORE_PATTERNS | undefined;

  if (!storeKey) return null;

  const storeConfig = STORE_PATTERNS[storeKey];

  // Check brand-specific patterns
  if (!storeConfig.patterns) return null;

  for (const pattern of storeConfig.patterns) {
    if (pattern.regex.test(productName)) {
      const category = Object.values(CATEGORIES).find(c => c.id === pattern.category);
      if (category) {
        return {
          category_id: pattern.category,
          category_name: category.name,
          confidence: 0.85,
          method: 'store_pattern',
          subcategory: pattern.subcategory,
        };
      }
    }
  }

  return null;
}

/**
 * AI-based categorization using OpenAI
 */
async function categorizeByAI(productName: string): Promise<CategorizationResult | null> {
  try {
    // Check cache first
    const cacheKey = normalizeProductName(productName);
    if (categorizationCache.has(cacheKey)) {
      const cached = categorizationCache.get(cacheKey)!;
      return { ...cached, method: 'cache' };
    }

    const categoryList = Object.values(CATEGORIES)
      .filter(c => c.id !== 'other')
      .map(c => `${c.id}: ${c.name}`)
      .join(', ');

    const prompt = `Категоризирай този български продукт от магазин: "${productName}"

Налични категории: ${categoryList}

Върни отговор в JSON формат:
{
  "category_id": "id на категорията",
  "confidence": число между 0 и 1
}

Избери най-подходящата категория. Ако не си сигурен, върни "other" с ниска confidence.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ти си експерт по категоризиране на български хранителни и домакински продукти. Отговаряй само с валиден JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // Clean markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/```\s*/g, '');
    }

    // Parse AI response
    const parsed = JSON.parse(cleanedContent);
    const category = Object.values(CATEGORIES).find(c => c.id === parsed.category_id);

    if (!category) return null;

    const result: CategorizationResult = {
      category_id: parsed.category_id,
      category_name: category.name,
      confidence: parsed.confidence || 0.7,
      method: 'ai',
    };

    // Cache the result
    categorizationCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('AI categorization error:', error);
    return null;
  }
}

/**
 * Check for user corrections in database
 */
async function getUserCorrection(
  productName: string,
  userId: string
): Promise<CategorizationResult | null> {
  try {
    const supabase = createServerClient(true);
    const normalized = normalizeProductName(productName);

    // Check if user has corrected this product before
    const { data, error } = await supabase
      .from('categorization_corrections')
      .select('category_id')
      .eq('user_id', userId)
      .eq('product_name_normalized', normalized)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;

    const categoryId = data[0].category_id;
    const category = Object.values(CATEGORIES).find(c => c.id === categoryId);

    if (!category) return null;

    return {
      category_id: categoryId,
      category_name: category.name,
      confidence: 1.0,
      method: 'user_correction',
    };
  } catch (error) {
    console.error('Error fetching user correction:', error);
    return null;
  }
}

/**
 * Main categorization function - tries all methods in order
 */
export async function categorizeProduct(
  productName: string,
  storeName?: string,
  userId?: string
): Promise<CategorizationResult> {
  console.log(`[Categorization] Processing: "${productName}"`, { storeName, userId });

  // 0. Check Bulgarian product cache FIRST (INSTANT - saves 2-3 seconds!)
  const cachedCategory = getCategoryFromCache(productName);
  if (cachedCategory) {
    console.log(`[Categorization] ⚡ INSTANT Cache hit: "${productName}" → ${cachedCategory}`);
    return {
      category_id: cachedCategory.toLowerCase().replace(/\s+/g, '_'),
      category_name: cachedCategory,
      confidence: 1.0, // Cache is 100% confident
      method: 'cache',
    };
  }

  // 1. Check user corrections (highest priority for learning)
  if (userId) {
    const userCorrection = await getUserCorrection(productName, userId);
    if (userCorrection) {
      console.log(`[Categorization] User correction found:`, userCorrection);
      return userCorrection;
    }
  }

  // 2. Try rule-based matching
  const ruleResult = categorizeByRules(productName);
  if (ruleResult) {
    console.log(`[Categorization] Rule match found:`, ruleResult);
    return ruleResult;
  }

  // 3. Try store-specific patterns
  const storeResult = categorizeByStorePattern(productName, storeName);
  if (storeResult) {
    console.log(`[Categorization] Store pattern match found:`, storeResult);
    return storeResult;
  }

  // 4. Try AI categorization (slowest, last resort)
  const aiResult = await categorizeByAI(productName);
  if (aiResult && aiResult.confidence >= 0.6) {
    console.log(`[Categorization] AI match found:`, aiResult);
    return aiResult;
  }

  // 5. Default to "Other" category
  console.log(`[Categorization] No match found, defaulting to "other"`);
  return {
    category_id: 'other',
    category_name: CATEGORIES.OTHER.name,
    confidence: 0,
    method: 'rule',
  };
}

/**
 * Save user correction to database for learning
 */
export async function saveUserCorrection(
  productName: string,
  categoryId: string,
  userId: string
): Promise<void> {
  try {
    const supabase = createServerClient(true);
    const normalized = normalizeProductName(productName);

    await supabase.from('categorization_corrections').insert({
      user_id: userId,
      product_name: productName,
      product_name_normalized: normalized,
      category_id: categoryId,
      created_at: new Date().toISOString(),
    });

    console.log(`[Categorization] User correction saved:`, { productName, categoryId });
  } catch (error) {
    console.error('Error saving user correction:', error);
  }
}

/**
 * Batch categorize multiple products
 */
export async function categorizeProducts(
  products: Array<{ name: string; id?: string }>,
  storeName?: string,
  userId?: string
): Promise<Array<CategorizationResult & { productId?: string }>> {
  const results = await Promise.all(
    products.map(async (product) => {
      const result = await categorizeProduct(product.name, storeName, userId);
      return {
        ...result,
        productId: product.id,
      };
    })
  );

  return results;
}

/**
 * Get categorization statistics
 */
export function getCategorizationStats() {
  return {
    cacheSize: categorizationCache.size,
    categories: Object.values(CATEGORIES),
  };
}
