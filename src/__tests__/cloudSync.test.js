import { describe, it, expect } from 'vitest';
import { unionOnSignIn } from '../utils/cloudSync';

const pendingOf = ({ edited = [], deleted = [] } = {}) => ({
  edited: new Set(edited),
  deleted: new Set(deleted),
});

describe('unionOnSignIn', () => {
  it('resolves shared ids by whether the local copy is still waiting to sync', () => {
    const cases = [
      {
        name: 'cloud wins for an id with no pending local change',
        local: [{ id: '1', name: 'Local' }],
        cloud: [{ id: '1', name: 'Cloud' }],
        pending: pendingOf(),
        expectNames: ['Cloud'],
        expectPush: false,
      },
      {
        // The reported bug: a task edited while the header still showed
        // "disconnected" was overwritten by the pull that followed. The edit is
        // pending precisely because no cloud write confirmed it.
        name: 'local wins for an id with a pending local edit',
        local: [{ id: '1', name: 'Typed while offline' }],
        cloud: [{ id: '1', name: 'Stale cloud copy' }],
        pending: pendingOf({ edited: ['1'] }),
        expectNames: ['Typed while offline'],
        expectPush: true,
      },
      {
        name: 'a stale device with no pending edits still takes the cloud copy',
        local: [{ id: '1', name: 'Week-old copy' }],
        cloud: [{ id: '1', name: 'Edited on another device' }],
        pending: pendingOf({ edited: ['other-id'] }),
        expectNames: ['Edited on another device'],
        expectPush: false,
      },
    ];

    for (const { name, local, cloud, pending, expectNames, expectPush } of cases) {
      const result = unionOnSignIn(local, cloud, { pending });
      expect(result.merged.map(i => i.name), name).toEqual(expectNames);
      expect(result.pushToCloud, name).toBe(expectPush);
    }
  });

  it('keeps a local-only record instead of discarding it — regression for the reconnect data-loss bug', () => {
    // A record created while the header hadn't yet heard back from Drive
    // (or genuinely offline) must survive the cloud pull that follows, not
    // vanish the instant cloud data — which doesn't have it — arrives.
    const local = [
      { id: '1', name: 'Already synced' },
      { id: '2', name: 'Made while disconnected' },
    ];
    const cloud = [{ id: '1', name: 'Already synced' }];
    const result = unionOnSignIn(local, cloud);
    expect(result.merged.map(i => i.name).sort()).toEqual(['Already synced', 'Made while disconnected'].sort());
    expect(result.pushToCloud).toBe(true);
  });

  it('drops a cloud record the user deleted while unsynced, and reports the delete', () => {
    const local = [{ id: '1', name: 'Kept' }];
    const cloud = [{ id: '1', name: 'Kept' }, { id: '2', name: 'Deleted offline' }];
    const result = unionOnSignIn(local, cloud, { pending: pendingOf({ deleted: ['2'] }) });
    expect(result.merged.map(i => i.id)).toEqual(['1']);
    expect(result.deleteFromCloud).toEqual(['2']);
  });

  it('keeps local items and flags push when cloud is empty', () => {
    const local = [{ id: '1', name: 'Only local' }];
    const result = unionOnSignIn(local, []);
    expect(result.merged[0].name).toBe('Only local');
    expect(result.pushToCloud).toBe(true);
  });

  it('keeps local items and flags push when cloud is null (loadAllItems empty case)', () => {
    const local = [{ id: '1', name: 'Only local' }];
    const result = unionOnSignIn(local, null);
    expect(result.merged[0].name).toBe('Only local');
    expect(result.pushToCloud).toBe(true);
  });

  it('returns empty when neither side has items', () => {
    const result = unionOnSignIn([], null);
    expect(result.merged).toEqual([]);
    expect(result.pushToCloud).toBe(false);
    expect(result.deleteFromCloud).toEqual([]);
  });

  it('accepts a custom id accessor', () => {
    const local = [{ uid: 'a', name: 'Local' }];
    const cloud = [{ uid: 'b', name: 'Cloud' }];
    const result = unionOnSignIn(local, cloud, { idOf: (item) => item.uid });
    expect(result.merged.map(i => i.name).sort()).toEqual(['Cloud', 'Local']);
    expect(result.pushToCloud).toBe(true);
  });

  it.each([
    ['drops a local copy of a record another device deleted',
      { local: [{ id: 'gone', name: 'Stale' }], cloudDeleted: ['gone'] }, [], []],
    ['keeps a deleted-elsewhere record the user edited here since',
      { local: [{ id: 'gone', name: 'Edited' }], cloudDeleted: ['gone'], edited: ['gone'] }, ['gone'], ['gone']],
    ['keeps a record the cloud never saw and deleted nowhere',
      { local: [{ id: 'new', name: 'Offline' }], cloudDeleted: ['other'] }, ['new'], ['new']],
  ])('%s', (_name, { local, cloudDeleted, edited = [] }, expectedIds, expectedPushIds) => {
    const result = unionOnSignIn(local, [], { pending: pendingOf({ edited }), cloudDeletedIds: cloudDeleted });

    expect(result.merged.map((i) => i.id)).toEqual(expectedIds);
    expect(result.pushIds).toEqual(expectedPushIds);
  });

  it('pushes only records the cloud lacks or holds stale, never unchanged shared ones', () => {
    // Every Drive write is stamped newest: re-sending an unchanged record would
    // let this device's old copy beat an edit made on another device meanwhile.
    const local = [{ id: 'shared', name: 'Same' }, { id: 'edited', name: 'Mine' }, { id: 'new', name: 'New' }];
    const cloud = [{ id: 'shared', name: 'Same' }, { id: 'edited', name: 'Theirs' }];

    const result = unionOnSignIn(local, cloud, { pending: pendingOf({ edited: ['edited'] }) });

    expect(result.pushIds.sort()).toEqual(['edited', 'new']);
  });
});
