import React, { useState, useRef, useEffect } from 'react';
import { Briefcase, Users, ClipboardList, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MODES = [
  { id: 'jobseeker', Icon: Briefcase, labelKey: 'recruiter.modeSelection.jobSeekerTitle', short: 'Job Seeker' },
  { id: 'recruiter', Icon: Users, labelKey: 'recruiter.modeSelection.recruiterTitle', short: 'Recruiter' },
  { id: 'tasks', Icon: ClipboardList, labelKey: 'tasks.modeSelection.title', short: 'Tasks' },
];

export default function ModeDropdown({ currentMode, onModeChange, isRTL }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = MODES.find((m) => m.id === currentMode) ?? MODES[0];
  const { Icon: CurrentIcon } = current;
  const currentLabel = t(current.labelKey, current.short);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/35 text-white text-xs font-bold transition-colors min-h-[40px] touch-manipulation border border-white/20"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <CurrentIcon size={14} className="shrink-0" />
        <span className="shrink-0 whitespace-nowrap">{currentLabel}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full mt-1.5 ${isRTL ? 'right-0' : 'left-0'} bg-white rounded-xl shadow-xl border border-gray-100 z-50 min-w-[160px] py-1.5 overflow-hidden`}
            role="listbox"
          >
            {MODES.map(({ id, Icon, labelKey, short }) => {
              const isActive = id === currentMode;
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    localStorage.setItem('appMode', id);
                    onModeChange(id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'text-indigo-700 bg-indigo-50 font-bold'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
                  {t(labelKey, short)}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
