import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { parseVnd, formatVnd } from '../budget/format';
import type { TargetStrategy, TargetCadence } from '../engine';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TargetEditorModal({ categoryId, onClose }: { categoryId: string; onClose: () => void }) {
  const { rows, categoryName, setTarget, removeTarget, setSnooze } = useBudget();
  const row = rows.find((r) => r.categoryId === categoryId)!;
  const t = row.target;
  const [strategy, setStrategy] = useState<TargetStrategy>(t?.strategy ?? 'set_aside');
  const [amount, setAmount] = useState(t ? formatVnd(t.amount) : '');
  const [cadence, setCadence] = useState<TargetCadence>(t?.cadence ?? 'monthly');
  const [dueDay, setDueDay] = useState(t?.dueDay != null ? String(t.dueDay) : '');
  const [dueWeekday, setDueWeekday] = useState(t?.dueWeekday != null ? String(t.dueWeekday) : '1');
  const [dueDate, setDueDate] = useState(t?.dueDate ?? '');

  const needsDate = strategy === 'have_balance' || cadence === 'yearly' || cadence === 'custom';
  const isWeekly = cadence === 'weekly';

  async function save() {
    const amt = parseVnd(amount);
    if (amt <= 0) { window.alert('Nhập số tiền > 0'); return; }
    if (needsDate && !dueDate) { window.alert('Chọn ngày hạn (deadline)'); return; }
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
    <Modal title={`Mục tiêu · ${categoryName(categoryId)}`} onClose={onClose}>
      <div className="space-y-2">
        <div><Label className={lbl}>Chiến lược</Label>
          <Select value={strategy} onValueChange={(v) => setStrategy(v as TargetStrategy)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="set_aside">Set aside (gom đều mỗi tháng)</SelectItem>
              <SelectItem value="refill">Refill up to (bơm đầy tới mức)</SelectItem>
              <SelectItem value="have_balance">Have balance by (đạt số dư trước hạn)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label className={lbl}>Số tiền</Label>
          <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 600.000" />
        </div>
        <div><Label className={lbl}>Chu kỳ</Label>
          <Select value={cadence} onValueChange={(v) => setCadence(v as TargetCadence)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Hằng tháng</SelectItem>
              <SelectItem value="weekly">Hằng tuần</SelectItem>
              <SelectItem value="yearly">Hằng năm</SelectItem>
              <SelectItem value="custom">Tùy chỉnh (theo hạn)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isWeekly && (<div><Label className={lbl}>Thứ trong tuần</Label>
          <Select value={dueWeekday} onValueChange={setDueWeekday}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Thứ 2</SelectItem><SelectItem value="2">Thứ 3</SelectItem><SelectItem value="3">Thứ 4</SelectItem>
              <SelectItem value="4">Thứ 5</SelectItem><SelectItem value="5">Thứ 6</SelectItem><SelectItem value="6">Thứ 7</SelectItem><SelectItem value="0">Chủ nhật</SelectItem>
            </SelectContent>
          </Select></div>)}
        {needsDate && (<div><Label className={lbl}>Hạn (deadline)</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>)}
        {!isWeekly && !needsDate && (<div><Label className={lbl}>Ngày đến hạn trong tháng (tùy chọn, 1–31)</Label>
          <Input value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="vd 15" /></div>)}
        <div className="flex gap-2 pt-2">
          <Button className="flex-1" onClick={save}>Lưu</Button>
          <Button variant="secondary" onClick={async () => { await setSnooze(categoryId, !row.snoozed); onClose(); }}>
            {row.snoozed ? 'Bỏ snooze' : '😴 Snooze'}
          </Button>
        </div>
        {t && <Button variant="ghost" className="w-full text-destructive" onClick={async () => { await removeTarget(categoryId); onClose(); }}>Xóa mục tiêu</Button>}
      </div>
    </Modal>
  );
}
