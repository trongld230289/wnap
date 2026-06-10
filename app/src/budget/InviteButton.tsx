import { useState } from 'react';
import { CheckIcon, CopyIcon, UserPlusIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function InviteButton({ budgetId }: { budgetId: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError('');
    setCopied(false);
    const { data, error } = await supabase.rpc('generate_invite', { p_budget: budgetId });
    setLoading(false);
    if (error) setError(error.message);
    else setCode(data as string);
  }

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) { setCode(''); generate(); }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Không copy được — hãy chép tay mã bên trên.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <UserPlusIcon className="size-4" /> Mời
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mời thành viên</DialogTitle>
          <DialogDescription>
            Gửi mã này cho người nhà. Mỗi mã dùng <strong>một lần</strong> cho một người.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <button
              type="button"
              onClick={copy}
              disabled={!code}
              className="flex w-full items-center justify-between rounded-lg border-2 border-dashed bg-muted/50 px-4 py-3 transition-colors hover:bg-muted disabled:opacity-60"
              title="Bấm để copy"
            >
              <span className="font-mono text-2xl font-bold tracking-[0.3em] tabular-nums">
                {loading ? '······' : code}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {copied ? <><CheckIcon className="size-4 text-status-green" /> Đã chép</> : <><CopyIcon className="size-4" /> Copy</>}
              </span>
            </button>
          )}

          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Người nhà mở app, đăng ký tài khoản.</li>
            <li>Ở màn thiết lập, nhập mã vào ô <em>"join bằng invite code"</em>.</li>
            <li>Bấm <em>Join budget</em> là vào chung ngân sách.</li>
          </ol>

          <Button variant="outline" className="w-full" onClick={generate} disabled={loading}>
            Tạo mã khác
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
