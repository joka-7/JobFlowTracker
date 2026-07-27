import { describe, it, expect } from 'vitest';
import {
  applyBoardDrag, itemsInColumn, sanitizeBoardOrder, compareBoardOrder,
} from '../utils/boardOrder';
import { sanitizeTrackerRecords, sanitizeTaskRecords } from '../sanitize';

describe('sanitizeBoardOrder', () => {
  it('keeps finite numbers and rejects invalid values', () => {
    expect(sanitizeBoardOrder(0)).toBe(0);
    expect(sanitizeBoardOrder(3.5)).toBe(3.5);
    expect(sanitizeBoardOrder(NaN)).toBeUndefined();
    expect(sanitizeBoardOrder('1')).toBeUndefined();
    expect(sanitizeBoardOrder(null)).toBeUndefined();
  });
});

describe('itemsInColumn', () => {
  it('filters by status and sorts by boardOrder with legacy fallback', () => {
    const items = [
      { id: 'a', status: 'active', boardOrder: 2 },
      { id: 'b', status: 'done' },
      { id: 'c', status: 'active', boardOrder: 0 },
      { id: 'd', status: 'active' },
    ];
    expect(itemsInColumn(items, 'active').map((i) => i.id)).toEqual(['c', 'a', 'd']);
  });
});

describe('applyBoardDrag', () => {
  const base = [
    { id: '1', status: 'todo', boardOrder: 0, name: 'A' },
    { id: '2', status: 'todo', boardOrder: 1, name: 'B' },
    { id: '3', status: 'todo', boardOrder: 2, name: 'C' },
    { id: '4', status: 'done', boardOrder: 0, name: 'D' },
  ];
  const columnIds = ['todo', 'done'];

  it('reorders within a column using arrayMove semantics', () => {
    const result = applyBoardDrag(base, { activeId: '1', overId: '3', columnIds });
    expect(result).not.toBeNull();
    expect(itemsInColumn(result.items, 'todo').map((i) => i.id)).toEqual(['2', '3', '1']);
    expect(result.changed.every((c) => c.status === 'todo')).toBe(true);
  });

  it('moves across columns and inserts before the over card', () => {
    const result = applyBoardDrag(base, { activeId: '1', overId: '4', columnIds });
    expect(result).not.toBeNull();
    expect(itemsInColumn(result.items, 'todo').map((i) => i.id)).toEqual(['2', '3']);
    expect(itemsInColumn(result.items, 'done').map((i) => i.id)).toEqual(['1', '4']);
    expect(result.items.find((i) => i.id === '1').status).toBe('done');
  });

  it('appends when dropping on a column id', () => {
    const result = applyBoardDrag(base, { activeId: '2', overId: 'done', columnIds });
    expect(itemsInColumn(result.items, 'done').map((i) => i.id)).toEqual(['4', '2']);
  });

  it('returns null for no-ops', () => {
    expect(applyBoardDrag(base, { activeId: '1', overId: '1', columnIds })).toBeNull();
    expect(applyBoardDrag(base, { activeId: 'missing', overId: '2', columnIds })).toBeNull();
  });
});

describe('sanitize preserves boardOrder', () => {
  it('keeps boardOrder on tracker and task records', () => {
    const tracker = sanitizeTrackerRecords([{ name: 'Acme', boardOrder: 4 }]);
    expect(tracker[0].boardOrder).toBe(4);
    const tasks = sanitizeTaskRecords([{ name: 'Task', boardOrder: 2 }]);
    expect(tasks[0].boardOrder).toBe(2);
    const stripped = sanitizeTrackerRecords([{ name: 'Acme', boardOrder: 'bad' }]);
    expect(stripped[0].boardOrder).toBeUndefined();
  });
});

describe('compareBoardOrder', () => {
  it('prefers explicit boardOrder over index fallback', () => {
    const indexMap = new Map([['a', 0], ['b', 1]]);
    expect(compareBoardOrder({ id: 'a', boardOrder: 5 }, { id: 'b', boardOrder: 1 }, indexMap)).toBeGreaterThan(0);
  });
});
