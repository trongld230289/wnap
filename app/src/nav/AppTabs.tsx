import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n/useI18n';

export type AppTab = 'plan' | 'ledger';

export function AppTabs({ tab, onChange }: { tab: AppTab; onChange: (t: AppTab) => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto mt-2 max-w-[980px] px-3">
      <Tabs value={tab} onValueChange={(v) => onChange(v as AppTab)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="plan" className="flex-1 sm:flex-none">{t('nav.plan')}</TabsTrigger>
          <TabsTrigger value="ledger" className="flex-1 sm:flex-none">{t('nav.ledger')}</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
