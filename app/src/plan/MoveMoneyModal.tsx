import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd, parseVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function MoveMoneyModal({ fromId, onClose }: { fromId: string; onClose: () => void }) {
  const { rows, categoryName, moveMoney } = useBudget();
  const from = rows.find((r) => r.categoryId === fromId)!;
  const others = rows.filter((r) => r.categoryId !== fromId);
  const [toId, setToId] = useState(others[0]?.categoryId ?? '');
  const [amount, setAmount] = useState('');

  async function move() {
    const amt = parseVnd(amount);
    if (amt <= 0) { window.alert('Nhập số tiền > 0'); return; }
    if (!toId) { window.alert('Chọn category đích'); return; }
    await moveMoney(fromId, toId, amt);
    onClose();
  }

  return (
    <Modal title="Chuyển tiền" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Từ</Label>
          <div className="rounded-md border bg-muted px-3 py-2 text-sm">{categoryName(fromId)} — có <span className="tabular-nums">{formatVnd(from.available)}₫</span></div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Đến</Label>
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {others.map((r) => <SelectItem key={r.categoryId} value={r.categoryId}>{categoryName(r.categoryId)} ({formatVnd(r.available)}₫)</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Số tiền</Label>
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="vd 200.000" />
        </div>
        <Button className="w-full" onClick={move}>Chuyển</Button>
      </div>
    </Modal>
  );
}
