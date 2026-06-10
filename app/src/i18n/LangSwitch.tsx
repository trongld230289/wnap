import { useI18n } from './useI18n';

function FlagVN() {
  return (
    <svg viewBox="0 0 30 20" className="h-full w-full object-cover" aria-hidden>
      <rect width="30" height="20" fill="#da251d" />
      <path fill="#ff0" d="M15 4l1.76 5.42h5.7l-4.61 3.35 1.76 5.42L15 14.84l-4.61 3.35 1.76-5.42-4.61-3.35h5.7z" />
    </svg>
  );
}

function FlagGB() {
  return (
    <svg viewBox="0 0 60 30" className="h-full w-full object-cover" aria-hidden>
      <clipPath id="gb-c"><rect width="60" height="30" /></clipPath>
      <g clipPath="url(#gb-c)">
        <rect width="60" height="30" fill="#012169" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#fff" strokeWidth="6" />
        <path d="M0,0 60,30 M60,0 0,30" stroke="#C8102E" strokeWidth="4" />
        <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
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
      className="size-7 shrink-0 overflow-hidden rounded-full border transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {lang === 'vi' ? <FlagVN /> : <FlagGB />}
    </button>
  );
}
