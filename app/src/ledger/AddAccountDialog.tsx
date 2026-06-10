import { useState } from 'react';
import { useBudget } from '../budget/useBudget';
import type { AccountType } from '../lib/mappers';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AddAccountDialog() {
  const { addAccount } = useBudget();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [error, setError] = useState('');

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) { setName(''); setType('cash'); setError(''); }
  }

  async function save() {
    if (!name.trim()) { setError('Nhập tên tài khoản'); return; }
    await addAccount(name.trim(), type);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="mt-3 px-2 text-sm text-primary hover:underline">＋ Thêm tài khoản</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Thêm tài khoản</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Tên tài khoản</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="vd Ví tiền mặt, Vietcombank"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Loại</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tiền mặt (Cash)</SelectItem>
                <SelectItem value="savings">Tiết kiệm (Savings)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
          <Button onClick={save}>Thêm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
