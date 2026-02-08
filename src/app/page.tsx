'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import Dashboard from '@/components/Dashboard'
import Transactions from '@/components/Transactions'
import CSVImport from '@/components/CSVImport'
import Categories from '@/components/Categories'
import BudgetOverview from '@/components/BudgetOverview'
import SavingsGoals from '@/components/SavingsGoals'
import SalaryCalculator from '@/components/SalaryCalculator'
import FixedCosts from '@/components/FixedCosts'
import DeepDive from '@/components/DeepDive'

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')

  function renderContent() {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />
      case 'transactions': return <Transactions />
      case 'fixkosten': return <FixedCosts />
      case 'deepdive': return <DeepDive />
      case 'import': return <CSVImport />
      case 'categories': return <Categories />
      case 'budget': return <BudgetOverview />
      case 'savings': return <SavingsGoals />
      case 'salary': return <SalaryCalculator />
      default: return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-dark-950">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
