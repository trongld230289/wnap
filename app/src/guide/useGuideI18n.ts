import { useI18n } from '@/i18n/useI18n';
import { guideDict, type GuideTKey } from './guideDict';

export function useGuideI18n() {
  const { lang } = useI18n();
  const t = (key: GuideTKey): string => guideDict[lang]?.[key] ?? guideDict.vi[key] ?? key;
  return { lang, t };
}
