import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function SetupPage({ onDone }: { onDone: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [budgetName, setBudgetName] = useState('Ngân sách gia đình');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function createBudget() {
    setError('');
    const { error } = await supabase.rpc('create_budget', {
      p_name: budgetName, p_display_name: displayName,
    });
    if (error) setError(error.message); else onDone();
  }

  async function joinBudget() {
    setError('');
    const { error } = await supabase.rpc('join_budget', {
      p_code: code, p_display_name: displayName,
    });
    if (error) setError(error.message); else onDone();
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2>Thiết lập WNAP</h2>
      <input placeholder="Tên hiển thị của bạn" value={displayName} required
        onChange={(e) => setDisplayName(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 16 }} />
      <h3>Tạo budget mới</h3>
      <input value={budgetName} onChange={(e) => setBudgetName(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 8 }} />
      <button disabled={!displayName} onClick={createBudget}>Tạo budget</button>
      <h3>Hoặc join bằng invite code</h3>
      <input placeholder="Mã 6 ký tự" value={code} onChange={(e) => setCode(e.target.value)}
        style={{ display: 'block', width: '100%', marginBottom: 8 }} />
      <button disabled={!displayName || !code} onClick={joinBudget}>Join budget</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
