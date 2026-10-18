import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import '../i18n';
import App from '../App';
import { updateItem } from '../firebase';

const fakeUser = { uid: 'user123', displayName: 'Test User' };

vi.mock('../firebase', () => ({
  hasRestorableSession: vi.fn().mockResolvedValue(true),
  onAuthChange: (cb) => { cb(fakeUser); return () => {}; },
  completeRedirectSignIn: vi.fn().mockResolvedValue(null),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  formatSignInError: vi.fn(),
  loadAllItems: vi.fn().mockResolvedValue(null),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  batchSaveItems: vi.fn().mockResolvedValue(undefined),
  loadUserProfile: vi.fn().mockResolvedValue({}),
  saveUserProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/aiAssistant', () => ({
  initAI: vi.fn(),
  isAIReady: vi.fn(() => false),
  getGoalsTasksSystemPrompt: vi.fn(() => ''),
  streamChat: vi.fn(),
}));

const seededTask = {
  id: 't1',
  name: 'Renew passport',
  status: 'active',
  steps: [{ id: 's1', title: 'Book appointment', status: 'todo' }],
};

async function openSeededTask() {
  localStorage.setItem('appMode', 'tasks');
  localStorage.setItem('hasCompletedOnboarding_tasks', '1');
  localStorage.setItem('jobTrackerAppV2Data_tasks', JSON.stringify([seededTask]));
  render(<StrictMode><App /></StrictMode>);
  fireEvent.click(await screen.findByText('Renew passport'));
  return screen.findByTitle('To Do');
}

describe('TasksApp cloud writes', () => {
  beforeAll(async () => {
    // App lazy-loads TasksApp; warm the module so findBy* doesn't time out.
    await import('../TasksApp');
  });

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(updateItem).mockReset();
  });

  it('writes a step status change exactly once, even when React replays updaters', async () => {
    vi.mocked(updateItem).mockResolvedValue(undefined);
    const stepToggle = await openSeededTask();
    vi.mocked(updateItem).mockClear();

    fireEvent.click(stepToggle);

    await waitFor(() => expect(updateItem).toHaveBeenCalled());
    expect(updateItem).toHaveBeenCalledTimes(1);
    expect(vi.mocked(updateItem).mock.calls[0][2].steps[0].status).toBe('in_progress');
  });

  it('tells the user when a cloud write fails instead of swallowing it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(updateItem).mockRejectedValue(new Error('offline'));
    const stepToggle = await openSeededTask();

    fireEvent.click(stepToggle);

    expect(await screen.findByText(/Couldn't save to the cloud/)).toBeInTheDocument();
  });
});
