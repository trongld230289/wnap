import { useCallback, useEffect, useState } from 'react';
import { useSession } from './hooks/useSession';
import { supabase } from './lib/supabase';
import { AuthPage } from './pages/AuthPage';
import { SetupPage } from './pages/SetupPage';
import { BudgetProvider } from './budget/useBudget';
import { PlanScreen } from './plan/PlanScreen';
import { LedgerScreen } from './ledger/LedgerScreen';
import { AppTabs } from './nav/AppTabs';
import type { AppTab } from './nav/AppTabs';
import { Button } from '@/components/ui/button';
import { DelightProvider, useDelight } from './delight/useDelight';

interface Membership { budget_id: string; budget_name: string; }

export default function App() {
  const { session, loading } = useSession();
  const [budget, setBudget] = useState<Membership | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<AppTab>('plan');

  const loadBudget = useCallback(async () => {
    setChecking(true);
    const { data } = await supabase
      .from('budget_members')
      .select('budget_id, budgets(name)')
      .limit(1)
      .maybeSingle();
    setBudget(
      data ? { budget_id: data.budget_id, budget_name: (data.budgets as unknown as { name: string }).name } : null,
    );
    setChecking(false);
  }, []);

  useEffect(() => {
    if (session) loadBudget();
    else { setBudget(null); setChecking(false); }
  }, [session, loadBudget]);

  if (loading || checking) return <p className="p-10 text-muted-foreground">Đang tải…</p>;
  if (!session) return <AuthPage />;
  if (!budget) return <SetupPage onDone={loadBudget} />;
  return (
    <BudgetProvider budgetId={budget.budget_id}>
      <DelightProvider>
        <header className="mx-auto flex max-w-[980px] flex-wrap items-center justify-between gap-2 px-3 pt-3">
          <span className="text-lg font-bold text-primary">WNAP</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{budget.budget_name}</span>
            <MotionToggle />
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>Đăng xuất</Button>
          </div>
        </header>
        <AppTabs tab={tab} onChange={setTab} />
        {tab === 'plan' ? <PlanScreen /> : <LedgerScreen />}
      </DelightProvider>
    </BudgetProvider>
  );
}

function MotionToggle() {
  const { userEnabled, toggle } = useDelight();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      title={userEnabled ? 'Tắt hiệu ứng chuyển động' : 'Bật hiệu ứng chuyển động'}
      aria-pressed={userEnabled}
    >
      {userEnabled ? '✨ Hiệu ứng: Bật' : 'Hiệu ứng: Tắt'}
    </Button>
  );
}
