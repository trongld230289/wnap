import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

const TABLES = [
  'category_groups', 'categories', 'targets', 'target_snoozes',
  'assignments', 'transactions', 'accounts', 'payees',
] as const;

/**
 * Lắng nghe mọi thay đổi DB thuộc budget (8 bảng, filter budget_id) → gọi onChange.
 * onChange nên đã được debounce ở nơi gọi (BudgetProvider) để gộp event.
 */
export function useRealtime(budgetId: string, onChange: () => void): void {
  useEffect(() => {
    const channel = supabase.channel(`budget:${budgetId}`);
    for (const table of TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `budget_id=eq.${budgetId}` },
        () => onChange(),
      );
    }
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [budgetId, onChange]);
}
