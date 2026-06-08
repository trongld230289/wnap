import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SetupPage({ onDone }: { onDone: () => void }) {
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
        <CardHeader><CardTitle>Thiết lập WNAP</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Tên hiển thị của bạn</Label>
            <Input value={displayName} required onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-semibold">Tạo budget mới</Label>
            <Input value={budgetName} onChange={(e) => setBudgetName(e.target.value)} />
            <Button disabled={!displayName} onClick={createBudget} className="w-full">Tạo budget</Button>
          </div>
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-semibold">Hoặc join bằng invite code</Label>
            <Input placeholder="Mã 6 ký tự" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button variant="secondary" disabled={!displayName || !code} onClick={joinBudget} className="w-full">Join budget</Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
