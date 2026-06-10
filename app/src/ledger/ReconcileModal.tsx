import { useState } from 'react';
import { Modal } from '../plan/Modal';
import { useBudget } from '../budget/useBudget';
import { balances } from './ledgerBalances';
import { formatVnd, parseVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useI18n } from '../i18n/useI18n';

export function ReconcileModal({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const { transactions, accountName, reconcileAccount } = useBudget();
  const { t } = useI18n();
  const cleared = balances(transactions.filter((tx) => tx.accountId === accountId)).cleared;
  const [bank, setBank] = useState(formatVnd(cleared));
  const diff = parseVnd(bank) - cleared;

  async function confirm() {
    await reconcileAccount(accountId);
    onClose();
  }

  return (
    <Modal title={t('reconcile.title', { name: accountName(accountId) })} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm">{t('reconcile.clearedApp')}: <b className="tabular-nums">{formatVnd(cleared)}₫</b></div>
        <div>
          <Label className="text-xs text-muted-foreground">{t('reconcile.bankBalance')}</Label>
          <Input value={bank} onChange={(e) => setBank(e.target.value)} className="tabular-nums" />
        </div>
        <div className={`text-sm ${diff === 0 ? 'text-status-green' : 'text-status-amber'}`}>
          {t('reconcile.diff')}: <span className="tabular-nums">{formatVnd(diff)}₫</span> {diff === 0 ? t('reconcile.match') : t('reconcile.checkAgain')}
        </div>
        <Button className="w-full" onClick={confirm}>{t('reconcile.confirm')}</Button>
      </div>
    </Modal>
  );
}
