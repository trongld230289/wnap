import { createContext, useContext, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ConfirmOpts = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};
type PromptOpts = {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
};
type NotifyOpts = { title: string; description?: string; okText?: string };

interface DialogApi {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  prompt: (o: PromptOpts) => Promise<string | null>;
  notify: (o: NotifyOpts) => Promise<void>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialogs must be used within <DialogProvider>');
  return ctx;
}

type State =
  | { kind: 'confirm'; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: 'prompt'; opts: PromptOpts; resolve: (v: string | null) => void }
  | { kind: 'notify'; opts: NotifyOpts; resolve: () => void }
  | null;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(null);
  const [value, setValue] = useState('');

  const api: DialogApi = {
    confirm: (opts) => new Promise((resolve) => setState({ kind: 'confirm', opts, resolve })),
    prompt: (opts) =>
      new Promise((resolve) => {
        setValue(opts.defaultValue ?? '');
        setState({ kind: 'prompt', opts, resolve });
      }),
    notify: (opts) => new Promise((resolve) => setState({ kind: 'notify', opts, resolve })),
  };

  function settle(result: boolean | string | null | void) {
    if (!state) return;
    if (state.kind === 'confirm') state.resolve(result as boolean);
    else if (state.kind === 'prompt') state.resolve(result as string | null);
    else state.resolve();
    setState(null);
  }

  // Cancel value when the dialog is dismissed (Esc / overlay / close button).
  function cancel() {
    if (!state) return;
    settle(state.kind === 'confirm' ? false : state.kind === 'prompt' ? null : undefined);
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Dialog open={state !== null} onOpenChange={(o) => { if (!o) cancel(); }}>
        {state && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{state.opts.title}</DialogTitle>
              {state.opts.description && <DialogDescription>{state.opts.description}</DialogDescription>}
            </DialogHeader>

            {state.kind === 'prompt' && (
              <form
                onSubmit={(e) => { e.preventDefault(); settle(value.trim() ? value.trim() : null); }}
                className="space-y-2"
              >
                {state.opts.label && <Label className="text-xs text-muted-foreground">{state.opts.label}</Label>}
                <Input
                  autoFocus
                  value={value}
                  placeholder={state.opts.placeholder}
                  onChange={(e) => setValue(e.target.value)}
                />
              </form>
            )}

            <DialogFooter>
              {state.kind !== 'notify' && (
                <Button variant="outline" onClick={cancel}>
                  {state.kind === 'confirm' ? (state.opts.cancelText ?? 'Hủy') : 'Hủy'}
                </Button>
              )}
              <Button
                variant={state.kind === 'confirm' && state.opts.destructive ? 'destructive' : 'default'}
                onClick={() => {
                  if (state.kind === 'confirm') settle(true);
                  else if (state.kind === 'prompt') settle(value.trim() ? value.trim() : null);
                  else settle();
                }}
              >
                {state.kind === 'confirm'
                  ? (state.opts.confirmText ?? 'Đồng ý')
                  : state.kind === 'prompt'
                    ? (state.opts.confirmText ?? 'Lưu')
                    : (state.opts.okText ?? 'OK')}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </DialogContext.Provider>
  );
}
