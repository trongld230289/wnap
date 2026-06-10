import { useI18n } from './useI18n';

function FlagVN() {
  return (
    <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
      <rect width="32" height="32" fill="#da251d" />
      <path
        fill="#ff0"
        d="M16 7 L18.23 12.93 L24.56 13.22 L19.61 17.17 L21.29 23.28 L16 19.8 L10.71 23.28 L12.39 17.17 L7.44 13.22 L13.77 12.93 Z"
      />
    </svg>
  );
}

function FlagGB() {
  return (
    <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden>
      <rect width="32" height="32" fill="#012169" />
      {/* white diagonals */}
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#fff" strokeWidth="7" />
      {/* red diagonals */}
      <path d="M0,0 L32,32 M32,0 L0,32" stroke="#C8102E" strokeWidth="3.5" />
      {/* white cross */}
      <path d="M16,0 V32 M0,16 H32" stroke="#fff" strokeWidth="11" />
      {/* red cross */}
      <path d="M16,0 V32 M0,16 H32" stroke="#C8102E" strokeWidth="6.5" />
    </svg>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useI18n();
  const next = lang === 'vi' ? 'en' : 'vi';
  const label = next === 'en' ? 'Chuyển sang English' : 'Đổi sang Tiếng Việt';
  return (
    <button
      onClick={() => setLang(next)}
      title={label}
      aria-label={label}
      className="size-8 shrink-0 overflow-hidden rounded-full border border-border shadow-sm ring-1 ring-black/5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {lang === 'vi' ? <FlagVN /> : <FlagGB />}
    </button>
  );
}
