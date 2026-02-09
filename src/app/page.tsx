'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Navigation from '@/components/Navigation'
import ErrorBoundary from '@/components/ErrorBoundary'

const Dashboard = dynamic(() => import('@/components/Dashboard'), { ssr: false })
const Transactions = dynamic(() => import('@/components/Transactions'), { ssr: false })
const CSVImport = dynamic(() => import('@/components/CSVImport'), { ssr: false })
const Categories = dynamic(() => import('@/components/Categories'), { ssr: false })
const BudgetOverview = dynamic(() => import('@/components/BudgetOverview'), { ssr: false })
const SavingsGoals = dynamic(() => import('@/components/SavingsGoals'), { ssr: false })
const SalaryCalculator = dynamic(() => import('@/components/SalaryCalculator'), { ssr: false })
const FixedCosts = dynamic(() => import('@/components/FixedCosts'), { ssr: false })
const DeepDive = dynamic(() => import('@/components/DeepDive'), { ssr: false })

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
      <main className="lg:ml-64 pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          <ErrorBoundary>{renderContent()}</ErrorBoundary>
        </div>
      </main>
    </div>
  )
}
