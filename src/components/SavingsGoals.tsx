'use client'

import { useState, useEffect } from 'react'
import { supabase, SavingsGoal } from '@/lib/supabase'
import { formatCurrency } from '@/lib/categories'
import { Plus, Pencil, Trash2, Save, X, PiggyBank, Target, CalendarDays } from 'lucide-react'

export default function SavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: '',
  })

  useEffect(() => {
    loadGoals()
  }, [])

  async function loadGoals() {
    setLoading(true)
    const { data } = await supabase.from('savings_goals').select('*').order('created_at', { ascending: false })
    if (data) setGoals(data)
    setLoading(false)
  }

  function startEdit(goal: SavingsGoal) {
    setEditingId(goal.id)
    setForm({
      name: goal.name,
      target_amount: String(goal.target_amount),
      current_amount: String(goal.current_amount),
      deadline: goal.deadline || '',
    })
    setShowAdd(false)
  }

  function startAdd() {
    setShowAdd(true)
    setEditingId(null)
    setForm({ name: '', target_amount: '', current_amount: '0', deadline: '' })
  }

  async function saveGoal() {
    if (!form.name || !form.target_amount) return

    const data = {
      name: form.name,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      deadline: form.deadline || null,
    }

    if (editingId) {
      await supabase.from('savings_goals').update(data).eq('id', editingId)
    } else {
      await supabase.from('savings_goals').insert(data)
    }

    setEditingId(null)
    setShowAdd(false)
    loadGoals()
  }

  async function deleteGoal(id: string) {
    if (!confirm('Sparziel wirklich löschen?')) return
    await supabase.from('savings_goals').delete().eq('id', id)
    loadGoals()
  }

  async function updateAmount(id: string, delta: number) {
    const goal = goals.find(g => g.id === id)
    if (!goal) return
    const newAmount = Math.max(0, Number(goal.current_amount) + delta)
    await supabase.from('savings_goals').update({ current_amount: newAmount }).eq('id', id)
    loadGoals()
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
        <h2 className="text-2xl font-bold">Sparziele</h2>
        <button
          onClick={startAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium"
        >
          <Plus size={16} />
          Neues Ziel
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold">Neues Sparziel</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Name</label>
              <input
                type="text"
                placeholder="z.B. Notgroschen"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Zielbetrag (€)</label>
              <input
                type="number"
                step="100"
                placeholder="5000"
                value={form.target_amount}
                onChange={e => setForm({ ...form, target_amount: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Aktuell gespart (€)</label>
              <input
                type="number"
                step="10"
                placeholder="0"
                value={form.current_amount}
                onChange={e => setForm({ ...form, current_amount: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Deadline (optional)</label>
              <input
                type="date"
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveGoal}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium"
            >
              <Save size={14} /> Speichern
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-xl text-sm font-medium"
            >
              <X size={14} /> Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Goals Grid */}
      {goals.length === 0 && !showAdd ? (
        <div className="glass rounded-2xl p-12 text-center">
          <PiggyBank size={48} className="mx-auto text-dark-500 mb-4" />
          <p className="text-dark-400 text-lg">Noch keine Sparziele</p>
          <p className="text-dark-500 text-sm mt-2">
            Erstelle dein erstes Sparziel!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const percentage = Math.min(Math.round((Number(goal.current_amount) / Number(goal.target_amount)) * 100), 100)
            const isComplete = Number(goal.current_amount) >= Number(goal.target_amount)
            
            // Days until deadline
            let daysLeft: number | null = null
            if (goal.deadline) {
              const diff = new Date(goal.deadline).getTime() - Date.now()
              daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24))
            }

            // Monthly savings needed
            let monthlyNeeded: number | null = null
            if (goal.deadline && !isComplete) {
              const monthsLeft = Math.max(1, (daysLeft || 30) / 30)
              monthlyNeeded = (Number(goal.target_amount) - Number(goal.current_amount)) / monthsLeft
            }

            return (
              <div key={goal.id} className="glass rounded-2xl p-6 space-y-4">
                {editingId === goal.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="col-span-2 px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <input
                        type="number"
                        value={form.target_amount}
                        onChange={e => setForm({ ...form, target_amount: e.target.value })}
                        placeholder="Zielbetrag"
                        className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <input
                        type="number"
                        value={form.current_amount}
                        onChange={e => setForm({ ...form, current_amount: e.target.value })}
                        placeholder="Aktuell"
                        className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                      <input
                        type="date"
                        value={form.deadline}
                        onChange={e => setForm({ ...form, deadline: e.target.value })}
                        className="col-span-2 px-3 py-2 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={saveGoal} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm">
                        <Save size={14} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-300 rounded-lg text-sm">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-dark-100">
                          {isComplete ? '🎉' : '🎯'} {goal.name}
                        </h3>
                        {goal.deadline && (
                          <div className="flex items-center gap-1.5 mt-1 text-sm text-dark-400">
                            <CalendarDays size={14} />
                            <span>
                              {new Date(goal.deadline).toLocaleDateString('de-DE')}
                              {daysLeft !== null && (
                                <span className={daysLeft < 0 ? 'text-red-400' : daysLeft < 30 ? 'text-amber-400' : ''}>
                                  {' '}({daysLeft < 0 ? `${Math.abs(daysLeft)} Tage überfällig` : `${daysLeft} Tage übrig`})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(goal)} className="p-1.5 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteGoal(goal.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-dark-300">{formatCurrency(Number(goal.current_amount))}</span>
                        <span className="text-dark-400">{formatCurrency(Number(goal.target_amount))}</span>
                      </div>
                      <div className="w-full bg-dark-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isComplete ? 'bg-emerald-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className={`text-sm font-bold ${isComplete ? 'text-emerald-400' : 'text-cyan-400'}`}>
                          {percentage}%
                        </span>
                        {monthlyNeeded !== null && (
                          <span className="text-xs text-dark-400">
                            ~{formatCurrency(monthlyNeeded)}/Monat nötig
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Add/Remove */}
                    <div className="flex gap-2 pt-1">
                      {[10, 50, 100, 500].map(amt => (
                        <button
                          key={amt}
                          onClick={() => updateAmount(goal.id, amt)}
                          className="flex-1 py-1.5 bg-dark-700 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg text-xs font-medium text-dark-300 border border-dark-600 hover:border-emerald-500/30"
                        >
                          +{amt}€
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
