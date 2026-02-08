'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase, Category } from '@/lib/supabase'
import { parseSparkasseCSV, ParsedTransaction } from '@/lib/csv-parser'
import { guessCategory, formatCurrency } from '@/lib/categories'
import { Upload, FileText, Check, AlertCircle, ChevronDown, Loader2 } from 'lucide-react'

export default function CSVImport() {
  const [categories, setCategories] = useState<Category[]>([])
  const [parsed, setParsed] = useState<ParsedTransaction[]>([])
  const [categoryAssignments, setCategoryAssignments] = useState<Map<number, string>>(new Map())
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [importCount, setImportCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data) setCategories(data)
  }

  function handleFile(file: File) {
    setError(null)
    setImported(false)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const transactions = parseSparkasseCSV(text)
        
        if (transactions.length === 0) {
          setError('Keine Transaktionen in der CSV-Datei gefunden. Stimmt das Format?')
          return
        }

        setParsed(transactions)

        // Auto-categorize
        const assignments = new Map<number, string>()
        transactions.forEach((tx, index) => {
          const guessedName = guessCategory(tx.description, tx.recipient, tx.amount)
          if (guessedName) {
            const cat = categories.find(c => c.name === guessedName)
            if (cat) assignments.set(index, cat.id)
          }
        })
        setCategoryAssignments(assignments)
      } catch (err) {
        setError('Fehler beim Parsen der CSV-Datei. Bitte überprüfe das Format.')
        console.error(err)
      }
    }
    reader.readAsText(file, 'ISO-8859-1') // Sparkasse uses ISO encoding
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function updateAssignment(index: number, categoryId: string) {
    const newMap = new Map(categoryAssignments)
    if (categoryId) {
      newMap.set(index, categoryId)
    } else {
      newMap.delete(index)
    }
    setCategoryAssignments(newMap)
  }

  async function importAll() {
    setImporting(true)
    setError(null)

    try {
      const rows = parsed.map((tx, i) => ({
        date: tx.date,
        amount: tx.amount,
        description: tx.description,
        recipient: tx.recipient,
        is_income: tx.is_income,
        category_id: categoryAssignments.get(i) || null,
      }))

      // Insert in batches of 50
      let total = 0
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50)
        const { error } = await supabase.from('transactions').insert(batch)
        if (error) throw error
        total += batch.length
      }

      setImportCount(total)
      setImported(true)
      setParsed([])
    } catch (err: any) {
      setError(`Import fehlgeschlagen: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const categorizedCount = categoryAssignments.size
  const totalCount = parsed.length
  const incomeCount = parsed.filter(t => t.is_income).length
  const expenseCount = parsed.filter(t => !t.is_income).length
  const totalIncome = parsed.filter(t => t.is_income).reduce((s, t) => s + t.amount, 0)
  const totalExpenses = parsed.filter(t => !t.is_income).reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">CSV Import</h2>
      <p className="text-dark-400">
        Lade deinen Sparkasse Kontoauszug hoch (CSV-Datei). Die Transaktionen werden automatisch geparst und kategorisiert.
      </p>

      {/* Upload Area */}
      {parsed.length === 0 && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            glass rounded-2xl p-12 border-2 border-dashed cursor-pointer
            flex flex-col items-center justify-center gap-4
            transition-all duration-300
            ${dragOver 
              ? 'border-emerald-400 bg-emerald-500/5' 
              : 'border-dark-600 hover:border-dark-400 hover:bg-dark-800/50'
            }
          `}
        >
          <div className={`p-4 rounded-2xl ${dragOver ? 'bg-emerald-500/15' : 'bg-dark-700'}`}>
            <Upload size={32} className={dragOver ? 'text-emerald-400' : 'text-dark-400'} />
          </div>
          <div className="text-center">
            <p className="text-lg font-medium text-dark-200">
              CSV-Datei hier ablegen
            </p>
            <p className="text-sm text-dark-400 mt-1">
              oder klicken zum Auswählen • Sparkasse Format (Semikolon-getrennt)
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.CSV"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Success */}
      {imported && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <Check size={20} className="text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-300">
            {importCount} Transaktionen erfolgreich importiert! 🎉
          </p>
        </div>
      )}

      {/* Preview */}
      {parsed.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-dark-100">{totalCount}</p>
              <p className="text-xs text-dark-400 mt-1">Transaktionen</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
              <p className="text-xs text-dark-400 mt-1">{incomeCount} Einnahmen</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
              <p className="text-xs text-dark-400 mt-1">{expenseCount} Ausgaben</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">{Math.round(categorizedCount / totalCount * 100)}%</p>
              <p className="text-xs text-dark-400 mt-1">Kategorisiert</p>
            </div>
          </div>

          {/* Transaction list */}
          <div className="glass rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 bg-dark-800/60 border-b border-dark-700/50 text-xs font-semibold text-dark-400 uppercase tracking-wider">
              <div className="col-span-2">Datum</div>
              <div className="col-span-3">Empfänger</div>
              <div className="col-span-3">Beschreibung</div>
              <div className="col-span-2">Kategorie</div>
              <div className="col-span-2 text-right">Betrag</div>
            </div>

            <div className="divide-y divide-dark-700/30 max-h-[500px] overflow-y-auto">
              {parsed.map((tx, i) => {
                const assignedCatId = categoryAssignments.get(i)
                const assignedCat = categories.find(c => c.id === assignedCatId)
                return (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-4 py-3 hover:bg-dark-700/30 items-center">
                    <div className="sm:col-span-2 text-sm text-dark-300">
                      {new Date(tx.date).toLocaleDateString('de-DE')}
                    </div>
                    <div className="sm:col-span-3 text-sm font-medium text-dark-100 truncate">
                      {tx.recipient || '—'}
                    </div>
                    <div className="sm:col-span-3 text-sm text-dark-400 truncate">
                      {tx.description || '—'}
                    </div>
                    <div className="sm:col-span-2">
                      <select
                        value={assignedCatId || ''}
                        onChange={e => updateAssignment(i, e.target.value)}
                        className="w-full px-2 py-1.5 bg-dark-700 border border-dark-600 rounded-lg text-xs text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">— Keine —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className={`sm:col-span-2 text-sm font-bold text-right ${tx.is_income ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.is_income ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Import Button */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => { setParsed([]); setCategoryAssignments(new Map()) }}
              className="px-4 py-2.5 bg-dark-700 hover:bg-dark-600 rounded-xl text-sm font-medium text-dark-300"
            >
              Abbrechen
            </button>
            <button
              onClick={importAll}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25"
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Importiere...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  {totalCount} Transaktionen importieren
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
