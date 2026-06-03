import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import APIKeySettings from '../components/APIKeySettings';

vi.mock('../services/aiAssistant', () => ({
  loadAIConfigFromStorage: vi.fn(),
  isAIReady: vi.fn(() => false),
  PROVIDERS: {
    gemini: {
      id: 'gemini',
      name: 'Google Gemini',
      free: false,
      defaultModel: 'gemini-2.0-flash',
      placeholder: 'AIza...',
      infoUrl: 'https://aistudio.google.com/app/apikey',
      infoText: 'Get free key from Google AI Studio →',
    },
    groq: {
      id: 'groq',
      name: 'Groq',
      free: true,
      defaultModel: 'llama-3.1-8b-instant',
      placeholder: 'gsk_...',
      infoUrl: 'https://console.groq.com/keys',
      infoText: 'Get free key from Groq Console →',
    },
    ollama: {
      id: 'ollama',
      name: 'Ollama (Local)',
      free: true,
      noKey: true,
      defaultModel: 'llama3.2',
      placeholder: 'http://localhost:11434',
      infoUrl: 'https://ollama.ai',
      infoText: 'Install Ollama on your machine →',
    },
    anthropic: {
      id: 'anthropic',
      name: 'Anthropic Claude',
      free: false,
      defaultModel: 'claude-haiku-4-5-20251001',
      placeholder: 'sk-ant-...',
      infoUrl: 'https://console.anthropic.com/settings/keys',
      infoText: 'Get key from Anthropic Console →',
    },
    openai: {
      id: 'openai',
      name: 'OpenAI',
      free: false,
      defaultModel: 'gpt-4o-mini',
      placeholder: 'sk-...',
      infoUrl: 'https://platform.openai.com/api-keys',
      infoText: 'Get key from OpenAI Platform →',
    },
  },
}));

const t = (key, fallback) => fallback || key;

const defaultProps = {
  t,
  onClose: vi.fn(),
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('APIKeySettings', () => {
  it('renders all 5 provider buttons', () => {
    render(<APIKeySettings {...defaultProps} />);
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
    expect(screen.getByText('Groq')).toBeInTheDocument();
    expect(screen.getByText('Ollama (Local)')).toBeInTheDocument();
    expect(screen.getByText('Anthropic Claude')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('shows FREE badge for Groq and Ollama', () => {
    render(<APIKeySettings {...defaultProps} />);
    const freeBadges = screen.getAllByText('FREE');
    expect(freeBadges).toHaveLength(2);
  });

  it('does NOT show FREE badge for Gemini, Anthropic, or OpenAI', () => {
    render(<APIKeySettings {...defaultProps} />);
    const freeBadges = screen.getAllByText('FREE');
    // Only 2 FREE badges total — Groq and Ollama
    expect(freeBadges).toHaveLength(2);
  });

  it('shows URL field when Ollama is selected', async () => {
    const user = userEvent.setup();
    render(<APIKeySettings {...defaultProps} />);
    await user.click(screen.getByText('Ollama (Local)'));
    expect(screen.getByPlaceholderText('http://localhost:11434')).toBeInTheDocument();
    expect(screen.queryByLabelText(/API Key/i)).not.toBeInTheDocument();
  });

  it('shows API key field with correct placeholder for Groq', async () => {
    const user = userEvent.setup();
    render(<APIKeySettings {...defaultProps} />);
    await user.click(screen.getByText('Groq'));
    expect(screen.getByPlaceholderText('gsk_...')).toBeInTheDocument();
  });

  it('Save button is disabled when no API key is entered for non-Ollama providers', () => {
    // Default provider is gemini, no key in localStorage
    render(<APIKeySettings {...defaultProps} />);
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).toBeDisabled();
  });

  it('Save button becomes enabled when an API key is typed', async () => {
    const user = userEvent.setup();
    render(<APIKeySettings {...defaultProps} />);
    const input = screen.getByRole('textbox', { hidden: true }) || document.querySelector('input[type="password"]');
    // Use fireEvent for password input since userEvent may not find hidden inputs easily
    const passwordInput = document.querySelector('input[type="password"]');
    fireEvent.change(passwordInput, { target: { value: 'AIzaTest123' } });
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it('Save button is enabled for Ollama (no key required)', async () => {
    const user = userEvent.setup();
    render(<APIKeySettings {...defaultProps} />);
    await user.click(screen.getByText('Ollama (Local)'));
    const saveBtn = screen.getByRole('button', { name: /save/i });
    expect(saveBtn).not.toBeDisabled();
  });

  it('clicking Save stores aiProvider, aiApiKey, and aiModel to localStorage', async () => {
    const user = userEvent.setup();
    render(<APIKeySettings {...defaultProps} />);
    // Switch to Groq and enter a key
    await user.click(screen.getByText('Groq'));
    const passwordInput = document.querySelector('input[type="password"]');
    fireEvent.change(passwordInput, { target: { value: 'gsk_testkey' } });
    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);
    expect(localStorage.getItem('aiProvider')).toBe('groq');
    expect(localStorage.getItem('aiApiKey')).toBe('gsk_testkey');
    expect(localStorage.getItem('aiModel')).toBeTruthy();
  });

  it('clicking Save for Ollama stores aiProvider and ollamaUrl to localStorage', async () => {
    const user = userEvent.setup();
    render(<APIKeySettings {...defaultProps} />);
    await user.click(screen.getByText('Ollama (Local)'));
    const saveBtn = screen.getByRole('button', { name: /save/i });
    await user.click(saveBtn);
    expect(localStorage.getItem('aiProvider')).toBe('ollama');
    expect(localStorage.getItem('ollamaUrl')).toBeTruthy();
  });

  it('show/hide password toggle changes input type', async () => {
    const user = userEvent.setup();
    render(<APIKeySettings {...defaultProps} />);
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeInTheDocument();
    // Toggle visibility — the eye button is in the same container
    const eyeBtn = passwordInput.parentElement.querySelector('button');
    await user.click(eyeBtn);
    expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
    // Toggle back
    await user.click(eyeBtn);
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  it('clicking X calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<APIKeySettings {...defaultProps} onClose={onClose} />);
    // The X button in the header has an SVG and no text, sits in the header bar
    const header = document.querySelector('.bg-gradient-to-r');
    const closeBtn = header.querySelector('button');
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls loadAIConfigFromStorage when saving', async () => {
    const { loadAIConfigFromStorage } = await import('../services/aiAssistant');
    const user = userEvent.setup();
    render(<APIKeySettings {...defaultProps} />);
    await user.click(screen.getByText('Groq'));
    const passwordInput = document.querySelector('input[type="password"]');
    fireEvent.change(passwordInput, { target: { value: 'gsk_mykey' } });
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(loadAIConfigFromStorage).toHaveBeenCalled();
  });
});
