import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import '../i18n';
import App from '../App';
import { batchSaveItems } from '../driveSync';
import { pendingStorageKey } from '../utils/pendingSync';

/**
 * Exercises the real offline/sync-fallback behavior in JobTrackerApp's auth
 * effect (src/JobTrackerApp.jsx) via App, instead of re-implementing a mock
 * loadAllItems and asserting against the mock's own return value.
 */

const fakeUser = { uid: 'user123', displayName: 'Test User' };
let loadAllItemsMock;

vi.mock('../driveSync', () => ({
  isCloudConfigured: () => true,
  deleteAllSyncedData: vi.fn(),
  hasRestorableSession: vi.fn().mockResolvedValue(true),
  onAuthChange: (cb) => { cb(fakeUser); return () => {}; },
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  loadAllItems: (...args) => loadAllItemsMock(...args),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  batchSaveItems: vi.fn().mockResolvedValue(undefined),
  loadUserProfile: vi.fn().mockResolvedValue({}),
  saveUserProfile: vi.fn(),
}));

vi.mock('../services/aiAssistant', () => ({
  initAI: vi.fn(),
  isAIReady: vi.fn(() => false),
  getInterviewPrep: vi.fn(),
  analyzePatterns: vi.fn(),
  debriefInterview: vi.fn(),
  getSchedulingAdvice: vi.fn(),
  getResumeAdvice: vi.fn(),
  streamChat: vi.fn(),
}));

function seedJobSeekerApp(companies) {
  localStorage.setItem('appMode', 'jobseeker');
  localStorage.setItem('hasCompletedOnboarding', '1');
  if (companies !== undefined) {
    localStorage.setItem('jobTrackerAppV2Data_jobseeker', JSON.stringify(companies));
  }
}

