import { describe, it, expect } from 'vitest';
import { buildCrashBackup } from '../utils/crashBackup';

describe('buildCrashBackup', () => {
  function fakeStorage(entries) {
    return { getItem: (key) => (key in entries ? entries[key] : null) };
  }

  it.each([
    ['tasks with labels', 'tasks',
      { jobTrackerAppV2Data_tasks: '[{"id":"t1"}]', tasksLabelsV1: '[{"id":"l1"}]' },
      { version: 2, tasks: [{ id: 't1' }], labels: [{ id: 'l1' }] }],
    ['tasks with nothing stored', 'tasks', {}, { version: 2, tasks: [], labels: [] }],
    ['job seeker records as a plain list', 'jobseeker',
      { jobTrackerAppV2Data_jobseeker: '[{"id":"c1"}]' }, [{ id: 'c1' }]],
    ['recruiter with nothing stored', 'recruiter', {}, []],
  ])('%s', (_name, mode, entries, expected) => {
    expect(buildCrashBackup(mode, fakeStorage(entries))).toEqual(expected);
  });

  it('throws on corrupt storage so the boundary can report the export failure', () => {
    expect(() => buildCrashBackup('jobseeker', fakeStorage({ jobTrackerAppV2Data_jobseeker: '{oops' })))
      .toThrow(SyntaxError);
  });
});
