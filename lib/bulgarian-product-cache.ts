/**
 * Bulgarian Product Category Cache
 * Instant categorization for common Bulgarian products
 * Saves 2-3 seconds by avoiding AI calls for known products
 */

export interface ProductCategoryMapping {
  [productName: string]: string;
}

/**
 * Comprehensive Bulgarian product → category mapping
 * Based on real Bulgarian grocery items
 */
export const BULGARIAN_PRODUCT_CACHE: ProductCategoryMapping = {
  // ОСНОВНИ ХРАНИ - Bread & Bakery
  'хляб': 'Основни храни',
  'хляб бял': 'Основни храни',
  'хляб черен': 'Основни храни',
  'хляб пълнозърнест': 'Основни храни',
  'питка': 'Основни храни',
  'кифли': 'Основни храни',
  'багети': 'Основни храни',

  // ОСНОВНИ ХРАНИ - Dairy
  'мляко': 'Основни храни',
  'прясно мляко': 'Основни храни',
  'кисело мляко': 'Основни храни',
  'кашкавал': 'Основни храни',
  'сирене': 'Основни храни',
  'сирене краве': 'Основни храни',
  'сирене овче': 'Основни храни',
  'извара': 'Основни храни',
  'масло': 'Основни храни',
  'краве масло': 'Основни храни',
  'маргарин': 'Основни храни',
  'айрян': 'Основни храни',
  'йогурт': 'Основни храни',

  // ОСНОВНИ ХРАНИ - Eggs & Meat
  'яйца': 'Основни храни',
  'пилешко': 'Основни храни',
  'пилешко филе': 'Основни храни',
  'пилешки бутчета': 'Основни храни',
  'свинско': 'Основни храни',
  'телешко': 'Основни храни',
  'кайма': 'Основни храни',
  'колбас': 'Основни храни',
  'луканка': 'Основни храни',
  'шунка': 'Основни храни',
  'салам': 'Основни храни',

  // ОСНОВНИ ХРАНИ - Grains & Pasta
  'ориз': 'Основни храни',
  'макарони': 'Основни храни',
  'спагети': 'Основни храни',
  'брашно': 'Основни храни',
  'брашно бяло': 'Основни храни',
  'брашно пълнозърнесто': 'Основни храни',
  'царевично брашно': 'Основни храни',
  'картофи': 'Основни храни',

  // ОСНОВНИ ХРАНИ - Fruits
  'ябълки': 'Основни храни',
  'банани': 'Основни храни',
  'портокали': 'Основни храни',
  'мандарини': 'Основни храни',
  'лимони': 'Основни храни',
  'круши': 'Основни храни',
  'грозде': 'Основни храни',
  'праскови': 'Основни храни',
  'сливи': 'Основни храни',
  'кайсии': 'Основни храни',

  // ОСНОВНИ ХРАНИ - Vegetables
  'домати': 'Основни храни',
  'краставици': 'Основни храни',
  'чушки': 'Основни храни',
  'моркови': 'Основни храни',
  'зеле': 'Основни храни',
  'лук': 'Основни храни',
  'чесън': 'Основни храни',
  'патладжани': 'Основни храни',
  'тиквички': 'Основни храни',
  'спанак': 'Основни храни',
  'магданоз': 'Основни храни',
  'копър': 'Основни храни',

  // ОСНОВНИ ХРАНИ - Oils & Condiments
  'олио': 'Основни храни',
  'слънчогледово олио': 'Основни храни',
  'зехтин': 'Основни храни',
  'оцет': 'Основни храни',
  'сол': 'Основни храни',
  'захар': 'Основни храни',
  'мед': 'Основни храни',
  'кетчуп': 'Основни храни',
  'майонеза': 'Основни храни',
  'горчица': 'Основни храни',

  // ГОТОВИ ХРАНИ - Prepared foods
  'пица': 'Готови храни',
  'сандвич': 'Готови храни',
  'банковица': 'Готови храни',
  'консерва': 'Готови храни',
  'риба консерва': 'Готови храни',
  'тунак': 'Готови храни',
  'супа': 'Готови храни',
  'готово ястие': 'Готови храни',
  'фалафел': 'Готови храни',
  'бургер': 'Готови храни',
  'хот дог': 'Готови храни',

  // НАПИТКИ - Beverages
  'вода': 'Напитки',
  'минерална вода': 'Напитки',
  'газирана вода': 'Напитки',
  'кока-кола': 'Напитки',
  'кока кола': 'Напитки',
  'пепси': 'Напитки',
  'фанта': 'Напитки',
  'спрайт': 'Напитки',
  'сок': 'Напитки',
  'портокалов сок': 'Напитки',
  'ябълков сок': 'Напитки',
  'кафе': 'Напитки',
  'нес кафе': 'Напитки',
  'чай': 'Напитки',
  'бира': 'Напитки',
  'вино': 'Напитки',
  'ракия': 'Напитки',
  'уиски': 'Напитки',
  'водка': 'Напитки',

  // ЗАКУСКИ - Snacks
  'шоколад': 'Закуски',
  'бонбони': 'Закуски',
  'чипс': 'Закуски',
  'бисквити': 'Закуски',
  'курабии': 'Закуски',
  'сладолед': 'Закуски',
  'сладолед мини': 'Закуски',
  'сладолед класик': 'Закуски',
  'вафли': 'Закуски',
  'понички': 'Закуски',
  'кексче': 'Закуски',
  'кроасан': 'Закуски',
  'гризини': 'Закуски',
  'фъстъци': 'Закуски',
  'семки': 'Закуски',
  'ядки': 'Закуски',
  'царевица': 'Закуски',

  // НЕХРАНИТЕЛНИ - Non-food items
  'тоалетна хартия': 'Нехранителни',
  'кухненска хартия': 'Нехранителни',
  'салфетки': 'Нехранителни',
  'препарат': 'Нехранителни',
  'течност за чистене': 'Нехранителни',
  'сапун': 'Нехранителни',
  'шампоан': 'Нехранителни',
  'балсам': 'Нехранителни',
  'паста за зъби': 'Нехранителни',
  'четка за зъби': 'Нехранителни',
  'дезодорант': 'Нехранителни',
  'пликове': 'Нехранителни',
  'торбички': 'Нехранителни',
  'кибрит': 'Нехранителни',
  'свещи': 'Нехранителни',
};

