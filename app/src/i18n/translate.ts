type Dict = Record<string, Record<string, string>>;

export function translate(
  dict: Dict,
  lang: string,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = dict[lang]?.[key] ?? dict.vi?.[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
