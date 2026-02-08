'use client'

import { useState } from 'react'
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Upload, 
  Tags, 
  Target,
  PiggyBank,
  Calculator,
  Menu,
  X
} from 'lucide-react'

type NavItem = {
  id: string
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'transactions', label: 'Transaktionen', icon: <ArrowLeftRight size={20} /> },
  { id: 'import', label: 'CSV Import', icon: <Upload size={20} /> },
  { id: 'categories', label: 'Kategorien', icon: <Tags size={20} /> },
  { id: 'budget', label: 'Budget', icon: <Target size={20} /> },
  { id: 'savings', label: 'Sparziele', icon: <PiggyBank size={20} /> },
  { id: 'salary', label: 'Gehaltsrechner', icon: <Calculator size={20} /> },
]

type Props = {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function Navigation({ activeTab, onTabChange }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-dark-700/50 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          💰 Budget Tool
        </h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-dark-700"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-dark-950/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav className={`
        fixed top-0 left-0 h-full z-40 w-64 glass border-r border-dark-700/50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-1">
            💰 Budget Tool
          </h1>
          <p className="text-dark-400 text-sm">Deine Finanzen im Griff</p>
        </div>

        <div className="px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id)
                setMobileOpen(false)
              }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-200
                ${activeTab === item.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700/50'
                }
              `}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="glass rounded-xl p-3 text-center">
            <p className="text-xs text-dark-400">Made for Oskar 🚀</p>
          </div>
        </div>
      </nav>
    </>
  )
}
