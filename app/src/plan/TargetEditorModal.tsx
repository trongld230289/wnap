import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { parseVnd, formatVnd } from '../budget/format';
import type { TargetStrategy, TargetCadence } from '../engine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '../i18n/useI18n';

export function TargetEditorModal({ categoryId, onClose }: { categoryId: string; onClose: () => void }) {
  const { rows, categoryName, setTarget, removeTarget, setSnooze } = useBudget();
  const { t } = useI18n();
  const row = rows.find((r) => r.categoryId === categoryId)!;
  const tgt = row.target;
  const [strategy, setStrategy] = useState<TargetStrategy>(tgt?.strategy ?? 'set_aside');
  const [amount, setAmount] = useState(tgt ? formatVnd(tgt.amount) : '');
  const [cadence, setCadence] = useState<TargetCadence>(tgt?.cadence ?? 'monthly');
  const [dueDay, setDueDay] = useState(tgt?.dueDay != null ? String(tgt.dueDay) : '');
  const [dueWeekday, setDueWeekday] = useState(tgt?.dueWeekday != null ? String(tgt.dueWeekday) : '1');
  const [dueDate, setDueDate] = useState(tgt?.dueDate ?? '');
  const [error, setError] = useState('');

  const needsDate = strategy === 'have_balance' || cadence === 'yearly' || cadence === 'custom';
  const isWeekly = cadence === 'weekly';

  async function save() {
    const amt = parseVnd(amount);
    if (amt <= 0) { setError(t('target.errAmount')); return; }
    if (needsDate && !dueDate) { setError(t('target.errDate')); return; }
    await setTarget(categoryId, {
      strategy, amount: amt, cadence,
      dueDay: !needsDate && !isWeekly && dueDay ? Number(dueDay) : null,
      dueWeekday: isWeekly ? Number(dueWeekday) : null,
      dueDate: needsDate ? dueDate : null,
    });
    onClose();
  }

  const lbl = 'text-xs text-muted-foreground';
  return (
    <Modal title={t('target.title', { name: categoryName(categoryId) })} onClose={onClose}>
      <div className="space-y-2">
        <div><Label className={lbl}>{t('target.strategy')}</Label>
          <Select value={strategy} onValueChange={(v) => setStrategy(v as TargetStrategy)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="set_aside">{t('target.setAside')}</SelectItem>
              <SelectItem value="refill">{t('target.refill')}</SelectItem>
              <SelectItem value="have_balance">{t('target.haveBalance')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lbl}>{t('target.amount')}</Label>
          <Input inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} placeholder="vd 600.000" />
        </div>
        <div><Label className={lbl}>{t('target.cadence')}</Label>
          <Select value={cadence} onValueChange={(v) => setCadence(v as TargetCadence)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">{t('target.monthly')}</SelectItem>
              <SelectItem value="weekly">{t('target.weekly')}</SelectItem>
              <SelectItem value="yearly">{t('target.yearly')}</SelectItem>
              <SelectItem value="custom">{t('target.custom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isWeekly && (<div><Label className={lbl}>{t('target.weekday')}</Label>
          <Select value={dueWeekday} onValueChange={setDueWeekday}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{t('weekday.mon')}</SelectItem><SelectItem value="2">{t('weekday.tue')}</SelectItem><SelectItem value="3">{t('weekday.wed')}</SelectItem>
              <SelectItem value="4">{t('weekday.thu')}</SelectItem><SelectItem value="5">{t('weekday.fri')}</SelectItem><SelectItem value="6">{t('weekday.sat')}</SelectItem><SelectItem value="0">{t('weekday.sun')}</SelectItem>
            </SelectContent>
          </Select></div>)}
        {needsDate && (<div><Label className={lbl}>{t('target.deadline')}</Label>
          <Input type="date" value={dueDate} onChange={(e) => { setDueDate(e.target.value); setError(''); }} /></div>)}
        {!isWeekly && !needsDate && (<div><Label className={lbl}>{t('target.dueDay')}</Label>
          <Input value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="vd 15" /></div>)}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={save}>{t('target.save')}</Button>
          <Button variant="secondary" onClick={async () => { await setSnooze(categoryId, !row.snoozed); onClose(); }}>
            {row.snoozed ? t('target.unsnooze') : t('target.snooze')}
          </Button>
        </div>
        {row.target && <Button variant="ghost" className="w-full text-destructive" onClick={async () => { await removeTarget(categoryId); onClose(); }}>{t('target.remove')}</Button>}
      </div>
    </Modal>
  );
}
