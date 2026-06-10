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
import { useI18n } from '../i18n/useI18n';

export function AddAccountDialog() {
  const { addAccount } = useBudget();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [error, setError] = useState('');

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) { setName(''); setType('cash'); setError(''); }
  }

  async function save() {
    if (!name.trim()) { setError(t('acct.errName')); return; }
    await addAccount(name.trim(), type);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="mt-3 px-2 text-sm text-primary hover:underline">{t('acct.add')}</button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('acct.addTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('acct.name')}</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder={t('acct.namePlaceholder')}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t('acct.type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('acct.typeCash')}</SelectItem>
                <SelectItem value="savings">{t('acct.typeSavings')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={save}>{t('common.add')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
