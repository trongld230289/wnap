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
import { DelightProvider } from './delight/useDelight';
import { DialogProvider } from './components/feedback/DialogProvider';
import { UserMenu } from './budget/UserMenu';
import { I18nProvider, useI18n } from './i18n/useI18n';
import { LangSwitch } from './i18n/LangSwitch';

interface Membership { budget_id: string; budget_name: string; display_name: string; }

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

function AppInner() {
  const { t } = useI18n();
  const { session, loading } = useSession();
  const [budget, setBudget] = useState<Membership | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<AppTab>('plan');

  const loadBudget = useCallback(async () => {
    if (!session) return;
    setChecking(true);
    const { data } = await supabase
      .from('budget_members')
      .select('budget_id, display_name, budgets(name)')
      .eq('user_id', session.user.id)
      .limit(1)
      .maybeSingle();
    setBudget(
      data
        ? {
            budget_id: data.budget_id,
            budget_name: (data.budgets as unknown as { name: string }).name,
            display_name: (data.display_name as string) ?? 'Tôi',
          }
        : null,
    );
    setChecking(false);
  }, [session]);

  useEffect(() => {
    if (session) loadBudget();
    else { setBudget(null); setChecking(false); }
  }, [session, loadBudget]);

  if (loading || checking) return <p className="p-10 text-muted-foreground">{t('common.loading')}</p>;
  if (!session) return <AuthPage />;
  if (!budget) return <SetupPage onDone={loadBudget} />;
  return (
    <BudgetProvider budgetId={budget.budget_id}>
      <DelightProvider>
        <DialogProvider>
          <header className="mx-auto flex max-w-[980px] items-center justify-between gap-2 px-3 pt-3">
            <span className="text-lg font-bold text-primary">WNAP</span>
            <div className="flex items-center gap-2">
              <UserMenu
                displayName={budget.display_name}
                budgetName={budget.budget_name}
                budgetId={budget.budget_id}
              />
              <LangSwitch />
            </div>
          </header>
          <AppTabs tab={tab} onChange={setTab} />
          {tab === 'plan' ? <PlanScreen /> : <LedgerScreen />}
        </DialogProvider>
      </DelightProvider>
    </BudgetProvider>
  );
}
