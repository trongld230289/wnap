import { useState } from 'react';
import { Modal } from '../plan/Modal';
import { useBudget } from '../budget/useBudget';
import { balances } from './ledgerBalances';
import { formatVnd, parseVnd } from '../budget/format';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function ReconcileModal({ accountId, onClose }: { accountId: string; onClose: () => void }) {
  const { transactions, accountName, reconcileAccount } = useBudget();
  const cleared = balances(transactions.filter((t) => t.accountId === accountId)).cleared;
  const [bank, setBank] = useState(formatVnd(cleared));
  const diff = parseVnd(bank) - cleared;

  async function confirm() {
    await reconcileAccount(accountId);
    onClose();
  }

  return (
    <Modal title={`Đối soát · ${accountName(accountId)}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm">Cleared (theo app): <b className="tabular-nums">{formatVnd(cleared)}₫</b></div>
        <div>
          <Label className="text-xs text-muted-foreground">Số dư thực ở ngân hàng</Label>
          <Input value={bank} onChange={(e) => setBank(e.target.value)} className="tabular-nums" />
        </div>
        <div className={`text-sm ${diff === 0 ? 'text-status-green' : 'text-status-amber'}`}>
          Chênh lệch: <span className="tabular-nums">{formatVnd(diff)}₫</span> {diff === 0 ? '✓ khớp' : '(kiểm tra lại giao dịch nếu cần)'}
        </div>
        <Button className="w-full" onClick={confirm}>Xác nhận đối soát (khóa cleared)</Button>
      </div>
    </Modal>
  );
}
