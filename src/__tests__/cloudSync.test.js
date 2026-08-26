import { describe, it, expect } from 'vitest';
import { unionOnSignIn } from '../utils/cloudSync';

describe('unionOnSignIn', () => {
  it('cloud wins for an id that exists on both sides', () => {
    const local = [{ id: '1', name: 'Local' }];
    const cloud = [{ id: '1', name: 'Cloud' }];
    const result = unionOnSignIn(local, cloud);
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0].name).toBe('Cloud');
    expect(result.pushToCloud).toBe(false);
  });

  it('keeps a local-only record instead of discarding it — regression for the reconnect data-loss bug', () => {
    // A record created while the header hadn't yet heard back from Firebase
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
  });

  it('accepts a custom id accessor', () => {
    const local = [{ uid: 'a', name: 'Local' }];
    const cloud = [{ uid: 'b', name: 'Cloud' }];
    const result = unionOnSignIn(local, cloud, (item) => item.uid);
    expect(result.merged.map(i => i.name).sort()).toEqual(['Cloud', 'Local']);
    expect(result.pushToCloud).toBe(true);
  });
});
