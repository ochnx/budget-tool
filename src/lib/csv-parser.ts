import Papa from 'papaparse'

export type SparkasseRow = {
  'Auftragskonto': string
  'Buchungstag': string
  'Valutadatum': string
  'Buchungstext': string
  'Verwendungszweck': string
  'Glaeubiger ID': string
  'Mandatsreferenz': string
  'Kundenreferenz (End-to-End)': string
  'Sammlerreferenz': string
  'Lastschrift Ursprungsbetrag': string
  'Auslagenersatz Ruecklastschrift': string
  'Beguenstigter/Zahlungspflichtiger': string
  'Kontonummer/IBAN': string
  'BIC (SWIFT-Code)': string
  'Betrag': string
  'Waehrung': string
}

export type ParsedTransaction = {
  date: string // YYYY-MM-DD
  amount: number
  description: string
  recipient: string
  is_income: boolean
}

function parseGermanDate(dateStr: string): string {
  // DD.MM.YYYY → YYYY-MM-DD
  const parts = dateStr.trim().split('.')
  if (parts.length !== 3) return dateStr
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function parseGermanNumber(numStr: string): number {
  // "1.234,56" → 1234.56
  // "-123,45" → -123.45
  if (!numStr) return 0
  const cleaned = numStr.trim().replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

export function parseSparkasseCSV(csvText: string): ParsedTransaction[] {
  const results = Papa.parse(csvText, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
  }) as Papa.ParseResult<SparkasseRow>

  if (results.errors.length > 0) {
    console.warn('CSV Parse Warnings:', results.errors)
  }

  return results.data
    .filter(row => row['Buchungstag'] && row['Betrag'])
    .map(row => {
      const amount = parseGermanNumber(row['Betrag'])
      const verwendungszweck = row['Verwendungszweck'] || ''
      const buchungstext = row['Buchungstext'] || ''
      const recipient = row['Beguenstigter/Zahlungspflichtiger'] || ''
      
      return {
        date: parseGermanDate(row['Buchungstag']),
        amount: Math.abs(amount),
        description: verwendungszweck || buchungstext,
        recipient: recipient,
        is_income: amount > 0,
      }
    })
}
