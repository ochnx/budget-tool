'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Transaction, Category } from '@/lib/supabase'
import { formatCurrency, getMonthName } from '@/lib/categories'
import { TrendingUp, TrendingDown, Wallet, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [selectedMonth])

  async function loadData() {
    setLoading(true)
    const startDate = new Date(selectedMonth.year, selectedMonth.month, 1)
    const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0)

    const [txRes, catRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false }),
      supabase.from('categories').select('*').order('sort_order')
    ])

    if (txRes.data) setTransactions(txRes.data)
    if (catRes.data) setCategories(catRes.data)
    setLoading(false)
  }

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.is_income).reduce((sum, t) => sum + Number(t.amount), 0)
    const expenses = transactions.filter(t => !t.is_income).reduce((sum, t) => sum + Number(t.amount), 0)
    const balance = income - expenses
    const txCount = transactions.length

    // Category breakdown for expenses
    const catMap = new Map<string, { name: string; icon: string; color: string; total: number }>()
    transactions.filter(t => !t.is_income).forEach(t => {
      const cat = t.category as Category | undefined
      const key = cat?.id || 'uncategorized'
      const existing = catMap.get(key)
      if (existing) {
        existing.total += Number(t.amount)
      } else {
        catMap.set(key, {
          name: cat?.name || 'Unkategorisiert',
          icon: cat?.icon || '❓',
          color: cat?.color || '#6B7280',
          total: Number(t.amount),
        })
      }
    })

    const categoryBreakdown = Array.from(catMap.values())
      .sort((a, b) => b.total - a.total)

    // Last 6 months trend
    const monthlyTrend: { name: string; einnahmen: number; ausgaben: number }[] = []

    return { income, expenses, balance, txCount, categoryBreakdown, monthlyTrend }
  }, [transactions])

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-3 shadow-xl border border-dark-600">
          <p className="text-sm font-medium text-dark-100">
            {payload[0].payload.icon} {payload[0].name}
          </p>
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

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-dark-50">Dashboard</h2>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-dark-700 text-dark-300 hover:text-dark-100">
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-semibold min-w-[180px] text-center">
            {getMonthName(selectedMonth.month)} {selectedMonth.year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-dark-700 text-dark-300 hover:text-dark-100">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15">
              <TrendingUp size={20} className="text-emerald-400" />
            </div>
            <span className="text-sm text-dark-400">Einnahmen</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.income)}</p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-red-500/15">
              <TrendingDown size={20} className="text-red-400" />
            </div>
            <span className="text-sm text-dark-400">Ausgaben</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.expenses)}</p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/15">
              <Wallet size={20} className="text-cyan-400" />
            </div>
            <span className="text-sm text-dark-400">Bilanz</span>
          </div>
          <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(stats.balance)}
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/15">
              <ArrowUpDown size={20} className="text-purple-400" />
            </div>
            <span className="text-sm text-dark-400">Transaktionen</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{stats.txCount}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart — Ausgaben nach Kategorie */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Ausgaben nach Kategorie</h3>
          {stats.categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-dark-400">
              Keine Ausgaben diesen Monat
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="total"
                  nameKey="name"
                >
                  {stats.categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-dark-300 text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart — Top Kategorien */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">Top Ausgaben-Kategorien</h3>
          {stats.categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-dark-400">
              Keine Ausgaben diesen Monat
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart 
                data={stats.categoryBreakdown.slice(0, 6)} 
                layout="vertical"
                margin={{ top: 0, right: 0, bottom: 0, left: 10 }}
              >
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120}
                  tick={{ fill: '#94a3b8', fontSize: 13 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar 
                  dataKey="total" 
                  radius={[0, 8, 8, 0]}
                  barSize={28}
                >
                  {stats.categoryBreakdown.slice(0, 6).map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Letzte Transaktionen</h3>
        {transactions.length === 0 ? (
          <p className="text-dark-400 text-center py-8">
            Noch keine Transaktionen. Importiere deinen Kontoauszug! 📄
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 8).map((tx) => {
              const cat = tx.category as Category | undefined
              return (
                <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-dark-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat?.icon || '📦'}</span>
                    <div>
                      <p className="text-sm font-medium text-dark-100 truncate max-w-[200px] sm:max-w-[300px]">
                        {tx.recipient || tx.description || 'Unbekannt'}
                      </p>
                      <p className="text-xs text-dark-400">
                        {new Date(tx.date).toLocaleDateString('de-DE')} · {cat?.name || 'Unkategorisiert'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${tx.is_income ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.is_income ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
