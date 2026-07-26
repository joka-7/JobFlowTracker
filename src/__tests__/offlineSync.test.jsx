import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import '../i18n';
import App from '../App';

/**
 * Exercises the real offline/sync-fallback behavior in JobTrackerApp's auth
 * effect (src/JobTrackerApp.jsx) via App, instead of re-implementing a mock
 * loadAllItems and asserting against the mock's own return value.
 */

const fakeUser = { uid: 'user123', displayName: 'Test User' };
let loadAllItemsMock;

vi.mock('../firebase', () => ({
  auth: {},
  onAuthChange: (cb) => { cb(fakeUser); return () => {}; },
  completeRedirectSignIn: vi.fn().mockResolvedValue(null),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  loadAllItems: (...args) => loadAllItemsMock(...args),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  batchSaveItems: vi.fn(),
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

  it('replaces local data with cloud data when the fetch succeeds', async () => {
    seedJobSeekerApp([{ id: '1', name: 'Stale Local Co', role: 'Engineer', status: 'applied' }]);
    loadAllItemsMock.mockResolvedValue([{ id: '2', name: 'Fresh Cloud Co', role: 'Designer', status: 'applied' }]);

    render(<App />);

    expect(await screen.findByText('Fresh Cloud Co')).toBeInTheDocument();
    expect(screen.queryByText('Stale Local Co')).not.toBeInTheDocument();
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
