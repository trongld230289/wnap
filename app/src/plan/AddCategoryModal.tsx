import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '../i18n/useI18n';

export function AddCategoryModal({ onClose }: { onClose: () => void }) {
  const { groups, addCategory } = useBudget();
  const { t } = useI18n();
  const userGroups = groups.filter((g) => !g.isSystem);
  const [groupId, setGroupId] = useState(userGroups[0]?.id ?? '');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) { setError(t('plan.errCategoryName')); return; }
    if (!groupId) { setError(t('plan.errPickGroup')); return; }
    await addCategory(groupId, trimmed, 'need');
    onClose();
  }

  return (
    <Modal title={t('plan.newCategory')} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground">{t('plan.pickGroup')}</Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {userGroups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{t('plan.categoryName')}</Label>
          <Input
            autoFocus
            value={name}
            placeholder={t('plan.categoryPlaceholder')}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="w-full" onClick={submit}>{t('plan.create')}</Button>
      </div>
    </Modal>
  );
}
