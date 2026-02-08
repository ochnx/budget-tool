'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Transaction, Category } from '@/lib/supabase'
import { formatCurrency, getMonthName } from '@/lib/categories'
import { 
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, 
  Calendar, ArrowUpDown, TrendingUp, TrendingDown, 
  Lightbulb, BarChart3, Filter
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line, CartesianGrid
} from 'recharts'

type TimeFilter = 'week' | 'month' | 'custom'
type SortBy = 'amount' | 'date'

export default function DeepDive() {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month')
  const [sortBy, setSortBy] = useState<SortBy>('amount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    // Load ALL transactions for comparison
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const [txRes, catRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .gte('date', sixMonthsAgo.toISOString().split('T')[0])
        .order('date', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order')
    ])

    if (txRes.data) setAllTransactions(txRes.data)
    if (catRes.data) setCategories(catRes.data)
    setLoading(false)
  }

  // Date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date()
    let start: Date
    let end: Date
    let prevStart: Date
    let prevEnd: Date

    if (timeFilter === 'week') {
      const dayOfWeek = now.getDay() || 7
      end = new Date(now)
      start = new Date(now)
      start.setDate(now.getDate() - dayOfWeek + 1)
      start.setHours(0, 0, 0, 0)
      
      prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - 6)
    } else {
      start = new Date(selectedMonth.year, selectedMonth.month, 1)
      end = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
      
      const prevMonthDate = new Date(selectedMonth.year, selectedMonth.month - 1, 1)
      prevStart = prevMonthDate
      prevEnd = new Date(selectedMonth.year, selectedMonth.month, 0)
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      prevStart: prevStart.toISOString().split('T')[0],
      prevEnd: prevEnd.toISOString().split('T')[0],
      label: timeFilter === 'week' 
        ? 'Diese Woche' 
        : `${getMonthName(selectedMonth.month)} ${selectedMonth.year}`,
      prevLabel: timeFilter === 'week' 
        ? 'Letzte Woche' 
        : (() => {
            const pm = selectedMonth.month === 0 ? 11 : selectedMonth.month - 1
            const py = selectedMonth.month === 0 ? selectedMonth.year - 1 : selectedMonth.year
            return `${getMonthName(pm)} ${py}`
          })(),
    }
  }, [timeFilter, selectedMonth])

  // Filter transactions for current and previous period
  const { currentTxs, prevTxs } = useMemo(() => {
    const current = allTransactions.filter(t => {
      const d = t.date
      return d >= dateRange.start && d <= dateRange.end && !t.is_income
    })
    const prev = allTransactions.filter(t => {
      const d = t.date
      return d >= dateRange.prevStart && d <= dateRange.prevEnd && !t.is_income
    })
    return { currentTxs: current, prevTxs: prev }
  }, [allTransactions, dateRange])

  // Category analysis
  const categoryAnalysis = useMemo(() => {
    const catMap = new Map<string, {
      id: string
      name: string
      icon: string
      color: string
      currentTotal: number
      prevTotal: number
      transactions: Transaction[]
      prevTransactions: Transaction[]
    }>()

    // Current period
    currentTxs.forEach(t => {
      const cat = t.category as Category | undefined
      const key = cat?.id || 'uncategorized'
      const existing = catMap.get(key) || {
        id: key,
        name: cat?.name || 'Unkategorisiert',
        icon: cat?.icon || '❓',
        color: cat?.color || '#6B7280',
        currentTotal: 0,
        prevTotal: 0,
        transactions: [],
        prevTransactions: [],
      }
      existing.currentTotal += Number(t.amount)
      existing.transactions.push(t)
      catMap.set(key, existing)
    })

    // Previous period
    prevTxs.forEach(t => {
      const cat = t.category as Category | undefined
      const key = cat?.id || 'uncategorized'
      const existing = catMap.get(key) || {
        id: key,
        name: cat?.name || 'Unkategorisiert',
        icon: cat?.icon || '❓',
        color: cat?.color || '#6B7280',
        currentTotal: 0,
        prevTotal: 0,
        transactions: [],
        prevTransactions: [],
      }
      existing.prevTotal += Number(t.amount)
      existing.prevTransactions.push(t)
      catMap.set(key, existing)
    })

    return Array.from(catMap.values())
      .sort((a, b) => b.currentTotal - a.currentTotal)
  }, [currentTxs, prevTxs])

  // Spending insights
  const insights = useMemo(() => {
    const result: { text: string; type: 'info' | 'warning' | 'success' }[] = []

    categoryAnalysis.forEach(cat => {
      if (cat.currentTotal === 0) return

      // Weekly average → monthly projection
      const daysInPeriod = timeFilter === 'week' ? 7 : new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate()
      const dailyAvg = cat.currentTotal / daysInPeriod
      const weeklyAvg = dailyAvg * 7
      const monthlyProjection = dailyAvg * 30
      const yearlyProjection = dailyAvg * 365

      // Comparison with previous period
      if (cat.prevTotal > 0) {
        const change = ((cat.currentTotal - cat.prevTotal) / cat.prevTotal) * 100
        if (change > 30) {
          result.push({
            text: `${cat.icon} ${cat.name}: +${change.toFixed(0)}% mehr als ${dateRange.prevLabel} (${formatCurrency(cat.currentTotal)} vs. ${formatCurrency(cat.prevTotal)})`,
            type: 'warning',
          })
        } else if (change < -20) {
          result.push({
            text: `${cat.icon} ${cat.name}: ${Math.abs(change).toFixed(0)}% weniger als ${dateRange.prevLabel} — gut gemacht! 💪`,
            type: 'success',
          })
        }
      }

      // Annualization insight for significant categories
      if (yearlyProjection > 500) {
        result.push({
          text: `${cat.icon} ${cat.name}: ~${formatCurrency(weeklyAvg)}/Woche = ~${formatCurrency(monthlyProjection)}/Monat = ~${formatCurrency(yearlyProjection)}/Jahr`,
          type: 'info',
        })
      }

      // Per-recipient insights
      const recipientMap = new Map<string, number>()
      cat.transactions.forEach(t => {
        const name = t.recipient || t.description || 'Unbekannt'
        recipientMap.set(name, (recipientMap.get(name) || 0) + Number(t.amount))
      })
      
      recipientMap.forEach((total, name) => {
        if (cat.transactions.filter(t => (t.recipient || t.description) === name).length >= 3) {
          const perWeek = total / (daysInPeriod / 7)
          if (perWeek > 10) {
            result.push({
              text: `Du gibst ~${formatCurrency(perWeek)}/Woche für "${name}" aus = ~${formatCurrency(perWeek * 4.33)}/Monat`,
              type: 'info',
            })
          }
        }
      })
    })

    return result.slice(0, 12) // Limit insights
  }, [categoryAnalysis, timeFilter, selectedMonth, dateRange])

  // Monthly trend data (for category charts)
  const getCategoryTrend = (categoryId: string) => {
    const months = new Map<string, number>()
    allTransactions
      .filter(t => {
        const cat = t.category as Category | undefined
        return (cat?.id || 'uncategorized') === categoryId && !t.is_income
      })
      .forEach(t => {
        const d = new Date(t.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        months.set(key, (months.get(key) || 0) + Number(t.amount))
      })

    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, total]) => {
        const [year, month] = key.split('-')
        return {
          label: `${getMonthName(parseInt(month) - 1).slice(0, 3)} ${year.slice(2)}`,
          total,
        }
      })
  }

  function prevMonth() {
    setSelectedMonth(prev => {
      if (prev.month === 0) return { month: 11, year: prev.year - 1 }
      return { ...prev, month: prev.month - 1 }
    })
  }

  function nextMonth() {
    setSelectedMonth(prev => {
      if (prev.month === 11) return { month: 0, year: prev.year + 1 }
      return { ...prev, month: prev.month + 1 }
    })
  }

  function toggleCategory(catId: string) {
    setExpandedCategory(expandedCategory === catId ? null : catId)
  }

  function toggleSort() {
    if (sortBy === 'amount') {
      setSortBy('date')
    } else {
      setSortBy('amount')
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-3 shadow-xl border border-dark-600">
          <p className="text-sm font-medium text-dark-200">{label}</p>
          <p className="text-sm text-emerald-400 font-bold">
            {formatCurrency(payload[0].value)}
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

  const totalCurrent = currentTxs.reduce((s, t) => s + Number(t.amount), 0)
  const totalPrev = prevTxs.reduce((s, t) => s + Number(t.amount), 0)
  const totalChange = totalPrev > 0 ? ((totalCurrent - totalPrev) / totalPrev * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-dark-50">Deep Dive</h2>
          <p className="text-dark-400 mt-1">Deine Ausgaben im Detail analysiert</p>
        </div>

        {/* Time Filter */}
        <div className="flex items-center gap-2">
          <div className="flex bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-4 py-2 text-sm font-medium ${
                timeFilter === 'week' 
                  ? 'bg-emerald-500/15 text-emerald-400' 
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Woche
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-4 py-2 text-sm font-medium ${
                timeFilter === 'month' 
                  ? 'bg-emerald-500/15 text-emerald-400' 
                  : 'text-dark-400 hover:text-dark-200'
              }`}
            >
              Monat
            </button>
          </div>

          {timeFilter === 'month' && (
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-dark-700 text-dark-300 hover:text-dark-100">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium min-w-[140px] text-center text-dark-200">
                {getMonthName(selectedMonth.month)} {selectedMonth.year}
              </span>
              <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-dark-700 text-dark-300 hover:text-dark-100">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Banner */}
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm text-dark-400">{dateRange.label}</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(totalCurrent)}</p>
          </div>
          <div className="text-center">
            {totalPrev > 0 && (
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${
                totalChange > 0 
                  ? 'bg-red-500/10 text-red-400' 
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}>
                {totalChange > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}%
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-dark-400">{dateRange.prevLabel}</p>
            <p className="text-xl font-bold text-dark-300">{formatCurrency(totalPrev)}</p>
          </div>
        </div>
      </div>

      {/* Spending Insights */}
      {insights.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lightbulb size={20} className="text-amber-400" />
            Spending Insights
          </h3>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 py-2.5 px-4 rounded-xl text-sm ${
                  insight.type === 'warning'
                    ? 'bg-red-500/5 border border-red-500/10 text-red-300'
                    : insight.type === 'success'
                    ? 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-300'
                    : 'bg-cyan-500/5 border border-cyan-500/10 text-cyan-300'
                }`}
              >
                <span className="mt-0.5">
                  {insight.type === 'warning' ? '⚠️' : insight.type === 'success' ? '✅' : '💡'}
                </span>
                <span>{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sort Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSort}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-400 hover:text-dark-200 hover:bg-dark-700/50"
        >
          <ArrowUpDown size={16} />
          Sortieren: {sortBy === 'amount' ? 'Betrag' : 'Datum'} {sortDir === 'desc' ? '↓' : '↑'}
        </button>
        <span className="text-sm text-dark-500">
          {categoryAnalysis.length} Kategorien · {currentTxs.length} Transaktionen
        </span>
      </div>

      {/* Category Accordions */}
      <div className="space-y-3">
        {categoryAnalysis.map(cat => {
          const isExpanded = expandedCategory === cat.id
          const change = cat.prevTotal > 0 
            ? ((cat.currentTotal - cat.prevTotal) / cat.prevTotal * 100)
            : null
          const pct = totalCurrent > 0 ? (cat.currentTotal / totalCurrent * 100) : 0
          const trend = getCategoryTrend(cat.id)

          // Sort transactions within category
          const sortedTxs = [...cat.transactions].sort((a, b) => {
            if (sortBy === 'amount') {
              return sortDir === 'desc'
                ? Number(b.amount) - Number(a.amount)
                : Number(a.amount) - Number(b.amount)
            }
            return sortDir === 'desc'
              ? new Date(b.date).getTime() - new Date(a.date).getTime()
              : new Date(a.date).getTime() - new Date(b.date).getTime()
          })

          // Annualization
          const daysInPeriod = timeFilter === 'week' ? 7 : new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate()
          const dailyAvg = cat.currentTotal / daysInPeriod
          const monthlyProjection = dailyAvg * 30
          const yearlyProjection = dailyAvg * 365

          return (
            <div key={cat.id} className="glass rounded-2xl overflow-hidden">
              {/* Category Header — Clickable */}
              <button
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-dark-700/30 text-left"
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    {cat.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-dark-100">{cat.name}</h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-dark-400">
                        {cat.transactions.length} Transaktionen · {pct.toFixed(1)}%
                      </span>
                      {change !== null && (
                        <span className={`text-xs font-medium ${
                          change > 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {change > 0 ? '↑' : '↓'} {Math.abs(change).toFixed(0)}% vs. Vorperiode
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-400">{formatCurrency(cat.currentTotal)}</p>
                    {cat.prevTotal > 0 && (
                      <p className="text-xs text-dark-500">
                        Vorher: {formatCurrency(cat.prevTotal)}
                      </p>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp size={20} className="text-dark-400" /> : <ChevronDown size={20} className="text-dark-400" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-dark-700/50">
                  {/* Annualization & Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 bg-dark-800/30">
                    <div className="text-center">
                      <p className="text-xs text-dark-500 mb-1">Pro Woche</p>
                      <p className="text-sm font-bold text-dark-200">{formatCurrency(dailyAvg * 7)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-dark-500 mb-1">Pro Monat</p>
                      <p className="text-sm font-bold text-dark-200">{formatCurrency(monthlyProjection)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-dark-500 mb-1">Pro Jahr</p>
                      <p className="text-sm font-bold text-amber-400">{formatCurrency(yearlyProjection)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-dark-500 mb-1">Ø pro Transaktion</p>
                      <p className="text-sm font-bold text-dark-200">
                        {formatCurrency(cat.transactions.length > 0 ? cat.currentTotal / cat.transactions.length : 0)}
                      </p>
                    </div>
                  </div>

                  {/* Trend Chart */}
                  {trend.length >= 2 && (
                    <div className="p-5 border-t border-dark-700/30">
                      <h5 className="text-sm font-medium text-dark-300 mb-3 flex items-center gap-2">
                        <BarChart3 size={16} />
                        Trend über Zeit
                      </h5>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis 
                            dataKey="label" 
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fill: '#64748b', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${(v/1).toFixed(0)}€`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Line 
                            type="monotone"
                            dataKey="total"
                            stroke={cat.color}
                            strokeWidth={2}
                            dot={{ fill: cat.color, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Transaction List */}
                  <div className="divide-y divide-dark-700/20">
                    {sortedTxs.map(tx => {
                      const annualized = Number(tx.amount) * (365 / daysInPeriod) * (cat.transactions.filter(
                        t => (t.recipient || t.description) === (tx.recipient || tx.description)
                      ).length > 1 ? 1 : 0.5)
                      
                      return (
                        <div key={tx.id} className="flex items-center justify-between py-3 px-5 hover:bg-dark-700/20">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div>
                              <p className="text-sm font-medium text-dark-100 truncate max-w-[250px]">
                                {tx.recipient || tx.description || 'Unbekannt'}
                              </p>
                              <p className="text-xs text-dark-500">
                                {new Date(tx.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                {tx.description && tx.recipient && (
                                  <span className="ml-2 text-dark-600">· {tx.description.slice(0, 40)}</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-red-400 flex-shrink-0">
                            -{formatCurrency(Number(tx.amount))}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {categoryAnalysis.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <Filter size={48} className="mx-auto text-dark-500 mb-4" />
          <p className="text-dark-400 text-lg">Keine Ausgaben in diesem Zeitraum</p>
          <p className="text-dark-500 text-sm mt-1">Wähle einen anderen Zeitraum oder importiere Transaktionen</p>
        </div>
      )}
    </div>
  )
}
