import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStatuses, getTerminalStatuses, getRejectedStatuses, getFunnelOrder,
  getStorageKey, resolveInitialAppMode, filterItemsForMode,
  STATUSES_JOBSEEKER, STATUSES_RECRUITER,
} from '../statuses';
import { sanitizeTrackerRecords } from '../sanitize';

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

  it('filterItemsForMode hides job-search applied rows from recruiter view', () => {
    const leaked = [
      { id: '1', name: 'Google', role: 'Engineer', status: 'applied', interviews: [] },
      { id: '2', name: 'Meta', role: 'PM', status: 'applied', interviews: [] },
      { id: '3', name: 'Alex', role: 'Engineer', status: 'applied', linkedinCandidate: 'https://li.com/a' },
    ];
    expect(filterItemsForMode(leaked, 'recruiter').map(c => c.id)).toEqual(['3']);
  });

  it('filterItemsForMode keeps only task-shaped records in tasks mode', () => {
    const mixed = [
      { id: '1', name: 'Task A', status: 'active', steps: [{ id: 's1', title: 'Step' }] },
      { id: '2', name: 'Job Co', status: 'applied', interviews: [] },
    ];
    expect(filterItemsForMode(mixed, 'tasks').map(t => t.id)).toEqual(['1']);
  });

  // A6: a minimal recruiter candidate with none of the shape-signalling fields
  // (linkedinCandidate/source/expectedSalary/currentRole) used to be silently
  // dropped by the heuristic. An explicit mode stamp is now authoritative.
  it('filterItemsForMode trusts an explicit mode stamp over the shape heuristic', () => {
    const minimalCandidate = { id: '1', name: 'Alex', role: 'Engineer', status: 'applied', mode: 'recruiter' };
    expect(filterItemsForMode([minimalCandidate], 'recruiter').map(c => c.id)).toEqual(['1']);
    expect(filterItemsForMode([minimalCandidate], 'jobseeker')).toEqual([]);

    const minimalCompany = { id: '2', name: 'Acme', role: 'Engineer', status: 'applied', mode: 'jobseeker' };
    expect(filterItemsForMode([minimalCompany], 'jobseeker').map(c => c.id)).toEqual(['2']);
    expect(filterItemsForMode([minimalCompany], 'recruiter')).toEqual([]);
  });

  it('filterItemsForMode falls back to the shape heuristic for un-stamped records', () => {
    const legacyMinimalCandidate = { id: '1', name: 'Alex', role: 'Engineer', status: 'applied' };
    // No mode stamp and no recruiter-shaped fields — same defect A6 originally described.
    expect(filterItemsForMode([legacyMinimalCandidate], 'recruiter')).toEqual([]);
  });

  it('sanitizeTrackerRecords stamps mode for un-stamped records but preserves an existing stamp', () => {
    const input = [
      { id: '1', name: 'Alex' }, // no mode - should get the batch default
      { id: '2', name: 'Sam', mode: 'jobseeker' }, // pre-stamped from a cross-mode import - preserved
    ];
    const sanitized = sanitizeTrackerRecords(input, { mode: 'recruiter' });
    expect(sanitized.find(r => r.id === '1').mode).toBe('recruiter');
    expect(sanitized.find(r => r.id === '2').mode).toBe('jobseeker');
  });
});
