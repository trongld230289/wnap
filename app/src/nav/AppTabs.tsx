import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type AppTab = 'plan' | 'ledger';

export function AppTabs({ tab, onChange }: { tab: AppTab; onChange: (t: AppTab) => void }) {
  return (
    <div className="mx-auto mt-2 max-w-[980px] px-3">
      <Tabs value={tab} onValueChange={(v) => onChange(v as AppTab)}>
        <TabsList>
          <TabsTrigger value="plan">Kế hoạch</TabsTrigger>
          <TabsTrigger value="ledger">Sổ giao dịch</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
