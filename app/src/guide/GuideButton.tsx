import { lazy, Suspense, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useI18n } from '@/i18n/useI18n';

const GuideModal = lazy(() => import('./GuideModal').then((m) => ({ default: m.GuideModal })));

export function GuideButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const label = t('guide.button.tooltip');
  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
      >
        <BookOpen className="h-4 w-4" />
      </button>
      {open && (
        <Suspense fallback={null}>
          <GuideModal open={open} onOpenChange={setOpen} />
        </Suspense>
      )}
    </>
  );
}
