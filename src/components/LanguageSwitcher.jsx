import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'he', label: 'עברית' },
  { code: 'fr', label: 'Français' },
];

/**
 * Language <select>, copy-pasted 4x across JobTrackerApp/TasksApp (desktop
 * header pill + mobile overflow-menu row in each). `variant="mobile"` renders
 * the menu-row styling; the default renders the desktop pill.
 */
export default function LanguageSwitcher({ variant = 'desktop', onSelect, accentClassName = 'text-blue-100' }) {
  const { t, i18n } = useTranslation();

  const changeLanguage = (value) => {
    i18n.changeLanguage(value);
    localStorage.setItem('appLanguage', value);
    onSelect?.();
  };

  if (variant === 'mobile') {
    return (
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <Languages size={14} className="text-gray-400" />
          <select
            aria-label={t('header.language', 'Language')}
            value={i18n.language}
            onChange={e => changeLanguage(e.target.value)}
            className="text-gray-700 text-sm font-bold border-none outline-none cursor-pointer bg-transparent flex-1"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/10 border border-white/20">
      <Languages size={16} className={`${accentClassName} flex-shrink-0`} />
      <select
        aria-label={t('header.language', 'Language')}
        value={i18n.language}
        onChange={e => changeLanguage(e.target.value)}
        className={`bg-transparent ${accentClassName} text-sm font-bold border-none outline-none cursor-pointer`}
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code} className="text-gray-800">{l.label}</option>
        ))}
      </select>
    </div>
  );
}
