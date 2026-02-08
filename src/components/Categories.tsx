'use client'

import { useState, useEffect } from 'react'
import { supabase, Category } from '@/lib/supabase'
import { formatCurrency } from '@/lib/categories'
import { Plus, Pencil, Trash2, Save, X, GripVertical } from 'lucide-react'

const ICON_OPTIONS = ['🏠', '🛒', '👕', '🚗', '🍕', '📱', '💊', '🎮', '🎁', '📦', '💰', '💻', '📈', '🎵', '📚', '✈️', '🏋️', '🐕', '💇', '🔧', '🎓', '🏪']
const COLOR_OPTIONS = ['#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6', '#EC4899', '#6366F1', '#10B981', '#F97316', '#14B8A6', '#6B7280', '#22C55E', '#06B6D4', '#84CC16', '#A855F7', '#FB923C']

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '',
    icon: '📦',
    color: '#6B7280',
    monthly_budget: 0,
    type: 'expense' as 'expense' | 'income' | 'both',
  })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('sort_order')
    if (data) setCategories(data)
    setLoading(false)
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setForm({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      monthly_budget: cat.monthly_budget,
      type: cat.type,
    })
    setShowAdd(false)
  }

  function startAdd() {
    setShowAdd(true)
    setEditingId(null)
    setForm({
      name: '',
      icon: '📦',
      color: '#6B7280',
      monthly_budget: 0,
      type: 'expense',
    })
  }

  async function saveCategory() {
    if (!form.name.trim()) return

    if (editingId) {
      await supabase.from('categories').update({
        name: form.name,
        icon: form.icon,
        color: form.color,
        monthly_budget: form.monthly_budget,
        type: form.type,
      }).eq('id', editingId)
    } else {
      const maxSort = Math.max(0, ...categories.map(c => c.sort_order))
      await supabase.from('categories').insert({
        name: form.name,
        icon: form.icon,
        color: form.color,
        monthly_budget: form.monthly_budget,
        type: form.type,
        sort_order: maxSort + 1,
      })
    }

    setEditingId(null)
    setShowAdd(false)
    loadCategories()
  }

  async function deleteCategory(id: string) {
    if (!confirm('Kategorie wirklich löschen? Transaktionen werden auf "Unkategorisiert" gesetzt.')) return
    await supabase.from('categories').delete().eq('id', id)
    loadCategories()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  const FormFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-dark-400 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Kategorie-Name"
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div>
          <label className="block text-sm text-dark-400 mb-1">Monatsbudget (€)</label>
          <input
            type="number"
            step="10"
            value={form.monthly_budget}
            onChange={e => setForm({ ...form, monthly_budget: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-2">Icon</label>
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map(icon => (
            <button
              key={icon}
              onClick={() => setForm({ ...form, icon })}
              className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center ${
                form.icon === icon 
                  ? 'bg-emerald-500/20 border-2 border-emerald-500' 
                  : 'bg-dark-700 border border-dark-600 hover:border-dark-500'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-2">Farbe</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map(color => (
            <button
              key={color}
              onClick={() => setForm({ ...form, color })}
              className={`w-8 h-8 rounded-full ${
                form.color === color ? 'ring-2 ring-offset-2 ring-offset-dark-800 ring-white' : ''
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-dark-400 mb-2">Typ</label>
        <div className="flex gap-2">
          {(['expense', 'income', 'both'] as const).map(type => (
            <button
              key={type}
              onClick={() => setForm({ ...form, type })}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                form.type === type
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-dark-700 text-dark-400 border border-dark-600 hover:border-dark-500'
              }`}
            >
              {type === 'expense' ? '💸 Ausgabe' : type === 'income' ? '💰 Einnahme' : '↔️ Beides'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={saveCategory}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium"
        >
          <Save size={14} />
          Speichern
        </button>
        <button
          onClick={() => { setEditingId(null); setShowAdd(false) }}
          className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-xl text-sm font-medium"
        >
          <X size={14} />
          Abbrechen
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kategorien</h2>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          Neue Kategorie
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="glass rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Neue Kategorie</h3>
          <FormFields />
        </div>
      )}

      {/* Category List */}
      <div className="space-y-3">
        {categories.map(cat => (
          <div key={cat.id} className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: cat.color + '20' }}
                >
                  {cat.icon}
                </div>
                <div>
                  <h4 className="font-semibold text-dark-100">{cat.name}</h4>
                  <p className="text-sm text-dark-400">
                    {cat.type === 'income' ? 'Einnahme' : cat.type === 'both' ? 'Beides' : 'Ausgabe'}
                    {cat.monthly_budget > 0 && (
                      <span className="ml-2">· Budget: {formatCurrency(cat.monthly_budget)}/Mo</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }} />
                <button
                  onClick={() => startEdit(cat)}
                  className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-700"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="p-2 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {editingId === cat.id && (
              <div className="border-t border-dark-700/50 p-4 bg-dark-800/50">
                <FormFields />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
