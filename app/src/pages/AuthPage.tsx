import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-primary">WNAP</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input type="email" placeholder="Email" value={email} required onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="Mật khẩu (≥6 ký tự)" value={password} required minLength={6} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === 'signin' ? 'Đăng nhập' : 'Đăng ký'}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === 'signin' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
