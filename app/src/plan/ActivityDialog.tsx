import { Modal } from './Modal';
import { useBudget } from '../budget/useBudget';
import { formatVnd } from '../budget/format';
import { useI18n } from '../i18n/useI18n';

export function ActivityDialog({ onClose }: { onClose: () => void }) {
  const { recentMoves, categoryName } = useBudget();
  const { t, lang } = useI18n();

  return (
    <Modal title={t('activity.title')} onClose={onClose}>
      {recentMoves.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('activity.empty')}</p>
      ) : (
        <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto">
          {recentMoves.map((m) => {
            const up = m.newValue >= (m.oldValue ?? 0);
            return (
              <li key={m.id} className="flex items-baseline justify-between gap-3 border-b py-1.5 text-sm last:border-0">
                <span className="min-w-0">
                  <span className="text-muted-foreground">{new Date(m.at).toLocaleTimeString(lang === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit' })} · </span>
                  <span className="font-medium">{m.userName}</span>
                  <span className="text-muted-foreground"> · {categoryName(m.categoryId)}</span>
                </span>
                <span className={`shrink-0 tabular-nums ${up ? 'text-status-green' : 'text-status-red'}`}>
                  {m.oldValue !== null ? `${formatVnd(m.oldValue)} → ` : ''}{formatVnd(m.newValue)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
