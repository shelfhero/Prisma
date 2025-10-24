export const ESSENTIAL_PRODUCTS_TOP_10 = [
  {
    name: 'Мляко прясно 3.6% 1л',
    category: 'Основни храни',
    icon: '🥛',
    avgSpend: 25,
    avgSavings: 6.5,
    priority: 1,
    keywords: ['мляко', 'прясно', '3.6%', '1л', '1 литър', 'млеко']
  },
  {
    name: 'Хляб бял/пълнозърнест 500г',
    category: 'Основни храни',
    icon: '🍞',
    avgSpend: 30,
    avgSavings: 10,
    priority: 1,
    keywords: ['хляб', 'бял', 'пълнозърнест', '500г', 'hlqb']
  },
  {
    name: 'Яйца M/L 10бр',
    category: 'Основни храни',
    icon: '🥚',
    avgSpend: 15,
    avgSavings: 4,
    priority: 1,
    keywords: ['яйца', '10бр', '10 броя', 'eggs', 'qica']
  },
  {
    name: 'Сирене краве 400г',
    category: 'Основни храни',
    icon: '🧀',
    avgSpend: 40,
    avgSavings: 12.5,
    priority: 1,
    keywords: ['сирене', 'краве', '400г', 'sirene']
  },
  {
    name: 'Вода минерална 1.5л',
    category: 'Напитки',
    icon: '💧',
    avgSpend: 25,
    avgSavings: 12.5,
    priority: 1,
    keywords: ['вода', 'минерална', '1.5л', '1,5л', 'water']
  },
  {
    name: 'Кисело мляко 400г',
    category: 'Основни храни',
    icon: '🥛',
    avgSpend: 20,
    avgSavings: 6.5,
    priority: 2,
    keywords: ['кисело мляко', 'йогурт', '400г', 'kiselo']
  },
  {
    name: 'Олио слънчоглед 1л',
    category: 'Основни храни',
    icon: '🌻',
    avgSpend: 15,
    avgSavings: 6.5,
    priority: 2,
    keywords: ['олио', 'слънчоглед', '1л', 'oil', 'olio']
  },
  {
    name: 'Пилешко филе 1кг',
    category: 'Основни храни',
    icon: '🍗',
    avgSpend: 60,
    avgSavings: 20,
    priority: 2,
    keywords: ['пилешко', 'филе', 'гърди', '1кг', 'chicken', 'pileshko']
  },
  {
    name: 'Захар бял 1кг',
    category: 'Основни храни',
    icon: '🧂',
    avgSpend: 6,
    avgSavings: 3,
    priority: 2,
    keywords: ['захар', 'бял', '1кг', 'sugar', 'zahar']
  },
  {
    name: 'Тоалетна хартия 8-10 ролки',
    category: 'Нехранителни',
    icon: '🧻',
    avgSpend: 15,
    avgSavings: 6.5,
    priority: 2,
    keywords: ['тоалетна хартия', '8бр', '10бр', 'toilet paper']
  }
];

export const TOTAL_MONTHLY_SAVINGS = ESSENTIAL_PRODUCTS_TOP_10.reduce((sum, p) => sum + p.avgSavings, 0);
