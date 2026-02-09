'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Transaction, Category } from '@/lib/supabase'
import { formatCurrency, getMonthName } from '@/lib/categories'
import { Calculator, TrendingUp, AlertCircle, Info } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function SalaryCalculator() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [buffer, setBuffer] = useState(20) // Puffer-Prozent
  const [savingsTarget, setSavingsTarget] = useState(500) // Sparziel pro Monat

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    // Load last 12 months of transactions
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', twelveMonthsAgo.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (data) setTransactions(data)
    setLoading(false)
  }

  const analysis = useMemo(() => {
    // Group by month
    const monthlyData = new Map<string, { expenses: number; income: number }>()
    
    transactions.forEach(tx => {
      const date = new Date(tx.date)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const existing = monthlyData.get(key) || { expenses: 0, income: 0 }
      
      if (tx.is_income) {
        existing.income += Number(tx.amount)
      } else {
        existing.expenses += Number(tx.amount)
      }
      
      monthlyData.set(key, existing)
    })

    const months = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-')
        return {
          key,
          label: `${getMonthName(parseInt(month) - 1).slice(0, 3)} ${year.slice(2)}`,
          ...data,
        }
      })

    if (months.length === 0) return null

    const totalExpenses = months.reduce((sum, m) => sum + m.expenses, 0)
    const totalIncome = months.reduce((sum, m) => sum + m.income, 0)
    const avgExpenses = months.length > 0 ? totalExpenses / months.length : 0
    const avgIncome = months.length > 0 ? totalIncome / months.length : 0
    const maxExpenses = Math.max(...months.map(m => m.expenses))
    const minExpenses = Math.min(...months.map(m => m.expenses))

    // Recommended salary
    const withBuffer = avgExpenses * (1 + buffer / 100)
    const withSavings = withBuffer + savingsTarget
    
    // Brutto estimation (rough: multiply by 1.45 for taxes/social)
    const estimatedBrutto = withSavings * 1.45

    return {
      months,
      avgExpenses,
      avgIncome,
      maxExpenses,
      minExpenses,
      withBuffer,
      withSavings,
      estimatedBrutto,
      monthCount: months.length,
    }
  }, [transactions, buffer, savingsTarget])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (!analysis || analysis.months.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Gehaltsrechner</h2>
        <div className="glass rounded-2xl p-12 text-center">
          <Calculator size={48} className="mx-auto text-dark-500 mb-4" />
          <p className="text-dark-400 text-lg">Nicht genug Daten</p>
          <p className="text-dark-500 text-sm mt-2">
            Importiere zuerst deine Kontoauszüge, damit ich dein ideales Gehalt berechnen kann.
          </p>
        </div>
      </div>
    )
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass rounded-lg p-3 shadow-xl border border-dark-600">
          <p className="text-sm font-medium text-dark-200 mb-1">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} className="text-sm" style={{ color: p.fill || p.color }}>
              {p.name}: {formatCurrency(p.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Gehaltsrechner</h2>
      <p className="text-dark-400">
        Basierend auf deinen Ausgaben der letzten {analysis.monthCount} Monate — was sollte dein fixes Gehalt sein?
      </p>

      {/* Result Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3 text-dark-400">
            <TrendingUp size={18} />
            <span className="text-sm">Ø Ausgaben/Monat</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(analysis.avgExpenses)}</p>
          <p className="text-xs text-dark-500 mt-1">
            Min: {formatCurrency(analysis.minExpenses)} · Max: {formatCurrency(analysis.maxExpenses)}
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3 text-dark-400">
            <Calculator size={18} />
            <span className="text-sm">Empfohlenes Netto</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(analysis.withSavings)}</p>
          <p className="text-xs text-dark-500 mt-1">
            Ausgaben + {buffer}% Puffer + {formatCurrency(savingsTarget)} Sparen
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3 text-dark-400">
            <Info size={18} />
            <span className="text-sm">Geschätztes Brutto</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400">{formatCurrency(analysis.estimatedBrutto)}</p>
          <p className="text-xs text-dark-500 mt-1">
            ~45% Abzüge (Steuern, SV)
          </p>
        </div>
      </div>

      {/* Sliders */}
      <div className="glass rounded-2xl p-6 space-y-6">
        <h3 className="text-lg font-semibold">Anpassen</h3>
        
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-dark-300">Sicherheits-Puffer</label>
            <span className="text-sm font-bold text-emerald-400">{buffer}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            step={5}
            value={buffer}
            onChange={e => setBuffer(parseInt(e.target.value))}
            className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-dark-500 mt-1">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm text-dark-300">Monatliches Sparziel</label>
            <span className="text-sm font-bold text-cyan-400">{formatCurrency(savingsTarget)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={2000}
            step={50}
            value={savingsTarget}
            onChange={e => setSavingsTarget(parseInt(e.target.value))}
            className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-dark-500 mt-1">
            <span>0€</span>
            <span>1.000€</span>
            <span>2.000€</span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Gehalts-Aufschlüsselung</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2">
            <span className="text-dark-300">Ø Monatliche Ausgaben</span>
            <span className="font-bold text-dark-100">{formatCurrency(analysis.avgExpenses)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-dark-700/50">
            <span className="text-dark-300">+ Sicherheitspuffer ({buffer}%)</span>
            <span className="font-bold text-amber-400">+{formatCurrency(analysis.avgExpenses * buffer / 100)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-t border-dark-700/50">
            <span className="text-dark-300">+ Monatliches Sparen</span>
            <span className="font-bold text-cyan-400">+{formatCurrency(savingsTarget)}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-t-2 border-emerald-500/30 bg-emerald-500/5 rounded-xl px-4 -mx-4">
            <span className="text-emerald-400 font-semibold">= Mindest-Netto pro Monat</span>
            <span className="text-xl font-bold text-emerald-400">{formatCurrency(analysis.withSavings)}</span>
          </div>
          <div className="flex justify-between items-center py-3 bg-cyan-500/5 rounded-xl px-4 -mx-4">
            <span className="text-cyan-400 font-semibold">≈ Brutto (geschätzt)</span>
            <span className="text-xl font-bold text-cyan-400">{formatCurrency(analysis.estimatedBrutto)}</span>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Ausgaben pro Monat</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analysis.months}>
            <XAxis 
              dataKey="label" 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine 
              y={analysis.avgExpenses} 
              stroke="#F59E0B" 
              strokeDasharray="5 5"
              label={{ value: 'Ø', fill: '#F59E0B', position: 'right' }}
            />
            <Bar dataKey="expenses" name="Ausgaben" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={24} />
            <Bar dataKey="income" name="Einnahmen" fill="#22C55E" radius={[6, 6, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tips */}
      <div className="glass rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-3">💡 Tipps</h3>
        <div className="space-y-2 text-sm text-dark-300">
          <p>• Als Unternehmer solltest du mindestens <strong className="text-dark-100">3 Monatsgehälter</strong> als Notgroschen haben.</p>
          <p>• Zahle dir ein festes Gehalt aus — auch wenn Einnahmen schwanken. Das schafft Struktur.</p>
          <p>• Das geschätzte Brutto ist ein <strong className="text-dark-100">grober Richtwert</strong>. Dein tatsächlicher Steuersatz hängt von vielen Faktoren ab.</p>
          <p>• Regel: <strong className="text-dark-100">50/30/20</strong> — 50% Fixkosten, 30% Lifestyle, 20% Sparen/Investieren.</p>
        </div>
      </div>
    </div>
  )
}
