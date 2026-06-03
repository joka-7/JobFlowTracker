import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStatuses, getTerminalStatuses, getRejectedStatuses, getFunnelOrder,
  getStorageKey, resolveInitialAppMode, filterItemsForMode,
  STATUSES_JOBSEEKER, STATUSES_RECRUITER,
} from '../statuses';

describe('statuses', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns correct status lists per mode', () => {
    expect(getStatuses('jobseeker')).toEqual(STATUSES_JOBSEEKER);
    expect(getStatuses('recruiter')).toEqual(STATUSES_RECRUITER);
    expect(getStatuses('recruiter')).toHaveLength(9);
  });

  it('returns mode-specific terminal and rejected statuses', () => {
    expect(getTerminalStatuses('recruiter')).toContain('offer_accepted');
    expect(getTerminalStatuses('recruiter')).not.toContain('ghosted');
    expect(getRejectedStatuses('recruiter')).toEqual(['rejected']);
    expect(getRejectedStatuses('jobseeker')).toContain('ghosted');
  });

  it('returns mode-specific funnel order', () => {
    expect(getFunnelOrder('recruiter')[0]).toBe('applied');
    expect(getFunnelOrder('recruiter')).toContain('screening');
    expect(getFunnelOrder('jobseeker')).toContain('hr_call');
  });

  it('returns mode-scoped storage keys', () => {
    expect(getStorageKey('recruiter')).toBe('jobTrackerAppV2Data_recruiter');
    expect(getStorageKey('jobseeker')).toBe('jobTrackerAppV2Data_jobseeker');
  });

  it('auto-migrates legacy localStorage data to jobseeker', () => {
    localStorage.setItem('jobTrackerAppV2Data', JSON.stringify([{ id: '1', name: 'Acme' }]));
    expect(resolveInitialAppMode()).toBe('jobseeker');
    expect(localStorage.getItem('appMode')).toBe('jobseeker');
  });

  it('returns null when no mode and no legacy data', () => {
    expect(resolveInitialAppMode()).toBeNull();
  });

  it('filterItemsForMode excludes jobseeker-only statuses from recruiter data', () => {
    const mixed = [
      { id: '1', name: 'Co', status: 'applied', linkedinCompany: 'https://li.co' },
      { id: '2', name: 'Co2', status: 'hr_call', linkedinCompany: 'https://li.co' },
      { id: '3', name: 'Cand', status: 'screening', linkedinCandidate: 'https://li.com/c' },
    ];
    const recruiter = filterItemsForMode(mixed, 'recruiter');
    expect(recruiter.map(c => c.id)).toEqual(['3']);
    const jobseeker = filterItemsForMode(mixed, 'jobseeker');
    expect(jobseeker.map(c => c.id)).toEqual(['1', '2']);
  });

  it('filterItemsForMode keeps only task-shaped records in tasks mode', () => {
    const mixed = [
      { id: '1', name: 'Task A', status: 'active', steps: [{ id: 's1', title: 'Step' }] },
      { id: '2', name: 'Job Co', status: 'applied', interviews: [] },
    ];
    expect(filterItemsForMode(mixed, 'tasks').map(t => t.id)).toEqual(['1']);
  });
});