/**
 * Normalize product name for cache lookup
 * Removes extra spaces, converts to lowercase, removes special chars
 */
export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/[^\wа-я\s]/gi, '') // Remove special characters, keep Cyrillic
    .replace(/кг$/i, '') // Remove unit indicators
    .replace(/л$/i, '')
    .replace(/бр$/i, '')
    .trim();
}

/**
 * Get category from cache (instant lookup)
 * Returns category name or null if not found
 */
export function getCategoryFromCache(productName: string): string | null {
  const normalized = normalizeProductName(productName);

  // Direct match
  if (BULGARIAN_PRODUCT_CACHE[normalized]) {
    console.log(`⚡ Cache HIT: "${productName}" → ${BULGARIAN_PRODUCT_CACHE[normalized]}`);
    return BULGARIAN_PRODUCT_CACHE[normalized];
  }

  // Partial match - check if cache key is contained in product name
  for (const [cacheKey, category] of Object.entries(BULGARIAN_PRODUCT_CACHE)) {
    if (normalized.includes(cacheKey) || cacheKey.includes(normalized)) {
      console.log(`⚡ Cache PARTIAL HIT: "${productName}" → ${category} (matched: "${cacheKey}")`);
      return category;
    }
  }

  console.log(`❌ Cache MISS: "${productName}" - will use AI categorization`);
  return null;
}

/**
 * Get statistics about cache performance
 */
export function getCacheStats(): {
  totalEntries: number;
  categoriesCount: number;
  categories: { [category: string]: number };
} {
  const categories: { [category: string]: number } = {};

  for (const category of Object.values(BULGARIAN_PRODUCT_CACHE)) {
    categories[category] = (categories[category] || 0) + 1;
  }

  return {
    totalEntries: Object.keys(BULGARIAN_PRODUCT_CACHE).length,
    categoriesCount: Object.keys(categories).length,
    categories,
  };
}
