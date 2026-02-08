-- =============================================
-- Budget Tool - Supabase Migration
-- Erstellt: 2026-02-08
-- Einfach im Supabase SQL Editor ausführen!
-- =============================================

-- Kategorien
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6B7280',
  monthly_budget NUMERIC(10,2) DEFAULT 0,
  type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income', 'both')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaktionen
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  recipient TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_income BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sparziele
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount NUMERIC(10,2) NOT NULL,
  current_amount NUMERIC(10,2) DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_income ON transactions(is_income);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- Default-Kategorien einfügen
INSERT INTO categories (name, icon, color, monthly_budget, type, sort_order) VALUES
  ('Miete', '🏠', '#EF4444', 0, 'expense', 1),
  ('Lebensmittel', '🛒', '#F59E0B', 300, 'expense', 2),
  ('Klamotten', '👕', '#8B5CF6', 200, 'expense', 3),
  ('Transport', '🚗', '#3B82F6', 100, 'expense', 4),
  ('Restaurants', '🍕', '#EC4899', 150, 'expense', 5),
  ('Abos & Subscriptions', '📱', '#6366F1', 100, 'expense', 6),
  ('Gesundheit', '💊', '#10B981', 50, 'expense', 7),
  ('Entertainment', '🎮', '#F97316', 100, 'expense', 8),
  ('Geschenke', '🎁', '#14B8A6', 50, 'expense', 9),
  ('Sonstiges', '📦', '#6B7280', 100, 'expense', 10),
  ('Gehalt', '💰', '#22C55E', 0, 'income', 11),
  ('Freelance', '💻', '#06B6D4', 0, 'income', 12),
  ('Sonstige Einnahmen', '📈', '#84CC16', 0, 'income', 13);

-- RLS deaktivieren (privates Tool, keine Auth)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- Offene Policies (kein Auth nötig)
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on savings_goals" ON savings_goals FOR ALL USING (true) WITH CHECK (true);
