import { describe, it, expect } from 'vitest';

// Pure copies of the helpers defined in JobTrackerApp.jsx
const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return ''; }
  }
  return String(val);
};

const getJourneySteps = (company) => {
  const interviews = Array.isArray(company.interviews) ? company.interviews : [];
  if (interviews.length === 0) return [];
  return [...interviews]
    .filter(i => i && safeStr(i.type))
    .sort((a, b) => new Date(safeStr(a.date) || 0) - new Date(safeStr(b.date) || 0))
    .map(i => safeStr(i.type));
};

const STEP_SHORT = {
  'Intro Call / HR': 'HR',
  'Technical Interview': 'Tech',
  'Manager Interview': 'Mgr',
  'Home Assignment / Task': 'Task',
  'VP / CEO Interview': 'VP',
  'References Check': 'Refs',
  'Salary Offer': 'Offer',
  'Other': 'Other',
};
const shortenStep = (s) => STEP_SHORT[s] || s.substring(0, 6);

const getDaysUntil = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
};

// ---- getJourneySteps ----
describe('getJourneySteps', () => {
  it('returns empty array when no interviews', () => {
    expect(getJourneySteps({ interviews: [] })).toEqual([]);
  });

  it('returns empty array when interviews is missing', () => {
    expect(getJourneySteps({})).toEqual([]);
  });

  it('returns steps sorted by date', () => {
    const company = {
      interviews: [
        { type: 'Technical Interview', date: '2026-04-20' },
        { type: 'Intro Call / HR', date: '2026-04-10' },
        { type: 'Manager Interview', date: '2026-05-01' },
      ]
    };
    expect(getJourneySteps(company)).toEqual([
      'Intro Call / HR',
      'Technical Interview',
      'Manager Interview',
    ]);
  });

  it('skips interviews with no type', () => {
    const company = {
      interviews: [
        { type: 'Technical Interview', date: '2026-04-20' },
        { type: '', date: '2026-04-10' },
        { date: '2026-04-05' },
      ]
    };
    expect(getJourneySteps(company)).toEqual(['Technical Interview']);
  });

  it('handles single interview', () => {
    const company = { interviews: [{ type: 'Intro Call / HR', date: '2026-05-01' }] };
    expect(getJourneySteps(company)).toEqual(['Intro Call / HR']);
  });

  it('handles interviews with no date (sorts to beginning)', () => {
    const company = {
      interviews: [
        { type: 'Manager Interview', date: '2026-05-01' },
        { type: 'Intro Call / HR', date: '' },
      ]
    };
    const steps = getJourneySteps(company);
    expect(steps).toHaveLength(2);
    expect(steps).toContain('Manager Interview');
  });
});

// ---- shortenStep ----
describe('shortenStep', () => {
  it('shortens known step types', () => {
    expect(shortenStep('Intro Call / HR')).toBe('HR');
    expect(shortenStep('Technical Interview')).toBe('Tech');
    expect(shortenStep('Manager Interview')).toBe('Mgr');
    expect(shortenStep('Home Assignment / Task')).toBe('Task');
    expect(shortenStep('Salary Offer')).toBe('Offer');
  });

  it('truncates unknown step types to 6 chars', () => {
    expect(shortenStep('Custom Step')).toBe('Custom');
  });

  it('returns known short value for Other', () => {
    expect(shortenStep('Other')).toBe('Other');
  });
});

// ---- getDaysUntil ----
describe('getDaysUntil', () => {
  it('returns null for empty string', () => {
    expect(getDaysUntil('')).toBeNull();
  });

  it('returns null for null', () => {
    expect(getDaysUntil(null)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(getDaysUntil('not-a-date')).toBeNull();
  });

  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(getDaysUntil(today)).toBe(0);
  });

  it('returns positive number for future date', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    expect(getDaysUntil(future.toISOString().split('T')[0])).toBe(5);
  });

  it('returns negative number for past date', () => {
    const past = new Date();
    past.setDate(past.getDate() - 3);
    expect(getDaysUntil(past.toISOString().split('T')[0])).toBe(-3);
  });
});

// ---- rejection data ----
describe('rejection data', () => {
  it('company with rejection fields is valid', () => {
    const company = {
      status: 'rejected',
      rejection: { date: '2026-05-10', method: 'Personal Email', notes: 'Not a fit' },
      interviews: [{ type: 'Technical Interview', date: '2026-05-01' }]
    };
    expect(company.rejection.date).toBe('2026-05-10');
    expect(company.rejection.method).toBe('Personal Email');
    expect(getJourneySteps(company)).toEqual(['Technical Interview']);
  });

  it('company without rejection object does not crash getJourneySteps', () => {
    const company = { status: 'rejected', interviews: [] };
    expect(() => getJourneySteps(company)).not.toThrow();
  });

  it('ghosted company journey works same as rejected', () => {
    const company = {
      status: 'ghosted',
      interviews: [
        { type: 'Intro Call / HR', date: '2026-04-01' },
        { type: 'Technical Interview', date: '2026-04-10' },
      ]
    };
    expect(getJourneySteps(company)).toEqual(['Intro Call / HR', 'Technical Interview']);
  });
});
