import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import ChatModal from '../components/ChatModal';

// vi.hoisted ensures these are available inside the vi.mock factory (which is hoisted to top)
const { mockIsAIReady, mockStreamChat } = vi.hoisted(() => ({
  mockIsAIReady: vi.fn(() => true),
  mockStreamChat: vi.fn(async (_messages, _system, onChunk) => {
    onChunk('Test response');
    return 'Test response';
  }),
}));

vi.mock('../services/aiAssistant', () => ({
  isAIReady: mockIsAIReady,
  streamChat: mockStreamChat,
}));

const t = (key, fallback) => fallback || key;

const defaultProps = {
  company: null,
  language: 'en',
  t,
  onClose: vi.fn(),
  onOpenSettings: vi.fn(),
  onSaveToCompany: vi.fn(),
};

// jsdom does not implement scrollIntoView — stub it out globally
window.HTMLElement.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // Re-stub scrollIntoView after clearAllMocks so it stays available
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  // Reset to "AI is ready" by default for most tests
  mockIsAIReady.mockReturnValue(true);
  mockStreamChat.mockImplementation(async (_messages, _system, onChunk) => {
    onChunk('Test response');
    return 'Test response';
  });
});

describe('ChatModal', () => {
  it('renders the modal with header showing "AI Chat"', () => {
    render(<ChatModal {...defaultProps} />);
    expect(screen.getByText('AI Chat')).toBeInTheDocument();
  });

  it('shows privacy warning about personal names', () => {
    render(<ChatModal {...defaultProps} />);
    expect(screen.getByText(/Avoid writing personal names/i)).toBeInTheDocument();
  });

  it('when company prop is provided, shows company name in header', () => {
    const company = { id: '1', name: 'Acme Corp', status: 'applied', role: 'Engineer', interviews: [] };
    render(<ChatModal {...defaultProps} company={company} />);
    const header = document.querySelector('.bg-gradient-to-r');
    expect(header).toHaveTextContent('Acme Corp');
  });

  it('when company prop is provided, shows role in header', () => {
    const company = { id: '1', name: 'Acme Corp', status: 'applied', role: 'Senior Engineer', interviews: [] };
    render(<ChatModal {...defaultProps} company={company} />);
    const header = document.querySelector('.bg-gradient-to-r');
    expect(header).toHaveTextContent('Senior Engineer');
  });

  it('input field is present and accepts text', async () => {
    const user = userEvent.setup();
    render(<ChatModal {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello AI');
    expect(textarea).toHaveValue('Hello AI');
  });

  it('send button is disabled when input is empty', () => {
    render(<ChatModal {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('');
    const inputArea = textarea.closest('div');
    const sendIconBtn = inputArea.querySelector('button');
    expect(sendIconBtn).toBeDisabled();
  });

  it('send button is enabled when input has text', async () => {
    const user = userEvent.setup();
    render(<ChatModal {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');
    const inputArea = textarea.closest('div');
    const sendIconBtn = inputArea.querySelector('button');
    expect(sendIconBtn).not.toBeDisabled();
  });

  it('shows "Set API key" button when AI is not ready', () => {
    mockIsAIReady.mockReturnValue(false);
    render(<ChatModal {...defaultProps} />);
    expect(screen.getByText(/Set API key to enable AI/i)).toBeInTheDocument();
  });

  it('"Set API key" button calls onOpenSettings', async () => {
    mockIsAIReady.mockReturnValue(false);
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();
    render(<ChatModal {...defaultProps} onOpenSettings={onOpenSettings} />);
    await user.click(screen.getByText(/Set API key to enable AI/i));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('shows empty state message when no messages', () => {
    render(<ChatModal {...defaultProps} />);
    expect(screen.getByText('Start the conversation...')).toBeInTheDocument();
  });

  it('clicking X calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ChatModal {...defaultProps} onClose={onClose} />);
    const header = document.querySelector('.bg-gradient-to-r');
    const closeBtn = header.querySelector('button');
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('when onSaveToCompany is null, save button does not appear on messages', async () => {
    const user = userEvent.setup();
    const company = { id: '1', name: 'Acme Corp', status: 'applied', role: 'Engineer', interviews: [] };
    render(<ChatModal {...defaultProps} company={company} onSaveToCompany={null} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });
    expect(screen.queryByText(/save to notes/i)).not.toBeInTheDocument();
  });

  it('user message appears in the list after sending', async () => {
    const user = userEvent.setup();
    render(<ChatModal {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Tell me about this company');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    await waitFor(() => {
      expect(screen.getByText('Tell me about this company')).toBeInTheDocument();
    });
  });

  it('AI response appears in the list after sending', async () => {
    const user = userEvent.setup();
    render(<ChatModal {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    await waitFor(() => {
      expect(screen.getByText('Test response')).toBeInTheDocument();
    });
  });

  it('input is cleared after sending a message', async () => {
    const user = userEvent.setup();
    render(<ChatModal {...defaultProps} />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Hello AI');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('shows company context in empty state when company provided', () => {
    const company = { id: '1', name: 'BestCorp', status: 'applied', role: 'Dev', interviews: [] };
    render(<ChatModal {...defaultProps} company={company} />);
    expect(screen.getAllByText(/BestCorp/).length).toBeGreaterThan(0);
  });
});

describe('ChatModal simulation (mock interview)', () => {
  it('renders in simulation mode with correct title', () => {
    render(<ChatModal {...defaultProps} simulationTitle="👤 HR / Screening" autoStart={false} />);
    expect(screen.getByText('Mock Interview')).toBeInTheDocument();
    expect(screen.getByText('👤 HR / Screening')).toBeInTheDocument();
  });

  it('shows simulation empty state with theatre emoji', () => {
    render(<ChatModal {...defaultProps} simulationTitle="👤 HR" autoStart={false} />);
    expect(screen.getAllByText('🎭').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Starting your mock interview...')).toBeInTheDocument();
  });

  it('autoStart fires AI greeting and displays it', async () => {
    mockStreamChat.mockImplementationOnce(async (_messages, _system, onChunk) => {
      onChunk('Hello! I am the interviewer. Let us begin.');
      return 'Hello! I am the interviewer. Let us begin.';
    });
    render(<ChatModal {...defaultProps} simulationTitle="👤 HR" autoStart={true} systemPromptOverride="You are an interviewer." />);
    await waitFor(() => {
      expect(screen.getByText('Hello! I am the interviewer. Let us begin.')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('follow-up message prepends hidden user turn so API gets valid sequence', async () => {
    const user = userEvent.setup();
    // First call: AI greeting
    mockStreamChat.mockImplementationOnce(async (_msgs, _sys, onChunk) => {
      onChunk('Welcome! Ask me anything.'); return 'Welcome! Ask me anything.';
    });
    // Second call: user follow-up
    mockStreamChat.mockImplementationOnce(async (msgs, _sys, onChunk) => {
      // Verify messages array starts with 'user' role (our fix)
      expect(msgs[0].role).toBe('user');
      onChunk('Great question!'); return 'Great question!';
    });

    render(<ChatModal {...defaultProps} simulationTitle="👤 HR" autoStart={true} systemPromptOverride="You are an interviewer." />);
    await waitFor(() => expect(screen.getByText('Welcome! Ask me anything.')).toBeInTheDocument(), { timeout: 1000 });

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'Tell me about yourself');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    await waitFor(() => expect(screen.getByText('Great question!')).toBeInTheDocument(), { timeout: 1000 });
  });

  it('does not crash if a message content is undefined (error boundary catches it)', () => {
    // Simulate a message with undefined content — should render via error boundary, not crash
    mockStreamChat.mockImplementationOnce(async (_msgs, _sys, onChunk) => {
      onChunk(undefined); // pathological case
      return undefined;
    });
    expect(() => render(<ChatModal {...defaultProps} simulationTitle="👤 HR" autoStart={true} />)).not.toThrow();
  });
});
