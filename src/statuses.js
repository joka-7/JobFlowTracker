export const STATUSES_JOBSEEKER = [
  { id: 'applied', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'hr_call', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'tech_interview', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'manager_interview', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'home_assignment', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'references', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'offer', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'frozen', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'rejected', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'ghosted', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { id: 'withdrawn', color: 'bg-stone-100 text-stone-700 border-stone-300' },
];

export const STATUSES_RECRUITER = [
  { id: 'applied', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'screening', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'phone_screen', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'technical', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'final_interview', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'offer_extended', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'offer_accepted', color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'rejected', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'withdrawn', color: 'bg-stone-100 text-stone-700 border-stone-300' },
];

export const getStatuses = (mode) =>
  mode === 'recruiter' ? STATUSES_RECRUITER : STATUSES_JOBSEEKER;

export const JOBSEEKER_TERMINAL_STATUSES = ['rejected', 'ghosted', 'withdrawn', 'offer'];
export const RECRUITER_TERMINAL_STATUSES = ['rejected', 'withdrawn', 'offer_accepted'];

export const getTerminalStatuses = (mode) =>
  mode === 'recruiter' ? RECRUITER_TERMINAL_STATUSES : JOBSEEKER_TERMINAL_STATUSES;

export const getRejectedStatuses = (mode) =>
  mode === 'recruiter' ? ['rejected'] : ['rejected', 'ghosted'];

export const INTERVIEW_TYPE_KEYS = [
  'Intro Call / HR',
  'Technical Interview',
  'Manager Interview',
  'Home Assignment / Task',
  'VP / CEO Interview',
  'References Check',
  'Salary Offer',
  'Other',
];

export const RECRUITER_FUNNEL_ORDER = [
  'applied', 'screening', 'phone_screen', 'technical', 'offer_extended',
];

export const JOBSEEKER_FUNNEL_ORDER = [
  'applied', 'hr_call', 'tech_interview', 'manager_interview', 'offer',
];

export const getFunnelOrder = (mode) =>
  mode === 'recruiter' ? RECRUITER_FUNNEL_ORDER : JOBSEEKER_FUNNEL_ORDER;

export const getCollectionName = (mode) =>
  mode === 'recruiter' ? 'candidates' : 'companies';

export const getStorageKey = (mode) =>
  `jobTrackerAppV2Data_${mode}`;

export function resolveInitialAppMode() {
  const stored = localStorage.getItem('appMode');
  if (stored === 'jobseeker' || stored === 'recruiter') return stored;

  const legacyKeys = ['jobTrackerAppV2Data', 'jobTrackerV3Data', 'jobTrackerData'];
  for (const key of legacyKeys) {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localStorage.setItem('appMode', 'jobseeker');
          if (!localStorage.getItem(getStorageKey('jobseeker'))) {
            localStorage.setItem(getStorageKey('jobseeker'), saved);
          }
          return 'jobseeker';
        }
      } catch { /* ignore */ }
    }
  }
  return null;
}
