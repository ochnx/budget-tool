// Auto-Kategorisierung basierend auf Schlüsselwörtern
type CategoryRule = {
  keywords: string[]
  categoryName: string
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    categoryName: 'Miete',
    keywords: ['miete', 'mietvertrag', 'kaltmiete', 'warmmiete', 'nebenkosten', 'hausverwaltung', 'wohnungsbau']
  },
  {
    categoryName: 'Lebensmittel',
    keywords: ['rewe', 'edeka', 'aldi', 'lidl', 'netto', 'penny', 'kaufland', 'dm-drogerie', 'dm ', 'rossmann', 'supermarkt', 'lebensmittel', 'norma', 'real']
  },
  {
    categoryName: 'Klamotten',
    keywords: ['zara', 'h&m', 'zalando', 'about you', 'aboutyou', 'asos', 'nike', 'adidas', 'cos ', 'uniqlo', 'pull&bear', 'bershka', 'massimo dutti', 'mango', 'snipes', 'foot locker', 'footlocker', 'mr porter', 'end clothing', 'ssense', 'farfetch', 'kickz', 'hhv']
  },
  {
    categoryName: 'Transport',
    keywords: ['db ', 'deutsche bahn', 'bahn', 'deutschlandticket', 'mvv', 'uber', 'bolt', 'freenow', 'free now', 'tier', 'lime', 'voi', 'tankstelle', 'aral', 'shell', 'esso', 'jet tanken', 'adac', 'flixbus', 'taxi']
  },
  {
    categoryName: 'Restaurants',
    keywords: ['restaurant', 'lieferando', 'uber eats', 'ubereats', 'wolt', 'doordash', 'mcdonalds', 'mcdonald', 'burger king', 'subway', 'starbucks', 'cafe', 'kaffee', 'pizz', 'sushi', 'kebab', 'döner', 'gastronomie', 'bistro']
  },
  {
    categoryName: 'Abos & Subscriptions',
    keywords: ['spotify', 'netflix', 'disney+', 'amazon prime', 'apple', 'icloud', 'google storage', 'youtube premium', 'crunchyroll', 'chatgpt', 'openai', 'notion', 'figma', 'adobe', 'microsoft', 'github', 'vercel', 'hetzner', 'digitalocean', 'cloudflare', 'fitnessstudio', 'mcfit', 'gym', 'john reed']
  },
  {
    categoryName: 'Gesundheit',
    keywords: ['apotheke', 'arzt', 'praxis', 'krankenhaus', 'klinik', 'physiotherapie', 'zahnarzt', 'krankenkasse', 'tk ', 'aok', 'barmer', 'dak']
  },
  {
    categoryName: 'Entertainment',
    keywords: ['kino', 'cinema', 'steam', 'playstation', 'xbox', 'nintendo', 'gaming', 'konzert', 'ticket', 'eventim', 'club', 'disco', 'party', 'festival']
  },
  {
    categoryName: 'Geschenke',
    keywords: ['geschenk', 'blume', 'fleurop', 'amazon.de marketplace']
  },
  {
    categoryName: 'Gehalt',
    keywords: ['gehalt', 'lohn', 'vergütung', 'arbeitgeber']
  },
  {
    categoryName: 'Freelance',
    keywords: ['honorar', 'rechnung', 'freelance', 'projekt', 'beratung']
  }
]

export function guessCategory(description: string, recipient: string, amount: number): string | null {
  const searchText = `${description} ${recipient}`.toLowerCase()
  
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return rule.categoryName
      }
    }
  }
  
  return null
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

export function getMonthName(month: number): string {
  const months = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ]
  return months[month]
}
