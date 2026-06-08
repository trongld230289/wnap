import { useCallback, useEffect, useState } from 'react';
import { useSession } from './hooks/useSession';
import { supabase } from './lib/supabase';
import { AuthPage } from './pages/AuthPage';
import { SetupPage } from './pages/SetupPage';
import { BudgetHome } from './pages/BudgetHome';

interface Membership { budget_id: string; budget_name: string; }

export default function App() {
  const { session, loading } = useSession();
  const [budget, setBudget] = useState<Membership | null>(null);
  const [checking, setChecking] = useState(true);

  const loadBudget = useCallback(async () => {
    setChecking(true);
    const { data } = await supabase
      .from('budget_members')
      .select('budget_id, budgets(name)')
      .limit(1)
      .maybeSingle();
    setBudget(
      data ? { budget_id: data.budget_id, budget_name: (data.budgets as { name: string }).name } : null,
    );
    setChecking(false);
  }, []);

  useEffect(() => {
    if (session) loadBudget();
    else { setBudget(null); setChecking(false); }
  }, [session, loadBudget]);

  if (loading || checking) return <p>Đang tải…</p>;
  if (!session) return <AuthPage />;
  if (!budget) return <SetupPage onDone={loadBudget} />;
  return <BudgetHome budget={budget} />;
}
