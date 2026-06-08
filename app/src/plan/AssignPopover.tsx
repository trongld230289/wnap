import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd, parseVnd } from '../budget/format';
import { AUTO_KINDS, computeProposals } from '../budget/autoAssign';
import type { AutoKind } from '../budget/autoAssign';
import type { Proposal } from '../engine';

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '7px 9px', margin: '3px 0', border: '1px solid #d7d7db', borderRadius: 8 };

export function AssignPopover({ onClose }: { onClose: () => void }) {
  const { rows, rta, summaries, viewMonth, firstMonth, categoryName, applyProposals, setAssigned } = useBudget();
  const [tab, setTab] = useState<'auto' | 'manual'>('auto');
  const [preview, setPreview] = useState<{ kind: AutoKind; proposals: Proposal[] } | null>(null);
  const [manualCat, setManualCat] = useState(rows[0]?.categoryId ?? '');
  const [manualAmt, setManualAmt] = useState('');

  const ctx = { rows, rta, summaries, month: viewMonth, firstMonth };
  const tabStyle = (on: boolean): React.CSSProperties => ({ padding: '6px 12px', borderRadius: 8, border: 0, cursor: 'pointer', background: on ? '#1f9d55' : '#f1f1f3', color: on ? '#fff' : '#777' });

  async function applyAuto() {
    if (preview) { await applyProposals(preview.proposals); onClose(); }
  }
  async function applyManual() {
    const amt = parseVnd(manualAmt);
    if (amt === 0 || !manualCat) return;
    const cur = rows.find((r) => r.categoryId === manualCat)?.assigned ?? 0;
    await setAssigned(manualCat, cur + amt);
    onClose();
  }

  return (
    <Modal title={`Phân bổ · RTA ${formatVnd(rta)}₫`} onClose={onClose}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button style={tabStyle(tab === 'auto')} onClick={() => setTab('auto')}>Auto</button>
        <button style={tabStyle(tab === 'manual')} onClick={() => setTab('manual')}>Manual</button>
      </div>
      {tab === 'auto' ? (
        <div>
          {AUTO_KINDS.map((k) => (
            <button key={k.id} onClick={() => setPreview({ kind: k.id, proposals: computeProposals(k.id, ctx) })}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 9px', margin: '3px 0', borderRadius: 8, background: '#fff', cursor: 'pointer', border: preview?.kind === k.id ? '1px solid #2b6cb0' : '1px solid #e3e3e6' }}>
              {k.label}
            </button>
          ))}
          {preview && (
            <div style={{ marginTop: 10, background: '#f0f7f1', borderRadius: 8, padding: 10, fontSize: 13 }}>
              {preview.proposals.length === 0 ? 'Không có thay đổi.' : (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {preview.proposals.map((p) => (
                    <li key={p.categoryId}>{categoryName(p.categoryId)} → {formatVnd(p.newAssigned)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button onClick={applyAuto} disabled={!preview || preview.proposals.length === 0}
            style={{ marginTop: 12, width: '100%', background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>
            Áp đề xuất
          </button>
        </div>
      ) : (
        <div>
          <label style={{ fontSize: 11, color: '#999' }}>Category</label>
          <select style={inp} value={manualCat} onChange={(e) => setManualCat(e.target.value)}>
            {rows.map((r) => <option key={r.categoryId} value={r.categoryId}>{categoryName(r.categoryId)}</option>)}
          </select>
          <label style={{ fontSize: 11, color: '#999' }}>Cộng thêm vào Assigned</label>
          <input style={inp} value={manualAmt} onChange={(e) => setManualAmt(e.target.value)} placeholder="vd 500.000" />
          <button onClick={applyManual} style={{ marginTop: 12, width: '100%', background: '#1f9d55', color: '#fff', border: 0, borderRadius: 8, padding: '9px' }}>Phân bổ</button>
        </div>
      )}
    </Modal>
  );
}
