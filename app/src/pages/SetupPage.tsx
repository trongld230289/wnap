import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../i18n/useI18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SetupPage({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState('');
  const [budgetName, setBudgetName] = useState('Ngân sách gia đình');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  async function createBudget() {
    setError('');
    const { error } = await supabase.rpc('create_budget', { p_name: budgetName, p_display_name: displayName });
    if (error) setError(error.message); else onDone();
  }
  async function joinBudget() {
    setError('');
    const { error } = await supabase.rpc('join_budget', { p_code: code, p_display_name: displayName });
    if (error) setError(error.message); else onDone();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>{t('setup.title')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>{t('setup.displayName')}</Label>
            <Input value={displayName} required onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-semibold">{t('setup.createNew')}</Label>
            <Input value={budgetName} onChange={(e) => setBudgetName(e.target.value)} />
            <Button disabled={!displayName} onClick={createBudget} className="w-full">{t('setup.createBtn')}</Button>
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-semibold">{t('setup.orJoin')}</Label>
            <Input placeholder={t('setup.codePlaceholder')} value={code} onChange={(e) => setCode(e.target.value)} />
            <Button variant="secondary" disabled={!displayName || !code} onClick={joinBudget} className="w-full">{t('setup.joinBtn')}</Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
