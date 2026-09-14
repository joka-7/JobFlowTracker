import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import '../i18n';
import App from '../App';
import { pendingStorageKey } from '../utils/pendingSync';

/**
 * Exercises the real offline/sync-fallback behavior in JobTrackerApp's auth
 * effect (src/JobTrackerApp.jsx) via App, instead of re-implementing a mock
 * loadAllItems and asserting against the mock's own return value.
 */

const fakeUser = { uid: 'user123', displayName: 'Test User' };
let loadAllItemsMock;

vi.mock('../firebase', () => ({
  auth: {},
  hasRestorableSession: vi.fn().mockResolvedValue(true),
  onAuthChange: (cb) => { cb(fakeUser); return () => {}; },
  completeRedirectSignIn: vi.fn().mockResolvedValue(null),
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
  beforeEach(() => {
    localStorage.clear();
    loadAllItemsMock = vi.fn();
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
    loadAllItemsMock.mockResolvedValue([{ id: '1', name: 'Fresh Cloud Co', role: 'Designer', status: 'applied' }]);

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
    loadAllItemsMock.mockResolvedValue([{ id: '2', name: 'Already Synced', role: 'Designer', status: 'applied' }]);

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
    loadAllItemsMock.mockResolvedValue([{ id: '1', name: 'Stale Cloud Copy', role: 'Designer', status: 'applied' }]);

    render(<App />);

    expect(await screen.findByText('Renamed While Disconnected')).toBeInTheDocument();
    expect(screen.queryByText('Stale Cloud Copy')).not.toBeInTheDocument();
  });

  it('does not resurrect a company deleted while unsynced', async () => {
    seedJobSeekerApp([{ id: '1', name: 'Kept Co', role: 'Engineer', status: 'applied' }]);
    localStorage.setItem(pendingStorageKey('jobseeker'), JSON.stringify({ edited: [], deleted: ['2'] }));
    loadAllItemsMock.mockResolvedValue([
      { id: '1', name: 'Kept Co', role: 'Engineer', status: 'applied' },
      { id: '2', name: 'Deleted While Offline', role: 'Designer', status: 'applied' },
    ]);

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

  it('does not crash and falls back to empty state on corrupted localStorage JSON', async () => {
    localStorage.setItem('appMode', 'jobseeker');
    localStorage.setItem('hasCompletedOnboarding', '1');
    localStorage.setItem('jobTrackerAppV2Data_jobseeker', '{ invalid json');
    loadAllItemsMock.mockResolvedValue(null);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Job Search Tracker', exact: true })).toBeInTheDocument();
  });
});
