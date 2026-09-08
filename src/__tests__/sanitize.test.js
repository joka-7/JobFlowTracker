import { describe, it, expect } from 'vitest';
import { sanitizeTaskRecords } from '../sanitize';

describe('sanitizeTaskRecords', () => {
  it('defaults impact, urgency and type for a bare-minimum row', () => {
    const [task] = sanitizeTaskRecords([{ name: 'Fix the sink' }]);
    expect(task.impact).toBe('medium');
    expect(task.urgency).toBe('');
    expect(task.type).toBe('');
  });

  it('whitelists a valid impact, urgency and type', () => {
    const [task] = sanitizeTaskRecords([{ name: 'Call plumber', impact: 'high', urgency: 'today', type: 'call' }]);
    expect(task.impact).toBe('high');
    expect(task.urgency).toBe('today');
    expect(task.type).toBe('call');
  });

  it('rejects an unknown impact, urgency or type back to its default', () => {
    const [task] = sanitizeTaskRecords([{ name: 'X', impact: 'urgent!!', urgency: 'yesterday', type: 'teleport' }]);
    expect(task.impact).toBe('medium');
    expect(task.urgency).toBe('');
    expect(task.type).toBe('');
  });

  it('rejects the derive-only "overdue" urgency as a stored value', () => {
    const [task] = sanitizeTaskRecords([{ name: 'X', urgency: 'overdue' }]);
    expect(task.urgency).toBe('');
  });

  it('snaps an effort value to the nearest ladder tick', () => {
    const [task] = sanitizeTaskRecords([{ name: 'X', effort: { value: 3, unit: 'hour' } }]);
    expect(task.effort).toEqual({ value: 2, unit: 'hour' });
  });

  it('defaults effort to an empty tick when missing or malformed', () => {
    const [withNone] = sanitizeTaskRecords([{ name: 'X' }]);
    expect(withNone.effort).toEqual({ value: '', unit: 'hour' });
    const [withGarbage] = sanitizeTaskRecords([{ name: 'X', effort: 'not-an-object' }]);
    expect(withGarbage.effort).toEqual({ value: '', unit: 'hour' });
  });

  it('sanitizes due time to HH:MM or empty', () => {
    const [valid] = sanitizeTaskRecords([{ name: 'X', dueTime: '14:30' }]);
    expect(valid.dueTime).toBe('14:30');
    const [invalid] = sanitizeTaskRecords([{ name: 'X', dueTime: '99:99' }]);
    expect(invalid.dueTime).toBe('');
  });

  it('sanitizes routine and reminder to their defaults when missing', () => {
    const [task] = sanitizeTaskRecords([{ name: 'X' }]);
    expect(task.routine).toEqual({ enabled: false, frequency: 'weekly', interval: 1, weekdays: [1, 2, 3, 4, 5], endDate: '' });
    expect(task.reminder).toEqual({ enabled: false, minutesBefore: 60, snoozedUntil: '' });
    expect(task.lastReminderKey).toBe('');
  });

  it('preserves a valid routine and reminder', () => {
    const [task] = sanitizeTaskRecords([{
      name: 'X',
      routine: { enabled: true, frequency: 'daily', interval: 3, weekdays: [1], endDate: '2026-12-31' },
      reminder: { enabled: true, minutesBefore: 30, snoozedUntil: '' },
      lastReminderKey: '2026-07-16T09:00-30',
    }]);
    expect(task.routine).toEqual({ enabled: true, frequency: 'daily', interval: 3, weekdays: [1], endDate: '2026-12-31' });
    expect(task.reminder).toEqual({ enabled: true, minutesBefore: 30, snoozedUntil: '' });
    expect(task.lastReminderKey).toBe('2026-07-16T09:00-30');
  });

  it('snaps step effort the same way as task effort', () => {
    const [task] = sanitizeTaskRecords([{
      name: 'X',
      steps: [{ id: 's1', title: 'Step', effort: { value: 3, unit: 'hour' } }],
    }]);
    expect(task.steps[0].effort).toEqual({ value: 2, unit: 'hour' });
  });
});
