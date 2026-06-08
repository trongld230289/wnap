import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Membership { budget_id: string; budget_name: string; }

export function BudgetHome({ budget }: { budget: Membership }) {
  const [members, setMembers] = useState<string[]>([]);
  const [invite, setInvite] = useState('');

  useEffect(() => {
    supabase.from('budget_members').select('display_name')
      .eq('budget_id', budget.budget_id)
      .then(({ data }) => setMembers((data ?? []).map((m) => m.display_name)));
  }, [budget.budget_id]);

  async function makeInvite() {
    const { data, error } = await supabase.rpc('generate_invite', { p_budget: budget.budget_id });
    setInvite(error ? error.message : (data as string));
  }

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h2>{budget.budget_name}</h2>
      <p>Thành viên: {members.join(', ')}</p>
      <button onClick={makeInvite}>Tạo invite code</button>
      {invite && <p>Code: <strong>{invite}</strong> (gửi cho vợ/chồng bạn)</p>}
      <button onClick={() => supabase.auth.signOut()}>Đăng xuất</button>
    </div>
  );
}
