'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Transaction, Category } from '@/lib/supabase'
import { formatCurrency } from '@/lib/categories'
import { Repeat, Scissors, AlertTriangle, CheckCircle2, TrendingDown, Wallet, PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Keywords that indicate recurring/fixed costs
const RECURRING_KEYWORDS = [
  // Housing
  'miete', 'mietvertrag', 'kaltmiete', 'warmmiete', 'nebenkosten', 'hausverwaltung', 'wohnungsbau',
  // Insurance
  'versicherung', 'haftpflicht', 'krankenversicherung', 'allianz', 'huk', 'ergo',
  // Subscriptions
  'spotify', 'netflix', 'disney', 'amazon prime', 'apple', 'icloud', 'google storage',
  'youtube premium', 'crunchyroll', 'chatgpt', 'openai', 'notion', 'figma', 'adobe',
  'microsoft', 'github', 'vercel', 'hetzner', 'digitalocean', 'cloudflare',
  // Gym/Fitness
  'fitnessstudio', 'mcfit', 'gym', 'john reed', 'fitness', 'urban sports',
  // Transport subscriptions
  'deutschlandticket', 'mvv', 'bahncard',
  // Phone/Internet
  'telekom', 'vodafone', 'o2', '1&1', 'congstar', 'mobilfunk', 'internet', 'dsl',
  // Utilities
  'strom', 'gas', 'stadtwerke', 'energie', 'swm',
  // Regular payments
  'dauerauftrag', 'lastschrift', 'monatlich',
]

// Keywords that indicate cancellable/optional subscriptions
const CANCELLABLE_KEYWORDS = [
  'spotify', 'netflix', 'disney', 'amazon prime', 'youtube premium', 'crunchyroll',
  'chatgpt', 'openai', 'notion', 'figma', 'adobe', 'github', 'vercel',
  'hetzner', 'digitalocean', 'cloudflare', 'mcfit', 'gym', 'john reed',
  'urban sports', 'fitness',
]

type FixedCostItem = {
  name: string
  amount: number
  category: string
  categoryIcon: string
  categoryColor: string
  isCancellable: boolean
  transactions: Transaction[]
}

export default function FixedCosts() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    // Load last 3 months to identify recurring costs
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('is_income', false)
      .gte('date', threeMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    if (data) setTransactions(data)
    setLoading(false)
  }

  const analysis = useMemo(() => {
    // Group transactions by normalized recipient/description
    const recipientMap = new Map<string, Transaction[]>()
    
    transactions.forEach(tx => {
      const key = (tx.recipient || tx.description || 'Unbekannt').toLowerCase().trim()
      const existing = recipientMap.get(key) || []
      existing.push(tx)
      recipientMap.set(key, existing)
    })

    // Identify recurring costs
    const fixedCosts: FixedCostItem[] = []
    const variableTxs: Transaction[] = []

    recipientMap.forEach((txs, key) => {
      const isRecurring = RECURRING_KEYWORDS.some(kw => key.includes(kw)) || txs.length >= 2
      const searchText = key.toLowerCase()
      
      if (isRecurring && txs.length >= 1) {
        // Check if it looks recurring: similar amounts or matching keywords
        const hasKeyword = RECURRING_KEYWORDS.some(kw => searchText.includes(kw))
        const amounts = txs.map(t => Number(t.amount))
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
        const hasSimilarAmounts = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.15)
        
        if (hasKeyword || (txs.length >= 2 && hasSimilarAmounts)) {
          const cat = txs[0].category as Category | undefined
          const isCancellable = CANCELLABLE_KEYWORDS.some(kw => searchText.includes(kw))
          
          // Use the most recent amount as the "monthly" amount
          const sortedByDate = [...txs].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          const latestAmount = Number(sortedByDate[0].amount)
          
          // Try to get a nice display name
          const displayName = txs[0].recipient || txs[0].description || key

          fixedCosts.push({
            name: displayName,
            amount: latestAmount,
            category: cat?.name || 'Unkategorisiert',
            categoryIcon: cat?.icon || '❓',
            categoryColor: cat?.color || '#6B7280',
            isCancellable,
            transactions: sortedByDate,
          })
        } else {
          variableTxs.push(...txs)
        }
      } else {
        variableTxs.push(...txs)
      }
    })

    // Sort fixed costs descending by amount
    fixedCosts.sort((a, b) => b.amount - a.amount)

    const totalFixed = fixedCosts.reduce((sum, fc) => sum + fc.amount, 0)
    const totalCancellable = fixedCosts.filter(fc => fc.isCancellable).reduce((sum, fc) => sum + fc.amount, 0)
    const totalVariable = variableTxs.reduce((sum, tx) => sum + Number(tx.amount), 0) / 3 // avg monthly

    // Group by category for pie chart
    const catMap = new Map<string, { name: string; icon: string; color: string; total: number }>()
    fixedCosts.forEach(fc => {
      const key = fc.category
      const existing = catMap.get(key)
      if (existing) {
        existing.total += fc.amount
      } else {
        catMap.set(key, {
          name: fc.category,
          icon: fc.categoryIcon,
          color: fc.categoryColor,
          total: fc.amount,
        })
      }
    })
    const categoryBreakdown = Array.from(catMap.values()).sort((a, b) => b.total - a.total)

    return {
      fixedCosts,
      totalFixed,
      totalCancellable,
      totalVariable,
      fixedCount: fixedCosts.length,
      cancellableCount: fixedCosts.filter(fc => fc.isCancellable).length,
      categoryBreakdown,
    }
  }, [transactions])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-3 shadow-xl border border-dark-600">
          <p className="text-sm font-medium text-dark-100">
            {payload[0].payload.icon} {payload[0].payload.name}
          </p>
          <p className="text-sm text-emerald-400 font-bold">
            {formatCurrency(payload[0].value)}/Monat
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-50">Fixkosten</h2>
        <p className="text-dark-400 mt-1">Das geht jeden Monat raus — automatisch erkannt aus deinen Transaktionen</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-red-500/15">
              <Repeat size={20} className="text-red-400" />
            </div>
            <span className="text-sm text-dark-400">Fixkosten/Monat</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(analysis.totalFixed)}</p>
          <p className="text-xs text-dark-500 mt-1">{analysis.fixedCount} wiederkehrende Posten</p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15">
              <Scissors size={20} className="text-amber-400" />
            </div>
            <span className="text-sm text-dark-400">Kündbar</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(analysis.totalCancellable)}</p>
          <p className="text-xs text-dark-500 mt-1">{analysis.cancellableCount} optionale Abos</p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15">
              <TrendingDown size={20} className="text-cyan-400" />
            </div>
            <span className="text-sm text-dark-400">Ø Variable Kosten</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400">{formatCurrency(analysis.totalVariable)}</p>
          <p className="text-xs text-dark-500 mt-1">pro Monat (Ø 3 Monate)</p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15">
              <Wallet size={20} className="text-purple-400" />
            </div>
            <span className="text-sm text-dark-400">Fix vs. Variabel</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">
            {analysis.totalFixed + analysis.totalVariable > 0
              ? ((analysis.totalFixed / (analysis.totalFixed + analysis.totalVariable)) * 100).toFixed(0)
              : 0}% fix
          </p>
          <p className="text-xs text-dark-500 mt-1">
            {formatCurrency(analysis.totalFixed + analysis.totalVariable)} gesamt
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        {analysis.categoryBreakdown.length > 0 && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PieChartIcon size={20} className="text-dark-400" />
              Fixkosten nach Kategorie
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analysis.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="name"
                >
                  {analysis.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-dark-300 text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Cancellable items highlight */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Scissors size={20} className="text-amber-400" />
            Das könntest du kündigen
          </h3>
          <p className="text-sm text-dark-400 mb-4">
            Optionale Abos & Subscriptions — {formatCurrency(analysis.totalCancellable)}/Monat = {formatCurrency(analysis.totalCancellable * 12)}/Jahr
          </p>
          
          {analysis.fixedCosts.filter(fc => fc.isCancellable).length === 0 ? (
            <div className="flex items-center gap-3 py-6 text-dark-400 justify-center">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <span>Keine kündbaren Abos erkannt</span>
            </div>
          ) : (
            <div className="space-y-2">
              {analysis.fixedCosts.filter(fc => fc.isCancellable).map((fc, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{fc.categoryIcon}</span>
                    <div>
                      <p className="text-sm font-medium text-dark-100">{fc.name}</p>
                      <p className="text-xs text-dark-400">{fc.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{formatCurrency(fc.amount)}/Mo</p>
                    <p className="text-xs text-dark-500">{formatCurrency(fc.amount * 12)}/Jahr</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Fixed Costs */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">
          Alle Fixkosten
          <span className="text-sm text-dark-400 font-normal ml-2">
            ({analysis.fixedCount} Posten · {formatCurrency(analysis.totalFixed)}/Monat)
          </span>
        </h3>
        
        {analysis.fixedCosts.length === 0 ? (
          <div className="text-center py-12 text-dark-400">
            <Repeat size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">Keine Fixkosten erkannt</p>
            <p className="text-sm text-dark-500 mt-1">Importiere mehr Transaktionsdaten für bessere Erkennung</p>
          </div>
        ) : (
          <div className="space-y-2">
            {analysis.fixedCosts.map((fc, i) => {
              const pct = analysis.totalFixed > 0 ? (fc.amount / analysis.totalFixed * 100) : 0
              return (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-dark-700/50 ${
                    fc.isCancellable ? 'border-l-2 border-amber-500/50' : ''
                  }`}
                >
                  <span className="text-xl w-8 text-center">{fc.categoryIcon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-dark-100 truncate">{fc.name}</span>
                        {fc.isCancellable && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-full font-medium">
                            kündbar
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-red-400 flex-shrink-0 ml-2">
                        {formatCurrency(fc.amount)}/Mo
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-dark-500">{fc.category}</span>
                        <span className="text-xs text-dark-600">·</span>
                        <span className="text-xs text-dark-500">{formatCurrency(fc.amount * 12)}/Jahr</span>
                      </div>
                      <span className="text-xs text-dark-500">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-dark-700 rounded-full h-1.5 mt-1.5 overflow-hidden">
                      <div 
                        className="h-full rounded-full" 
                        style={{ width: `${pct}%`, backgroundColor: fc.categoryColor }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Total */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t border-dark-700/50 px-4">
              <div>
                <span className="text-sm font-bold text-dark-200">Gesamt Fixkosten</span>
                <span className="text-xs text-dark-500 ml-2">({formatCurrency(analysis.totalFixed * 12)}/Jahr)</span>
              </div>
              <span className="text-lg font-bold text-red-400">{formatCurrency(analysis.totalFixed)}/Mo</span>
            </div>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="glass rounded-2xl p-5 border border-dark-600/50">
        <div className="flex gap-3">
          <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-dark-200">Wie erkennt das Tool Fixkosten?</p>
            <p className="text-xs text-dark-400 mt-1">
              Wiederkehrende Zahlungen werden anhand von Schlüsselwörtern (Miete, Spotify, etc.) und 
              Mustern (gleicher Empfänger, ähnlicher Betrag über 2+ Monate) erkannt. 
              Mehr Transaktionsdaten = bessere Erkennung.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
