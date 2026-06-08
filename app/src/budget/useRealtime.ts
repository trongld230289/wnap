import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Đồng bộ realtime qua Supabase Broadcast: trigger DB phát event 'db_change' tới topic
 * 'budget:<id>' mỗi khi 1 trong 8 bảng của budget thay đổi. Dùng **private channel** →
 * authorization bằng RLS trên realtime.messages (postgres_changes + RLS không gửi được
 * event nên đã chuyển sang broadcast). Mỗi broadcast → onChange (đã debounce ở BudgetProvider).
 */
export function useRealtime(budgetId: string, onChange: () => void): void {
  useEffect(() => {
    const channel = supabase.channel(`budget:${budgetId}`, { config: { private: true } });
    channel.on('broadcast', { event: 'db_change' }, () => onChange());
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      // Private channel cần token user để authorization (RLS realtime.messages).
      supabase.realtime.setAuth(data.session?.access_token);
      channel.subscribe();
    });
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [budgetId, onChange]);
}
