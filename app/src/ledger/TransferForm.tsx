import { useState } from 'react';
import { Modal } from '../plan/Modal';
import { useBudget } from '../budget/useBudget';
import { parseVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TransferForm({ fromId, onClose }: { fromId: string; onClose: () => void }) {
  const { accounts, accountName, addTransfer } = useBudget();
  const others = accounts.filter((a) => a.id !== fromId);
  const today = new Date().toISOString().slice(0, 10);
  const [toId, setToId] = useState(others[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');

  async function go() {
    const amt = parseVnd(amount);
    if (amt <= 0) { setError('Nhập số tiền > 0'); return; }
    if (!toId) { setError('Chọn tài khoản đích'); return; }
    await addTransfer(fromId, toId, amt, date);
    onClose();
  }

  return (
    <Modal title="Chuyển khoản giữa tài khoản" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">Từ</Label>
          <div className="rounded-md border bg-muted px-3 py-2 text-sm">{accountName(fromId)}</div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Đến</Label>
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {others.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Số tiền</Label>
          <Input value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); }} placeholder="vd 2.000.000" className="tabular-nums" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Ngày</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={go}>Chuyển</Button>
      </div>
    </Modal>
  );
}
