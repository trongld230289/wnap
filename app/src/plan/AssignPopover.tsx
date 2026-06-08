import { useState } from 'react';
import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd, parseVnd } from '../budget/format';
import { AUTO_KINDS, computeProposals } from '../budget/autoAssign';
import type { AutoKind } from '../budget/autoAssign';
import type { Proposal } from '../engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function AssignPopover({ onClose }: { onClose: () => void }) {
  const { rows, rta, summaries, viewMonth, firstMonth, categoryName, applyProposals, setAssigned } = useBudget();
  const [tab, setTab] = useState<'auto' | 'manual'>('auto');
  const [preview, setPreview] = useState<{ kind: AutoKind; proposals: Proposal[] } | null>(null);
  const [manualCat, setManualCat] = useState(rows[0]?.categoryId ?? '');
  const [manualAmt, setManualAmt] = useState('');

  const ctx = { rows, rta, summaries, month: viewMonth, firstMonth };

  async function applyAuto() { if (preview) { await applyProposals(preview.proposals); onClose(); } }
  async function applyManual() {
    const amt = parseVnd(manualAmt);
    if (amt === 0 || !manualCat) return;
    const cur = rows.find((r) => r.categoryId === manualCat)?.assigned ?? 0;
    await setAssigned(manualCat, cur + amt);
    onClose();
  }

  return (
    <Modal title={`Phân bổ · RTA ${formatVnd(rta)}₫`} onClose={onClose}>
      <div className="mb-3 flex gap-1">
        <Button size="sm" variant={tab === 'auto' ? 'default' : 'secondary'} onClick={() => setTab('auto')}>Auto</Button>
        <Button size="sm" variant={tab === 'manual' ? 'default' : 'secondary'} onClick={() => setTab('manual')}>Manual</Button>
      </div>
      {tab === 'auto' ? (
        <div className="space-y-1">
          {AUTO_KINDS.map((k) => (
            <button key={k.id} onClick={() => setPreview({ kind: k.id, proposals: computeProposals(k.id, ctx) })}
              className={cn('block w-full rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent',
                preview?.kind === k.id ? 'border-primary' : 'border-border')}>
              {k.label}
            </button>
          ))}
          {preview && (
            <div className="mt-2 rounded-lg bg-accent p-2.5 text-sm text-accent-foreground">
              {preview.proposals.length === 0 ? 'Không có thay đổi.' : (
                <ul className="list-disc pl-5">
                  {preview.proposals.map((p) => <li key={p.categoryId}>{categoryName(p.categoryId)} → <span className="tabular-nums">{formatVnd(p.newAssigned)}</span></li>)}
                </ul>
              )}
            </div>
          )}
          <Button className="mt-3 w-full" onClick={applyAuto} disabled={!preview || preview.proposals.length === 0}>Áp đề xuất</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={manualCat} onValueChange={setManualCat}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {rows.map((r) => <SelectItem key={r.categoryId} value={r.categoryId}>{categoryName(r.categoryId)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={manualAmt} onChange={(e) => setManualAmt(e.target.value)} placeholder="Cộng thêm vào Assigned (vd 500.000)" />
          <Button className="w-full" onClick={applyManual}>Phân bổ</Button>
        </div>
      )}
    </Modal>
  );
}
