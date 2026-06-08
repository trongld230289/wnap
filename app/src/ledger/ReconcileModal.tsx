import { useState } from 'react';
import { Modal } from '../plan/Modal';
import { useBudget } from '../budget/useBudget';
import { balances } from './ledgerBalances';
import { formatVnd, parseVnd } from '../budget/format';

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '6px 0', border: '1px solid #d7d7db', borderRadius: 8 };

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
      <div style={{ fontSize: 13 }}>Cleared (theo app): <b>{formatVnd(cleared)}₫</b></div>
      <label style={{ fontSize: 11, color: '#999' }}>Số dư thực ở ngân hàng</label>
      <input style={inp} value={bank} onChange={(e) => setBank(e.target.value)} />
      <div style={{ fontSize: 13, color: diff === 0 ? '#1f9d55' : '#caa007' }}>
        Chênh lệch: {formatVnd(diff)}₫ {diff === 0 ? '✓ khớp' : '(kiểm tra lại giao dịch nếu cần)'}
      </div>
      <button onClick={confirm} style={{ marginTop: 12, width: '100%', background: '#2b6cb0', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Xác nhận đối soát (khóa cleared)</button>
    </Modal>
  );
}
