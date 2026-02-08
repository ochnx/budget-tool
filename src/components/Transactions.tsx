'use client'

import { useState, useEffect } from 'react'
import { supabase, Transaction, Category } from '@/lib/supabase'
import { formatCurrency } from '@/lib/categories'
import { Search, ArrowUpDown, Trash2, ChevronDown, Plus, X } from 'lucide-react'

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [sortField, setSortField] = useState<'date' | 'amount'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    recipient: '',
    category_id: '',
    is_income: false,
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [txRes, catRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .order('date', { ascending: false })
        .limit(500),
      supabase.from('categories').select('*').order('sort_order')
    ])
    if (txRes.data) setTransactions(txRes.data)
    if (catRes.data) setCategories(catRes.data)
    setLoading(false)
  }

  async function updateCategory(txId: string, categoryId: string) {
    await supabase.from('transactions').update({ category_id: categoryId || null }).eq('id', txId)
    setEditingId(null)
    loadData()
  }

  async function deleteTransaction(txId: string) {
    if (!confirm('Transaktion wirklich löschen?')) return
    await supabase.from('transactions').delete().eq('id', txId)
    loadData()
  }

  async function addTransaction() {
    if (!newTx.amount || !newTx.date) return
    await supabase.from('transactions').insert({
      date: newTx.date,
      amount: parseFloat(newTx.amount),
      description: newTx.description,
      recipient: newTx.recipient,
      category_id: newTx.category_id || null,
      is_income: newTx.is_income,
      notes: newTx.notes
    })
    setShowAdd(false)
    setNewTx({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      description: '',
      recipient: '',
      category_id: '',
      is_income: false,
      notes: ''
    })
    loadData()
  }

  const filtered = transactions
    .filter(t => {
      if (filterType === 'income' && !t.is_income) return false
      if (filterType === 'expense' && t.is_income) return false
      if (filterCategory !== 'all' && t.category_id !== filterCategory) return false
      if (search) {
        const s = search.toLowerCase()
        return (
          (t.description?.toLowerCase() || '').includes(s) ||
          (t.recipient?.toLowerCase() || '').includes(s) ||
          (t.notes?.toLowerCase() || '').includes(s)
        )
      }
      return true
    })
    .sort((a, b) => {
      const mult = sortDir === 'asc' ? 1 : -1
      if (sortField === 'date') {
        return mult * (new Date(a.date).getTime() - new Date(b.date).getTime())
      }
      return mult * (Number(a.amount) - Number(b.amount))
    })

  function toggleSort(field: 'date' | 'amount') {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transaktionen</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium"
        >
          {showAdd ? <X size={16} /> : <Plus size={16} />}
          {showAdd ? 'Abbrechen' : 'Neue Transaktion'}
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold">Neue Transaktion hinzufügen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Datum</label>
              <input
                type="date"
                value={newTx.date}
                onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Betrag (€)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={newTx.amount}
                onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Empfänger</label>
              <input
                type="text"
                placeholder="z.B. REWE"
                value={newTx.recipient}
                onChange={e => setNewTx({ ...newTx, recipient: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Beschreibung</label>
              <input
                type="text"
                placeholder="Was war das?"
                value={newTx.description}
                onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Kategorie</label>
              <select
                value={newTx.category_id}
                onChange={e => setNewTx({ ...newTx, category_id: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">— Keine —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTx.is_income}
                  onChange={e => setNewTx({ ...newTx, is_income: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
                <span className="text-sm text-dark-300">Einnahme</span>
              </label>
              <button
                onClick={addTransaction}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            placeholder="Suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="all">Alle Kategorien</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as any)}
          className="px-3 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        >
          <option value="all">Alles</option>
          <option value="income">Einnahmen</option>
          <option value="expense">Ausgaben</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 bg-dark-800/60 border-b border-dark-700/50 text-xs font-semibold text-dark-400 uppercase tracking-wider">
          <button className="col-span-2 flex items-center gap-1 hover:text-dark-200" onClick={() => toggleSort('date')}>
            Datum <ArrowUpDown size={12} />
          </button>
          <div className="col-span-3">Empfänger</div>
          <div className="col-span-3">Beschreibung</div>
          <div className="col-span-2">Kategorie</div>
          <button className="col-span-1 flex items-center gap-1 hover:text-dark-200 justify-end" onClick={() => toggleSort('amount')}>
            Betrag <ArrowUpDown size={12} />
          </button>
          <div className="col-span-1"></div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-dark-400">
            Keine Transaktionen gefunden
          </div>
        ) : (
          <div className="divide-y divide-dark-700/30">
            {filtered.map(tx => {
              const cat = tx.category as Category | undefined
              return (
                <div key={tx.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 px-4 py-3 hover:bg-dark-700/30 items-center">
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
                    {editingId === tx.id ? (
                      <select
                        autoFocus
                        defaultValue={tx.category_id || ''}
                        onChange={e => updateCategory(tx.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        className="w-full px-2 py-1 bg-dark-700 border border-dark-600 rounded-lg text-xs text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="">— Keine —</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingId(tx.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-dark-700/50"
                        style={{ color: cat?.color || '#6B7280' }}
                      >
                        <span>{cat?.icon || '❓'}</span>
                        <span>{cat?.name || 'Kategorie wählen'}</span>
                        <ChevronDown size={12} />
                      </button>
                    )}
                  </div>
                  <div className={`sm:col-span-1 text-sm font-bold text-right ${tx.is_income ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.is_income ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="text-sm text-dark-500 text-center">
        {filtered.length} von {transactions.length} Transaktionen
      </p>
    </div>
  )
}
