import React from 'react';
import { Briefcase, Users, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MODES = [
  { id: 'jobseeker', Icon: Briefcase, labelKey: 'recruiter.modeSelection.jobSeekerTitle', short: 'Jobs' },
  { id: 'recruiter', Icon: Users, labelKey: 'recruiter.modeSelection.recruiterTitle', short: 'Recruit' },
  { id: 'tasks', Icon: ClipboardList, labelKey: 'tasks.modeSelection.title', short: 'Tasks' },
];

export default function ModeSwitcher({ currentMode, onModeChange }) {
  const { t } = useTranslation();

  const handleSwitch = (modeId) => {
    if (modeId === currentMode) return;
    localStorage.setItem('appMode', modeId);
    onModeChange(modeId);
  };

  return (
    <div className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5">
      {MODES.map(({ id, Icon, labelKey, short }) => {
        const active = id === currentMode;
        return (
          <button
            key={id}
            onClick={() => handleSwitch(id)}
            title={t(labelKey, short)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              active
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/15'
            }`}
          >
            <Icon size={13} />
            <span>{t(labelKey, short)}</span>
          </button>
        );
      })}
    </div>
  );
}