describe('Offline sync fallback (real JobTrackerApp auth effect)', () => {
  beforeAll(async () => {
    // App lazy-loads JobTrackerApp; transforming that module cold outlasts
    // findBy*'s 1s timeout, so the first test failed whenever this file ran alone.
    await import('../JobTrackerApp');
  });

  beforeEach(() => {
    localStorage.clear();
    loadAllItemsMock = vi.fn();
    vi.mocked(batchSaveItems).mockClear();
  });

  it('keeps localStorage-seeded companies when the cloud fetch fails', async () => {
    seedJobSeekerApp([{ id: '1', name: 'Offline Co', role: 'Engineer', status: 'applied' }]);
    loadAllItemsMock.mockRejectedValue(new Error('Network error'));

    render(<App />);

    expect(await screen.findByText('Offline Co')).toBeInTheDocument();
    await waitFor(() => expect(loadAllItemsMock).toHaveBeenCalled());
    // The failed cloud fetch must not have cleared the locally-seeded data.
    expect(screen.getByText('Offline Co')).toBeInTheDocument();
  });

  it('cloud wins for a company id that exists on both sides', async () => {
    seedJobSeekerApp([{ id: '1', name: 'Stale Local Co', role: 'Engineer', status: 'applied' }]);
    loadAllItemsMock.mockResolvedValue({ items: [{ id: '1', name: 'Fresh Cloud Co', role: 'Designer', status: 'applied' }], deletedIds: [] });

    render(<App />);

    expect(await screen.findByText('Fresh Cloud Co')).toBeInTheDocument();
    expect(screen.queryByText('Stale Local Co')).not.toBeInTheDocument();
  });

  it('keeps a local-only company instead of discarding it — regression for the reconnect data-loss bug', async () => {
    // Reported bug: the header can show "disconnected" for a beat before a
    // returning session actually resolves (see useCloudSync's
    // authResolved); a user who adds something in that window must not have
    // it wiped out the instant the real cloud pull lands, just because its
    // id isn't in that snapshot yet.
    seedJobSeekerApp([{ id: '1', name: 'Made While Disconnected', role: 'Engineer', status: 'applied' }]);
    loadAllItemsMock.mockResolvedValue({ items: [{ id: '2', name: 'Already Synced', role: 'Designer', status: 'applied' }], deletedIds: [] });

    render(<App />);

    expect(await screen.findByText('Already Synced')).toBeInTheDocument();
    expect(screen.getByText('Made While Disconnected')).toBeInTheDocument();
  });

  it('keeps an edit made while unsynced instead of letting the cloud pull overwrite it', async () => {
    // Reported bug: brand-new records survived a reconnect but *edits* to
    // existing ones did not — the pull overwrote every id it shared with local
    // state, so anything typed into an existing card during the disconnected
    // window vanished. The edit is protected because no cloud write ever
    // confirmed it (see utils/pendingSync).
    seedJobSeekerApp([{ id: '1', name: 'Renamed While Disconnected', role: 'Engineer', status: 'applied' }]);
    localStorage.setItem(pendingStorageKey('jobseeker'), JSON.stringify({ edited: ['1'], deleted: [] }));
    loadAllItemsMock.mockResolvedValue({ items: [{ id: '1', name: 'Stale Cloud Copy', role: 'Designer', status: 'applied' }], deletedIds: [] });

    render(<App />);

    expect(await screen.findByText('Renamed While Disconnected')).toBeInTheDocument();
    expect(screen.queryByText('Stale Cloud Copy')).not.toBeInTheDocument();
  });

  it('does not resurrect a company deleted while unsynced', async () => {
    seedJobSeekerApp([{ id: '1', name: 'Kept Co', role: 'Engineer', status: 'applied' }]);
    localStorage.setItem(pendingStorageKey('jobseeker'), JSON.stringify({ edited: [], deleted: ['2'] }));
    loadAllItemsMock.mockResolvedValue({ items: [
      { id: '1', name: 'Kept Co', role: 'Engineer', status: 'applied' },
      { id: '2', name: 'Deleted While Offline', role: 'Designer', status: 'applied' },
    ], deletedIds: [] });

    render(<App />);

    expect(await screen.findByText('Kept Co')).toBeInTheDocument();
    expect(screen.queryByText('Deleted While Offline')).not.toBeInTheDocument();
  });

  it('switching modes does not flag the incoming collection as unsynced local edits', async () => {
    // The mode-reload effect replaces `companies` a render after `mode` flips,
    // so a change tracker keyed on the prop alone diffs the outgoing mode's
    // records against the incoming ones and reports the whole collection —
    // pinning stale copies over cloud, and queueing the outgoing mode's ids as
    // deletes against the incoming collection.
    seedJobSeekerApp([{ id: 'j1', name: 'Seeker Co', role: 'Engineer', status: 'applied' }]);
    localStorage.setItem(
      'jobTrackerAppV2Data_recruiter',
      JSON.stringify([{ id: 'r1', name: 'Recruit Co', role: 'Designer', status: 'screening' }]),
    );
    loadAllItemsMock.mockResolvedValue(null);

    render(<App />);
    expect(await screen.findByText('Seeker Co')).toBeInTheDocument();

    const modeTrigger = screen.getAllByRole('button', { haspopup: 'listbox' })
      .find((el) => /Job Search/i.test(el.textContent));
    fireEvent.click(modeTrigger);
    fireEvent.click(await screen.findByRole('option', { name: /Recruiting/i }));

    expect(await screen.findByText('Recruit Co')).toBeInTheDocument();
    expect(localStorage.getItem(pendingStorageKey('recruiter'))).toBeNull();
  });

  it('uploads only this mode\'s records when a mixed-mode backup is imported while signed in', async () => {
    seedJobSeekerApp([]);
    loadAllItemsMock.mockResolvedValue(null);
    const backup = [
      { id: 'j1', mode: 'jobseeker', name: 'Seeker Co', status: 'applied' },
      { id: 'r1', mode: 'recruiter', name: 'Candidate Jane', status: 'screening' },
    ];
    const { container } = render(<App />);
    await screen.findByRole('heading', { name: 'Job Search Tracker', exact: true });
    vi.mocked(batchSaveItems).mockClear();

    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
    fireEvent.change(container.querySelector('#main-file-upload'), { target: { files: [file] } });

    await waitFor(() => expect(batchSaveItems).toHaveBeenCalled());
    const uploadedIds = vi.mocked(batchSaveItems).mock.calls[0][2].map((c) => c.id);
    expect(uploadedIds).toEqual(['j1']);
  });

  it('warns the user when this browser\'s storage is full instead of losing the save silently', async () => {
    seedJobSeekerApp([{ id: '1', name: 'Big Co', role: 'Engineer', status: 'applied' }]);
    loadAllItemsMock.mockResolvedValue(null);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const realSetItem = Storage.prototype.setItem;
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(key, value) {
      if (key === 'jobTrackerAppV2Data_jobseeker') throw new DOMException('full', 'QuotaExceededError');
      return realSetItem.call(this, key, value);
    });

    try {
      render(<App />);

      expect(await screen.findByText(/storage is full/)).toBeInTheDocument();
    } finally {
      setItemSpy.mockRestore();
    }
  });

  it('drops a local company another device deleted, instead of re-uploading it', async () => {
    seedJobSeekerApp([
      { id: '1', name: 'Kept Co', role: 'Engineer', status: 'applied' },
      { id: '2', name: 'Deleted Elsewhere', role: 'Designer', status: 'applied' },
    ]);
    loadAllItemsMock.mockResolvedValue({
      items: [{ id: '1', name: 'Kept Co', role: 'Engineer', status: 'applied' }],
      deletedIds: ['2'],
    });

    render(<App />);

    expect(await screen.findByText('Kept Co')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Deleted Elsewhere')).not.toBeInTheDocument());
    expect(batchSaveItems).not.toHaveBeenCalled();
  });

  it('uploads only the companies Drive lacks on first connect', async () => {
    seedJobSeekerApp([
      { id: '1', name: 'Already In Drive', role: 'Engineer', status: 'applied' },
      { id: '2', name: 'Only On This Device', role: 'Designer', status: 'applied' },
    ]);
    loadAllItemsMock.mockResolvedValue({
      items: [{ id: '1', name: 'Already In Drive', role: 'Engineer', status: 'applied' }],
      deletedIds: [],
    });

    render(<App />);

    await waitFor(() => expect(batchSaveItems).toHaveBeenCalled());
    expect(vi.mocked(batchSaveItems).mock.calls[0][2].map((c) => c.id)).toEqual(['2']);
  });

  it('discards another account\'s local data instead of merging it into this Drive', async () => {
    seedJobSeekerApp([{ id: 'x', name: 'Someone Else Co', role: 'Engineer', status: 'applied' }]);
    localStorage.setItem('jft_data_owner_v1', 'another-uid');
    loadAllItemsMock.mockResolvedValue(null);

    render(<App />);

    await waitFor(() => expect(localStorage.getItem('jft_data_owner_v1')).toBe(fakeUser.uid));
    expect(screen.queryByText('Someone Else Co')).not.toBeInTheDocument();
    expect(batchSaveItems).not.toHaveBeenCalled();
  });

  it('drops a pull that finishes after the user switched modes, instead of merging it into the new mode', async () => {
    seedJobSeekerApp([{ id: 'j1', name: 'Seeker Co', role: 'Engineer', status: 'applied' }]);
    localStorage.setItem(
      'jobTrackerAppV2Data_recruiter',
      JSON.stringify([{ id: 'r1', name: 'Recruit Co', role: 'Designer', status: 'screening' }]),
    );
    let finishSeekerPull;
    loadAllItemsMock.mockImplementation((_uid, mode) => (mode === 'jobseeker'
      ? new Promise((resolve) => { finishSeekerPull = resolve; })
      : Promise.resolve(null)));

    render(<App />);
    expect(await screen.findByText('Seeker Co')).toBeInTheDocument();
    await waitFor(() => expect(finishSeekerPull).toBeDefined());
    const modeTrigger = screen.getAllByRole('button', { haspopup: 'listbox' })
      .find((el) => /Job Search/i.test(el.textContent));
    fireEvent.click(modeTrigger);
    fireEvent.click(await screen.findByRole('option', { name: /Recruiting/i }));
    expect(await screen.findByText('Recruit Co')).toBeInTheDocument();
    vi.mocked(batchSaveItems).mockClear();

    finishSeekerPull({ items: [{ id: 'jc', name: 'Cloud Seeker Co', role: 'Engineer', status: 'applied' }], deletedIds: [] });

    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(localStorage.getItem('jobTrackerAppV2Data_recruiter')).not.toContain('Cloud Seeker Co');
    expect(vi.mocked(batchSaveItems).mock.calls.filter(([, m]) => m === 'recruiter')).toEqual([]);
  });

  it('uploads this device\'s companies on the first connect, when Drive holds nothing yet', async () => {
    seedJobSeekerApp([{ id: 'j1', name: 'Local Co', role: 'Engineer', status: 'applied' }]);
    loadAllItemsMock.mockResolvedValue(null);

    render(<App />);

    await waitFor(() => expect(batchSaveItems).toHaveBeenCalled());
    expect(vi.mocked(batchSaveItems).mock.calls[0][2].map((c) => c.id)).toEqual(['j1']);
  });

  it('does not crash and falls back to empty state on corrupted localStorage JSON', async () => {
    localStorage.setItem('appMode', 'jobseeker');
    localStorage.setItem('hasCompletedOnboarding', '1');
    localStorage.setItem('jobTrackerAppV2Data_jobseeker', '{ invalid json');
    loadAllItemsMock.mockResolvedValue(null);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Job Search Tracker', exact: true })).toBeInTheDocument();
  });
});
