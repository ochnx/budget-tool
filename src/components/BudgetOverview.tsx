'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, Transaction, Category } from '@/lib/supabase'
import { formatCurrency, getMonthName } from '@/lib/categories'
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function BudgetOverview() {
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
        .eq('is_income', false)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]),
      supabase.from('categories').select('*').eq('type', 'expense').order('sort_order')
    ])

    if (txRes.data) setTransactions(txRes.data)
    if (catRes.data) setCategories(catRes.data)
    setLoading(false)
  }

  const budgetData = useMemo(() => {
    return categories
      .filter(cat => cat.monthly_budget > 0)
      .map(cat => {
        const spent = transactions
          .filter(t => t.category_id === cat.id)
          .reduce((sum, t) => sum + Number(t.amount), 0)
        const percentage = Math.min(Math.round((spent / cat.monthly_budget) * 100), 100)
        const remaining = cat.monthly_budget - spent
        const isOver = spent > cat.monthly_budget

        return {
          ...cat,
          spent,
          percentage,
          remaining,
          isOver,
          overAmount: isOver ? spent - cat.monthly_budget : 0,
        }
      })
      .sort((a, b) => b.percentage - a.percentage)
  }, [transactions, categories])

  const totalBudget = budgetData.reduce((sum, b) => sum + b.monthly_budget, 0)
  const totalSpent = budgetData.reduce((sum, b) => sum + b.spent, 0)
  const totalPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Budget-Übersicht</h2>
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

      {/* Total Overview */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold">Gesamtbudget</h3>
            <p className="text-sm text-dark-400">
              {formatCurrency(totalSpent)} von {formatCurrency(totalBudget)} verbraucht
            </p>
          </div>
          <span className={`text-3xl font-bold ${totalPercentage > 100 ? 'text-red-400' : totalPercentage > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {totalPercentage}%
          </span>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              totalPercentage > 100 ? 'bg-red-500' : totalPercentage > 80 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Budget Items */}
      {budgetData.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-dark-400 text-lg">Kein Budget gesetzt</p>
          <p className="text-dark-500 text-sm mt-2">
            Gehe zu Kategorien und setze ein Monatsbudget für deine Ausgaben-Kategorien.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {budgetData.map(item => (
            <div key={item.id} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                    style={{ backgroundColor: item.color + '20' }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-dark-100">{item.name}</h4>
                    <p className="text-xs text-dark-400">
                      {formatCurrency(item.spent)} / {formatCurrency(item.monthly_budget)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {item.isOver ? (
                    <div className="flex items-center gap-1.5 text-red-400">
                      <AlertTriangle size={16} />
                      <span className="text-sm font-bold">+{formatCurrency(item.overAmount)}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 size={16} />
                      <span className="text-sm font-bold">{formatCurrency(item.remaining)} übrig</span>
                    </div>
                  )}
                  <p className="text-xs text-dark-500 mt-0.5">{item.percentage}%</p>
                </div>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out`}
                  style={{ 
                    width: `${Math.min(item.percentage, 100)}%`,
                    backgroundColor: item.isOver ? '#EF4444' : item.percentage > 80 ? '#F59E0B' : item.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
