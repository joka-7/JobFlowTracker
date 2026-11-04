import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { signOut, deleteAllSyncedData, loadAllItems, auth } = vi.hoisted(() => ({
  signOut: vi.fn().mockResolvedValue(undefined),
  deleteAllSyncedData: vi.fn().mockResolvedValue(undefined),
  loadAllItems: vi.fn().mockResolvedValue(null),
  auth: { user: null },
}));

vi.mock('../driveSync', () => ({
  isCloudConfigured: () => true,
  hasRestorableSession: vi.fn().mockResolvedValue(false),
  onAuthChange: (cb) => { cb(auth.user); return () => {}; },
  loadAllItems,
  saveUserProfile: vi.fn().mockResolvedValue(undefined),
  signOut,
  deleteAllSyncedData,
}));

import { useCloudSync, clearLocalAccountData, countUnsyncedRecords } from '../hooks/useCloudSync';
import { recordLocalChanges, writeDataOwner } from '../utils/pendingSync';

function seedAccountData() {
  localStorage.setItem('jobTrackerAppV2Data_jobseeker', '[{"id":"c1"}]');
  localStorage.setItem('jobTrackerAppV2Data_recruiter', '[{"id":"r1"}]');
  localStorage.setItem('jobTrackerAppV2Data_tasks', '[{"id":"t1"}]');
  localStorage.setItem('tasksLabelsV1', '[{"id":"l1"}]');
  localStorage.setItem('appMode', 'tasks');
  writeDataOwner('uid1');
  recordLocalChanges('tasks', { edited: ['t1'] });
}

const ACCOUNT_KEYS = [
  'jobTrackerAppV2Data_jobseeker', 'jobTrackerAppV2Data_recruiter', 'jobTrackerAppV2Data_tasks',
  'tasksLabelsV1', 'jft_data_owner_v1', 'jft_pending_sync_v1:tasks',
];

describe('clearLocalAccountData', () => {
  beforeEach(() => localStorage.clear());

  it('removes every mode\'s records and sync bookkeeping but keeps preferences', () => {
    seedAccountData();

    clearLocalAccountData();

    expect(ACCOUNT_KEYS.filter((key) => localStorage.getItem(key) !== null)).toEqual([]);
    expect(localStorage.getItem('appMode')).toBe('tasks');
  });
});

describe('countUnsyncedRecords', () => {
  beforeEach(() => localStorage.clear());

  it.each([
    ['counts pending records across modes on a connected device', true, 1],
    ['reports nothing on a device that never connected', false, 0],
  ])('%s', (_name, connected, expected) => {
    recordLocalChanges('tasks', { edited: ['t1'] });
    if (connected) writeDataOwner('uid1');

    expect(countUnsyncedRecords()).toBe(expected);
  });
});

describe('useCloudSync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('location', { ...window.location, reload: vi.fn() });
  });

  it.each([
    ['signOutAndClear', signOut],
    ['deleteSyncedDataAndClear', deleteAllSyncedData],
  ])('%s clears this device only after Drive confirms, then reloads', async (method, driveCall) => {
    seedAccountData();
    const { result } = renderHook(() => useCloudSync({
      mode: 'tasks', sanitizeAndFilter: (d) => d, onData: vi.fn(),
    }));

    await act(async () => { await result.current[method](); });

    expect(driveCall).toHaveBeenCalled();
    expect(localStorage.getItem('jobTrackerAppV2Data_tasks')).toBeNull();
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('leaves local data in place when Drive refuses the delete', async () => {
    seedAccountData();
    deleteAllSyncedData.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderHook(() => useCloudSync({
      mode: 'tasks', sanitizeAndFilter: (d) => d, onData: vi.fn(),
    }));

    await act(async () => {
      await expect(result.current.deleteSyncedDataAndClear()).rejects.toThrow('offline');
    });

    expect(localStorage.getItem('jobTrackerAppV2Data_tasks')).not.toBeNull();
  });
});

describe('useCloudSync focus pulls', () => {
  const NOW = new Date(2026, 9, 18, 12, 0, 0).getTime();

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    auth.user = { uid: 'uid1' };
    loadAllItems.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    auth.user = null;
  });

  async function focusTab() {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  }

  it.each([
    ['skips a refocus right after the connect pull', 1_000, 1],
    ['pulls again once 30 s have passed', 30_000, 2],
  ])('%s', async (_name, elapsedMs, expectedPulls) => {
    renderHook(() => useCloudSync({ mode: 'tasks', sanitizeAndFilter: (d) => d, onData: vi.fn() }));
    await vi.waitFor(() => expect(loadAllItems).toHaveBeenCalledTimes(1));

    vi.setSystemTime(Date.now() + elapsedMs);
    await focusTab();

    expect(loadAllItems).toHaveBeenCalledTimes(expectedPulls);
  });
});

