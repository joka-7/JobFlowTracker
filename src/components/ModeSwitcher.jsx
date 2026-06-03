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
    <div
      className="flex items-center gap-0.5 bg-black/20 rounded-lg p-0.5 w-max max-w-full min-w-0"
      role="tablist"
      aria-label="App mode"
    >
      {MODES.map(({ id, Icon, labelKey, short }) => {
        const active = id === currentMode;
        const label = t(labelKey, short);
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => handleSwitch(id)}
            title={label}
            className={`flex shrink-0 items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-md text-xs font-bold transition-all min-h-[44px] touch-manipulation ${
              active
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25'
            }`}
          >
            <Icon size={14} className="shrink-0" aria-hidden />
            <span className="shrink-0 whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
