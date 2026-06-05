import React, { useState } from 'react';
import { Briefcase, Users, ClipboardList, Languages, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { APP_MODES, STORAGE_KEYS } from '../storageKeys';

const MODE_DEFS = [
  {
    id: APP_MODES.jobseeker,
    Icon: Briefcase,
    titleKey: 'recruiter.modeSelection.jobSeekerTitle',
    descKey: 'recruiter.modeSelection.jobSeekerDesc',
    iconBg: 'bg-blue-100',
    iconBgHover: 'group-hover:bg-blue-200',
    iconColor: 'text-blue-700',
    ringColor: 'ring-blue-400',
  },
  {
    id: APP_MODES.recruiter,
    Icon: Users,
    titleKey: 'recruiter.modeSelection.recruiterTitle',
    descKey: 'recruiter.modeSelection.recruiterDesc',
    iconBg: 'bg-yellow-100',
    iconBgHover: 'group-hover:bg-yellow-200',
    iconColor: 'text-yellow-600',
    ringColor: 'ring-yellow-400',
  },
  {
    id: APP_MODES.tasks,
    Icon: ClipboardList,
    titleKey: 'tasks.modeSelection.title',
    descKey: 'tasks.modeSelection.desc',
    iconBg: 'bg-emerald-100',
    iconBgHover: 'group-hover:bg-emerald-200',
    iconColor: 'text-emerald-700',
    ringColor: 'ring-emerald-400',
  },
];

export default function ModeSelection({ onSelect }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  const [selected, setSelected] = useState(new Set());

  const toggleMode = (modeId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(modeId)) next.delete(modeId);
      else next.add(modeId);
      return next;
    });
  };

  const handleStart = () => {
    if (selected.size === 0) return;
    const enabledArr = MODE_DEFS.map((m) => m.id).filter((id) => selected.has(id));
    const firstMode = enabledArr[0];
    localStorage.setItem(STORAGE_KEYS.enabledModes, JSON.stringify(enabledArr));
    localStorage.setItem(STORAGE_KEYS.appMode, firstMode);
    onSelect(firstMode);
  };

  const handleLangChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('appLanguage', lang);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="max-w-2xl w-full">
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-1 bg-white/20 rounded-lg p-0.5">
            <Languages size={14} className="text-white/70 mx-1" />
            {[['en', 'EN'], ['he', 'עב'], ['fr', 'FR']].map(([code, label]) => (
              <button
                key={code}
                onClick={() => handleLangChange(code)}
                className={`px-3 py-2 rounded-md text-sm font-bold transition-all min-h-[44px] min-w-[44px] ${
                  i18n.language === code
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/20 active:bg-white/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-white mb-8">
          <h1 className="text-3xl font-black mb-2">{t('recruiter.modeSelection.title')}</h1>
          <p className="text-blue-200">{t('recruiter.modeSelection.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MODE_DEFS.map(({ id, Icon, titleKey, descKey, iconBg, iconBgHover, iconColor, ringColor }) => {
            const isActive = selected.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleMode(id)}
                className={`relative bg-white rounded-2xl p-6 text-left transition-all group ${
                  isActive
                    ? `ring-4 ${ringColor} shadow-2xl scale-105`
                    : 'hover:shadow-xl hover:scale-[1.02] active:scale-95 opacity-80 hover:opacity-100'
                }`}
              >
                {isActive && (
                  <div className="absolute top-3 right-3 bg-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow">
                    <Check size={14} />
                  </div>
                )}
                <div
                  className={`${iconBg} ${isActive ? '' : iconBgHover} w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors`}
                >
                  <Icon size={28} className={iconColor} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{t(titleKey)}</h2>
                <p className="text-sm text-gray-500">{t(descKey)}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={handleStart}
            disabled={selected.size === 0}
            className={`px-10 py-4 rounded-2xl font-bold text-lg transition-all ${
              selected.size > 0
                ? 'bg-white text-indigo-700 hover:bg-blue-50 shadow-lg hover:shadow-xl active:scale-95'
                : 'bg-white/25 text-white/40 cursor-not-allowed'
            }`}
          >
            {t('recruiter.modeSelection.getStarted', 'Get Started')}
          </button>
          <p className="text-blue-300 text-xs text-center">{t('recruiter.modeSelection.fixedNote')}</p>
        </div>
      </div>
    </div>
  );
}
