import React from 'react';
import { Briefcase, Users, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getEnabledModes } from '../storageKeys';

const ALL_MODES = [
  { id: 'jobseeker', Icon: Briefcase, labelKey: 'recruiter.modeSelection.jobSeekerTitle', shortKey: 'recruiter.modeSelection.jobSeekerShort', short: 'Jobs' },
  { id: 'recruiter', Icon: Users, labelKey: 'recruiter.modeSelection.recruiterTitle', shortKey: 'recruiter.modeSelection.recruiterShort', short: 'Recruit' },
  { id: 'tasks', Icon: ClipboardList, labelKey: 'tasks.modeSelection.title', shortKey: 'tasks.modeSelection.short', short: 'Tasks' },
];

/** @param {'compact' | 'full'} labelSize — compact in desktop toolbar; full on mobile mode row */
export default function ModeSwitcher({ currentMode, onModeChange, labelSize = 'full' }) {
  const { t } = useTranslation();

  const enabledIds = getEnabledModes();
  const MODES = enabledIds ? ALL_MODES.filter((m) => enabledIds.includes(m.id)) : ALL_MODES;

  if (MODES.length <= 1) return null;

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
      {MODES.map(({ id, Icon, labelKey, shortKey, short }) => {
        const active = id === currentMode;
        const fullLabel = t(labelKey, short);
        const compactLabel = t(shortKey, short);
        const visibleLabel = labelSize === 'compact' ? compactLabel : fullLabel;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={fullLabel}
            onClick={() => handleSwitch(id)}
            title={fullLabel}
            className={`flex shrink-0 items-center justify-center gap-1 px-2 sm:px-3 py-2 rounded-md text-xs font-bold transition-all min-h-[44px] touch-manipulation ${
              active
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-white/90 hover:text-white hover:bg-white/15 active:bg-white/25'
            }`}
          >
            <Icon size={14} className="shrink-0" aria-hidden />
            <span className="shrink-0 whitespace-nowrap">{visibleLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
