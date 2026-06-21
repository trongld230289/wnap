import { useState, useCallback } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { GuideSidebar, type SidebarSelection } from './GuideSidebar';
import { GuideContent } from './GuideContent';
import { USE_CASES } from './useCases';
import { useGuideI18n } from './useGuideI18n';

export function GuideModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const { t } = useGuideI18n();
  const [sel, setSel] = useState<SidebarSelection>({ kind: 'overview' });

  const handleLeafClick = useCallback((id: string) => {
    setSel({ kind: 'useCase', id });
  }, []);

  const currentCase =
    sel.kind === 'useCase' ? USE_CASES.find((u) => u.id === sel.id) : undefined;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-[1100px] h-[84vh] bg-background rounded-lg shadow-2xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <DialogPrimitive.Title className="text-lg font-bold">
              {t('guide.modal.title')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close className="p-1 rounded hover:bg-muted">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[260px_1fr] flex-1 min-h-0">
            <aside className="border-r overflow-y-auto">
              <GuideSidebar selection={sel} onSelect={setSel} />
            </aside>
            <main className="overflow-y-auto p-6">
              {sel.kind === 'overview' ? (
                <GuideContent kind="overview" onSelectLeaf={handleLeafClick} />
              ) : currentCase ? (
                <GuideContent kind="useCase" useCase={currentCase} />
              ) : null}
            </main>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
