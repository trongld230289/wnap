import { useCallback, useEffect, useState } from 'react';
import { useSession } from './hooks/useSession';
import { supabase } from './lib/supabase';
import { AuthPage } from './pages/AuthPage';
import { SetupPage } from './pages/SetupPage';
import { BudgetProvider } from './budget/useBudget';
import { PlanScreen } from './plan/PlanScreen';

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
  return (
    <BudgetProvider budgetId={budget.budget_id}>
      <div style={{ textAlign: 'right', maxWidth: 820, margin: '8px auto 0', fontFamily: 'sans-serif' }}>
        <span style={{ color: '#777', fontSize: 13, marginRight: 8 }}>{budget.budget_name}</span>
        <button onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
      </div>
      <PlanScreen />
    </BudgetProvider>
  );
}
