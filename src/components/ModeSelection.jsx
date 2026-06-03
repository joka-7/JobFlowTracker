import React from 'react';
import { Briefcase, Users, ClipboardList, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ModeSelection({ onSelect }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  const handleSelect = (mode) => {
    localStorage.setItem('appMode', mode);
    onSelect(mode);
  };

  const handleLangChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('appLanguage', lang);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-700 to-indigo-900 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
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
          <button
            onClick={() => handleSelect('jobseeker')}
            className="bg-white rounded-2xl p-6 text-left hover:shadow-2xl hover:scale-105 active:scale-95 active:shadow-md transition-all group"
          >
            <div className="bg-blue-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <Briefcase size={28} className="text-blue-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('recruiter.modeSelection.jobSeekerTitle')}</h2>
            <p className="text-sm text-gray-500">{t('recruiter.modeSelection.jobSeekerDesc')}</p>
          </button>

          <button
            onClick={() => handleSelect('recruiter')}
            className="bg-white rounded-2xl p-6 text-left hover:shadow-2xl hover:scale-105 active:scale-95 active:shadow-md transition-all group"
          >
            <div className="bg-yellow-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-colors">
              <Users size={28} className="text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('recruiter.modeSelection.recruiterTitle')}</h2>
            <p className="text-sm text-gray-500">{t('recruiter.modeSelection.recruiterDesc')}</p>
          </button>

          <button
            onClick={() => handleSelect('tasks')}
            className="bg-white rounded-2xl p-6 text-left hover:shadow-2xl hover:scale-105 transition-all group"
          >
            <div className="bg-emerald-100 w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
              <ClipboardList size={28} className="text-emerald-700" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('tasks.modeSelection.title')}</h2>
            <p className="text-sm text-gray-500">{t('tasks.modeSelection.desc')}</p>
          </button>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">{t('recruiter.modeSelection.fixedNote')}</p>
      </div>
    </div>
  );
}
