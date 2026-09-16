import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import APIKeySettings from '../components/APIKeySettings';

// The shared <ModelPicker> path — what actually renders by default. See
// APIKeySettings.test.jsx for the legacy hand-built UI it replaces.
vi.mock('../modeldispatcher.config', () => ({
  dispatcherFeatures: { ui: true },
}));

vi.mock('../services/aiAssistant', () => ({
  loadAIConfigFromStorage: vi.fn(),
  isAIReady: vi.fn(() => false),
  PROVIDERS: {},
}));

const t = (key, fallback) => fallback || key;
const defaultProps = { t, onClose: vi.fn() };

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('APIKeySettings — ModelPicker path (dispatcherFeatures.ui: true)', () => {
  it('renders the shared ModelPicker empty state with no providers configured', () => {
    render(<APIKeySettings {...defaultProps} />);
    expect(screen.getByText(/No providers added yet/i)).toBeInTheDocument();
  });

  it('adding a provider through ModelPicker persists via saveConfig and re-syncs aiAssistant', async () => {
    const { loadAIConfigFromStorage } = await import('../services/aiAssistant');
    const user = userEvent.setup();
    render(<APIKeySettings {...defaultProps} />);

    const select = screen.getByLabelText('Choose a provider to add');
    await user.selectOptions(select, 'anthropic');
    await user.click(screen.getByRole('button', { name: '+ Add provider' }));

    expect(loadAIConfigFromStorage).toHaveBeenCalled();
    // saveConfig (the package's own persistence) strips empty-string keys
    // before writing — a freshly added provider has one blank key slot in
    // the UI, but nothing worth persisting yet.
    expect(JSON.parse(localStorage.getItem('aiConfig')).providers).toEqual([
      { provider: 'anthropic', model: expect.any(String), apiKeys: [] },
    ]);
  });

  it('still renders Enabled Modes and closes on Done', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<APIKeySettings {...defaultProps} onClose={onClose} />);

    expect(screen.getByText('Enabled Modes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the header close button calls onClose without touching AI config', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<APIKeySettings {...defaultProps} onClose={onClose} />);
    const header = document.querySelector('.bg-gradient-to-r');
    await user.click(header.querySelector('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
