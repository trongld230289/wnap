import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <div style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h1>WNAP</h1>
      <form onSubmit={submit}>
        <input
          type="email" placeholder="Email" value={email} required
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 8 }}
        />
        <input
          type="password" placeholder="Mật khẩu (≥6 ký tự)" value={password} required minLength={6}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', width: '100%', marginBottom: 8 }}
        />
        <button type="submit" disabled={busy}>
          {mode === 'signin' ? 'Đăng nhập' : 'Đăng ký'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        {mode === 'signin' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>
    </div>
  );
}
