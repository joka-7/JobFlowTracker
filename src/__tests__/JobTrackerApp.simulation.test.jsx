import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import '../i18n';

vi.mock('../firebase', () => ({
  auth: {},
  onAuthChange: (cb) => { cb(null); return () => {}; },
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  loadAllItems: vi.fn().mockResolvedValue(null),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  batchSaveItems: vi.fn(),
  loadUserProfile: vi.fn().mockResolvedValue({}),
  saveUserProfile: vi.fn(),
}));

const { mockStreamChat } = vi.hoisted(() => ({
  mockStreamChat: vi.fn(async (_messages, _system, onChunk) => {
    onChunk('Simulated interviewer greeting');
    return 'Simulated interviewer greeting';
  }),
}));

vi.mock('../services/aiAssistant', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    initAI: vi.fn(),
    isAIReady: vi.fn(() => true),
    streamChat: mockStreamChat,
  };
});

window.HTMLElement.prototype.scrollIntoView = vi.fn();

import JobTrackerApp from '../JobTrackerApp';

describe('JobTrackerApp mock interview', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('appMode', 'jobseeker');
    localStorage.setItem('hasCompletedOnboarding', '1');
    localStorage.setItem('aiProvider', 'gemini');
    localStorage.setItem('aiApiKey', 'test-key');
    vi.clearAllMocks();
  });

  it('opens mock interview from template library without ReferenceError', async () => {
    const user = userEvent.setup();
    render(<JobTrackerApp mode="jobseeker" onModeChange={vi.fn()} autoOnboarding={false} />);

    await user.click(screen.getByTitle(/Interview Template/i));
    await user.click(screen.getAllByRole('button', { name: /Mock interview/i })[0]);

    await waitFor(() => {
      expect(screen.getByText('Mock Interview', { exact: true })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Simulated interviewer greeting')).toBeInTheDocument();
    });
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    expect(mockStreamChat).toHaveBeenCalled();
  });
});
