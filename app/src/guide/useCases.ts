export type Phase = 'setup' | 'assign' | 'daily' | 'maint' | 'family' | 'extras';

export type UseCase = {
  id: string;
  phase: Phase;
  titleKey: string;
  stepKeys: string[];
  exampleKey: string;
  tipKeys: string[];
  refImage?: string;
};

export const PHASES: readonly Phase[] = ['setup', 'assign', 'daily', 'maint', 'family', 'extras'] as const;

const uc = (id: string, phase: Phase, nSteps: number, nTips: number, refImage?: string): UseCase => ({
  id,
  phase,
  titleKey: `guide.uc.${id}.title`,
  exampleKey: `guide.uc.${id}.example`,
  stepKeys: Array.from({ length: nSteps }, (_, i) => `guide.uc.${id}.step.${i + 1}`),
  tipKeys: Array.from({ length: nTips }, (_, i) => `guide.uc.${id}.tip.${i + 1}`),
  ...(refImage ? { refImage } : {}),
});

export const USE_CASES: readonly UseCase[] = [
  uc('design-categories',    'setup',  5, 2),
  uc('connect-accounts',     'setup',  4, 2),
  uc('payday-assign',        'assign', 5, 2, '/guide/Plan_overview.png'),
  uc('auto-assign',          'assign', 4, 2, '/guide/Targer-details.png'),
  uc('record-transaction',   'daily',  5, 2, '/guide/AddTransaction.png'),
  uc('overspend-roll',       'daily',  4, 2),
  uc('reconcile',            'maint',  5, 2),
  uc('use-together',         'family', 4, 2),
  uc('check-wallet',         'family', 3, 1),
  uc('snooze-target',        'extras', 4, 1, '/guide/Targer-details.png'),
  uc('move-money',           'extras', 4, 1, '/guide/Plan_clickACategory.png'),
  uc('invite-member',        'extras', 4, 2),
  uc('filter-cards',         'extras', 5, 2),
];
