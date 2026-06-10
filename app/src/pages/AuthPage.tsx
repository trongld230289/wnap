import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../i18n/useI18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthPage() {
  const { t } = useI18n();
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
            <Input type="email" placeholder={t('auth.email')} value={email} required onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder={t('auth.password')} value={password} required minLength={6} onChange={(e) => setPassword(e.target.value)} />
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="mt-3 w-full text-sm text-muted-foreground hover:text-foreground">
            {mode === 'signin' ? t('auth.toSignUp') : t('auth.toSignIn')}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
