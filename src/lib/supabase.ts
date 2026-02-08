import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Transaction = {
  id: string
  date: string
  amount: number
  description: string | null
  recipient: string | null
  category_id: string | null
  is_income: boolean
  notes: string | null
  created_at: string
  category?: Category
}

export type Category = {
  id: string
  name: string
  icon: string
  color: string
  monthly_budget: number
  type: 'expense' | 'income' | 'both'
  sort_order: number
  created_at: string
}

export type SavingsGoal = {
  id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  created_at: string
}
