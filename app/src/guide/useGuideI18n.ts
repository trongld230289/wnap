import { useI18n } from '@/i18n/useI18n';
import { guideDict, type GuideTKey } from './guideDict';

type GuideDictBlock = Record<GuideTKey, string>;

export function useGuideI18n() {
  const { lang } = useI18n();
  const block = (guideDict[lang] ?? guideDict.vi) as GuideDictBlock;
  const fallback = guideDict.vi as GuideDictBlock;
  const t = (key: GuideTKey): string => block[key] ?? fallback[key] ?? key;
  return { lang, t };
}
