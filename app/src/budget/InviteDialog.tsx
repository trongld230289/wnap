import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../i18n/useI18n';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function InviteDialog({
  budgetId, open, onOpenChange,
}: { budgetId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
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

  // Generate a fresh code each time the dialog opens.
  useEffect(() => {
    if (open) { setCode(''); generate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError(t('invite.copyErr'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('invite.title')}</DialogTitle>
          <DialogDescription>{t('invite.desc')}</DialogDescription>
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
              title={t('invite.copyHint')}
            >
              <span className="font-mono text-2xl font-bold tracking-[0.3em] tabular-nums">
                {loading ? '······' : code}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {copied ? <><CheckIcon className="size-4 text-status-green" /> {t('invite.copied')}</> : <><CopyIcon className="size-4" /> {t('invite.copy')}</>}
              </span>
            </button>
          )}

          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>{t('invite.step1')}</li>
            <li>{t('invite.step2')}</li>
            <li>{t('invite.step3')}</li>
          </ol>

          <Button variant="outline" className="w-full" onClick={generate} disabled={loading}>
            {t('invite.regen')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
