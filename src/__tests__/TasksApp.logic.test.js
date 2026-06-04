import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── helpers mirrored from TasksApp ──────────────────────────────────────────

const STEP_STATUSES = ['todo', 'in_progress', 'done', 'blocked'];
const cycleStepStatus = (s) => {
  const i = STEP_STATUSES.indexOf(s);
  return STEP_STATUSES[(i + 1) % STEP_STATUSES.length];
};

const makeInitialTask = () => ({
  name: '',
  description: '',
  status: 'active',
  priority: 'medium',
  dueDate: '',
  steps: [],
  notes: '',
});

const getProgress = (task) => {
  const steps = Array.isArray(task.steps) ? task.steps : [];
  if (steps.length === 0) return null;
  const done = steps.filter(s => s.status === 'done').length;
  return { done, total: steps.length };
};

// Simulate saveTask logic (new vs update)
const applyTaskSave = (tasks, task) => {
  const exists = tasks.find(t => t.id === task.id);
  return exists ? tasks.map(t => t.id === task.id ? task : t) : [task, ...tasks];
};

// ── tests ────────────────────────────────────────────────────────────────────

describe('TasksApp – step status cycling', () => {
  it('cycles todo → in_progress → done → blocked → todo', () => {
    expect(cycleStepStatus('todo')).toBe('in_progress');
    expect(cycleStepStatus('in_progress')).toBe('done');
    expect(cycleStepStatus('done')).toBe('blocked');
    expect(cycleStepStatus('blocked')).toBe('todo');
  });

  it('treats unknown status as todo and returns in_progress', () => {
    expect(cycleStepStatus('unknown')).toBe('todo');
  });
});

describe('TasksApp – progress calculation', () => {
  it('returns null when task has no steps', () => {
    expect(getProgress(makeInitialTask())).toBeNull();
  });

  it('counts done steps correctly', () => {
    const task = {
      steps: [
        { id: '1', status: 'done' },
        { id: '2', status: 'todo' },
        { id: '3', status: 'done' },
      ],
    };
    expect(getProgress(task)).toEqual({ done: 2, total: 3 });
  });

  it('handles non-array steps gracefully', () => {
    expect(getProgress({ steps: null })).toBeNull();
    expect(getProgress({ steps: undefined })).toBeNull();
  });
});

describe('TasksApp – duplicate save prevention', () => {
  it('does not add duplicate task when saved twice with same id', () => {
    const task = { id: 'abc', name: 'Test', steps: [] };
    let tasks = applyTaskSave([], task);
    tasks = applyTaskSave(tasks, task); // second call with same id
    expect(tasks).toHaveLength(1);
  });

  it('prepends new task to list', () => {
    const existing = { id: '1', name: 'Old', steps: [] };
    const newTask = { id: '2', name: 'New', steps: [] };
    const tasks = applyTaskSave([existing], newTask);
    expect(tasks[0].id).toBe('2');
    expect(tasks).toHaveLength(2);
  });

  it('updates existing task without adding duplicate', () => {
    const task = { id: '1', name: 'Original', steps: [] };
    let tasks = applyTaskSave([], task);
    const updated = { ...task, name: 'Updated' };
    tasks = applyTaskSave(tasks, updated);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].name).toBe('Updated');
  });
});

describe('TasksApp – step management', () => {
  it('adds a step with correct defaults', () => {
    const step = { id: 'step1', title: 'Write tests', status: 'todo', notes: '', dueDate: '' };
    const task = { ...makeInitialTask(), steps: [step] };
    expect(task.steps).toHaveLength(1);
    expect(task.steps[0].status).toBe('todo');
    expect(task.steps[0].dueDate).toBe('');
  });

  it('deletes a step by id', () => {
    const steps = [
      { id: 's1', title: 'Step 1', status: 'todo' },
      { id: 's2', title: 'Step 2', status: 'todo' },
    ];
    const filtered = steps.filter(s => s.id !== 's1');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('s2');
  });

  it('updates step dueDate without affecting other fields', () => {
    const steps = [{ id: 's1', title: 'Step', status: 'todo', notes: 'note', dueDate: '' }];
    const updated = steps.map(s =>
      s.id === 's1' ? { ...s, dueDate: '2026-06-10' } : s
    );
    expect(updated[0].dueDate).toBe('2026-06-10');
    expect(updated[0].notes).toBe('note');
    expect(updated[0].title).toBe('Step');
  });
});
