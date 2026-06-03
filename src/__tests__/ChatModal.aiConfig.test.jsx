import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatModal from '../components/ChatModal';
import { initAI, loadAIConfigFromStorage } from '../services/aiAssistant';

const { mockStreamChat } = vi.hoisted(() => ({
  mockStreamChat: vi.fn(async (_messages, _system, onChunk) => {
    onChunk('AI reply after key saved');
    return 'AI reply after key saved';
  }),
}));

vi.mock('../services/aiAssistant', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, streamChat: mockStreamChat };
});

const t = (key, fallback) => fallback || key;
const defaultProps = {
  company: null,
  language: 'en',
  t,
  onClose: vi.fn(),
  onOpenSettings: vi.fn(),
  onSaveToCompany: vi.fn(),
};

window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('ChatModal AI config (integration)', () => {
  beforeEach(() => {
    localStorage.clear();
    initAI('gemini', '', '', '');
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('enables chat when keys exist in localStorage but in-memory config was empty', () => {
    localStorage.setItem('aiProvider', 'gemini');
    localStorage.setItem('aiApiKey', 'AIza-integration-test');
    localStorage.setItem('aiModel', 'gemini-2.0-flash');

    render(<ChatModal {...defaultProps} />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.queryByText(/Set API key to enable AI/i)).not.toBeInTheDocument();
  });

  it('enables chat after loadAIConfigFromStorage when user saves a key (simulates settings close)', async () => {
    render(<ChatModal {...defaultProps} />);
    expect(screen.getByText(/Set API key to enable AI/i)).toBeInTheDocument();

    localStorage.setItem('aiProvider', 'gemini');
    localStorage.setItem('aiApiKey', 'AIza-saved-later');
    loadAIConfigFromStorage();

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Set API key to enable AI/i)).not.toBeInTheDocument();
  });
});
