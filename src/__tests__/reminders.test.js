import { describe, it, expect } from 'vitest';
import {
  buildReminderKey, getTaskDueDateTime, shouldNotifyTask, sanitizeDueTime,
  snoozeTaskReminder, isReminderSnoozed, sanitizeReminder,
} from '../utils/reminders.js';

describe('reminders', () => {
  it('builds a stable reminder key', () => {
    const task = {
      dueDate: '2026-07-16',
      dueTime: '09:30',
      reminder: { enabled: true, minutesBefore: 60 },
    };
    expect(buildReminderKey(task)).toBe('2026-07-16T09:30-60');
  });

  it('parses due date and time', () => {
    const due = getTaskDueDateTime({ dueDate: '2026-07-16', dueTime: '14:15' });
    expect(due.getHours()).toBe(14);
    expect(due.getMinutes()).toBe(15);
  });

  it('notifies only inside the reminder window once', () => {
    const task = {
      id: '1',
      dueDate: '2026-07-16',
      dueTime: '10:00',
      reminder: { enabled: true, minutesBefore: 60 },
      lastReminderKey: '',
    };
    const now = new Date(2026, 6, 16, 9, 5, 0);
    expect(shouldNotifyTask(task, now)).toBe(true);
    expect(shouldNotifyTask({ ...task, lastReminderKey: buildReminderKey(task) }, now)).toBe(false);
  });

  it('sanitizes due time', () => {
    expect(sanitizeDueTime('09:30')).toBe('09:30');
    expect(sanitizeDueTime('25:00')).toBe('');
  });

  it('skips notification while snoozed', () => {
    const task = {
      id: '1',
      dueDate: '2026-07-16',
      dueTime: '10:00',
      reminder: sanitizeReminder({
        enabled: true, minutesBefore: 60, snoozedUntil: '2099-01-01T00:00:00.000Z',
      }),
      lastReminderKey: '',
    };
    const now = new Date(2026, 6, 16, 9, 5, 0);
    expect(isReminderSnoozed(task.reminder, now)).toBe(true);
    expect(shouldNotifyTask(task, now)).toBe(false);
  });

  it('clears lastReminderKey when snoozing', () => {
    const task = {
      id: '1',
      dueDate: '2026-07-16',
      dueTime: '10:00',
      lastReminderKey: '2026-07-16T10:00-60',
      reminder: sanitizeReminder({ enabled: true, minutesBefore: 60 }),
    };
    const snoozed = snoozeTaskReminder(task, 15, new Date(2026, 6, 16, 9, 0, 0));
    expect(snoozed.lastReminderKey).toBe('');
    expect(snoozed.reminder.snoozedUntil).toBeTruthy();
  });
});
