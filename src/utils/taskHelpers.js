import { safeStr } from '../sanitize';
import { formatDate } from './date';
import { DEFAULT_ROUTINE } from './recurrence';
import { DEFAULT_REMINDER, getTaskDueDateTime } from './reminders';
import { TASKS_TERMINAL_STATUSES } from '../statuses';

export { safeStr, formatDate };

export const DURATION_UNITS = ['minute', 'hour', 'day', 'month'];

export const STEP_STATUS_CYCLE = ['todo', 'in_progress', 'done', 'blocked'];

export const cycleStepStatus = (current) => {
  const idx = STEP_STATUS_CYCLE.indexOf(current);
  return STEP_STATUS_CYCLE[(idx + 1) % STEP_STATUS_CYCLE.length];
};

export const makeInitialDuration = () => ({ value: '', unit: 'hour' });

/** Effort reuses the duration shape, but its values are snapped to the ladder. */
export const makeInitialEffort = () => ({ value: '', unit: 'hour' });

export const makeInitialTask = () => ({
  name: '',
  description: '',
  status: 'active',
  priority: 'medium',
  impact: 'medium',
  urgency: '',
  type: '',
  effort: makeInitialEffort(),
  dueDate: '',
  dueTime: '',
  duration: makeInitialDuration(),
  labelIds: [],
  cardColor: '',
  routine: { ...DEFAULT_ROUTINE },
  reminder: { ...DEFAULT_REMINDER },
  lastReminderKey: '',
  steps: [],
  notes: '',
});

export const getProgress = (task) => {
  const steps = Array.isArray(task.steps) ? task.steps : [];
  if (steps.length === 0) return null;
  const done = steps.filter(s => s.status === 'done').length;
  return { done, total: steps.length };
};

export const getNextPendingStep = (task) => {
  const steps = Array.isArray(task.steps) ? task.steps : [];
  return steps.find(s => s.status !== 'done' && s.status !== 'blocked') || null;
};

/**
 * A task is overdue when it has a due date/time in the past and hasn't
 * reached a terminal status (completed/cancelled).
 */
export const isTaskOverdue = (task, now = new Date()) => {
  if (!task?.dueDate) return false;
  if (TASKS_TERMINAL_STATUSES.includes(task.status)) return false;
  const dueAt = getTaskDueDateTime(task);
  return Boolean(dueAt) && dueAt.getTime() < now.getTime();
};

/** Update a task in place by id, or prepend it as new if its id isn't present. */
export function mergeTaskIntoList(tasks, task) {
  const exists = tasks.find(t => t.id === task.id);
  return exists ? tasks.map(t => (t.id === task.id ? task : t)) : [task, ...tasks];
}

export const formatDuration = (duration, tt) => {
  const value = safeStr(duration?.value).trim();
  if (!value) return null;
  const unit = DURATION_UNITS.includes(duration?.unit) ? duration.unit : 'hour';
  return `${value} ${tt(`duration.${unit}`, unit)}`;
};
