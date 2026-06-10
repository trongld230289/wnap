import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd, parseVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '../i18n/useI18n';

export function MoveMoneyModal({ fromId, onClose }: { fromId: string; onClose: () => void }) {
  const { rows, categoryName, moveMoney } = useBudget();
  const { t } = useI18n();
  const from = rows.find((r) => r.categoryId === fromId)!;
  const others = rows.filter((r) => r.categoryId !== fromId);
  const [toId, setToId] = useState(others[0]?.categoryId ?? '');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  async function move() {
    const amt = parseVnd(amount);
    if (amt <= 0) { setError(t('move.errAmount')); return; }
    if (!toId) { setError(t('move.errTo')); return; }
    await moveMoney(fromId, toId, amt);
    onClose();
  }

  return (
    <Modal title={t('move.title')} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">{t('move.from')}</Label>
          <div className="rounded-md border bg-muted px-3 py-2 text-sm">{categoryName(fromId)} — {t('move.has')} <span className="tabular-nums">{formatVnd(from.available)}₫</span></div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{t('move.to')}</Label>
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {others.map((r) => <SelectItem key={r.categoryId} value={r.categoryId}>{categoryName(r.categoryId)} ({formatVnd(r.available)}₫)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{t('move.amount')}</Label>
          <Input inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} placeholder="vd 200.000" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={move}>{t('move.submit')}</Button>
      </div>
    </Modal>
  );
}
