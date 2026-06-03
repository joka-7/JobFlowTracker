import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import Onboarding from '../components/Onboarding';

const t = (key, fallback) => fallback || key;
const i18n = { language: 'en', changeLanguage: vi.fn() };

const defaultProps = {
  t,
  i18n,
  isRTL: false,
  onClose: vi.fn(),
  openNewForm: vi.fn(),
  triggerFileInput: vi.fn(),
  openAISettings: vi.fn(),
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Onboarding', () => {
  it('renders the first step (welcome) with the title text', () => {
    render(<Onboarding {...defaultProps} />);
    expect(screen.getByText('Welcome to JobFlowTracker!')).toBeInTheDocument();
  });

  it('shows language buttons EN, עב, FR', () => {
    render(<Onboarding {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'עב' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'FR' })).toBeInTheDocument();
  });

  it('clicking "עב" calls i18n.changeLanguage("he") and stores to localStorage', async () => {
    const user = userEvent.setup();
    render(<Onboarding {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'עב' }));
    expect(i18n.changeLanguage).toHaveBeenCalledWith('he');
    expect(localStorage.getItem('appLanguage')).toBe('he');
  });

  it('clicking "EN" calls i18n.changeLanguage("en") and stores to localStorage', async () => {
    const user = userEvent.setup();
    render(<Onboarding {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    expect(localStorage.getItem('appLanguage')).toBe('en');
  });

  it('clicking "FR" calls i18n.changeLanguage("fr") and stores to localStorage', async () => {
    const user = userEvent.setup();
    render(<Onboarding {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'FR' }));
    expect(i18n.changeLanguage).toHaveBeenCalledWith('fr');
    expect(localStorage.getItem('appLanguage')).toBe('fr');
  });

  it('Skip tutorial on welcome closes onboarding and marks complete', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Onboarding {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /skip tutorial/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('hasCompletedOnboarding')).toBe('1');
    expect(screen.getByText('Welcome to JobFlowTracker!')).toBeInTheDocument();
  });

  it('clicking Next advances to step 2 (Status Board)', async () => {
    const user = userEvent.setup();
    render(<Onboarding {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Status Board')).toBeInTheDocument();
  });

  it('clicking the X button calls onClose and sets hasCompletedOnboarding in localStorage', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Onboarding {...defaultProps} onClose={onClose} />);
    // The X button is the SVG close button — find by querying the button near the language switcher
    const buttons = screen.getAllByRole('button');
    // X button comes after the language buttons in the header
    const closeBtn = buttons.find(btn =>
      btn.querySelector('svg') && !btn.textContent.trim()
    );
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('hasCompletedOnboarding')).toBe('1');
  });

  it('renders 5 step dots', () => {
    render(<Onboarding {...defaultProps} />);
    // Step dots are buttons in the header area with no text; there are 5 of them
    // We can check by counting buttons that have the dot styling (no text content, small)
    const allButtons = screen.getAllByRole('button');
    // Step dots have no text and are not the X or language buttons
    const dotButtons = allButtons.filter(btn => {
      const text = btn.textContent.trim();
      return text === '' && !btn.querySelector('svg');
    });
    expect(dotButtons).toHaveLength(5);
  });

  it('Back button is disabled on first step', () => {
    render(<Onboarding {...defaultProps} />);
    const backBtn = screen.getByRole('button', { name: /back/i });
    expect(backBtn).toBeDisabled();
  });

  it('navigating to last step shows "Let\'s go!" button', async () => {
    const user = userEvent.setup();
    render(<Onboarding {...defaultProps} />);
    const nextBtn = () => screen.getByRole('button', { name: /next/i });
    // Click through all steps (5 steps total, so 4 Next clicks)
    await user.click(nextBtn());
    await user.click(nextBtn());
    await user.click(nextBtn());
    await user.click(nextBtn());
    expect(screen.getByRole('button', { name: /let's go/i })).toBeInTheDocument();
  });

  it('"Let\'s go!" button on last step calls onClose and sets hasCompletedOnboarding', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Onboarding {...defaultProps} onClose={onClose} />);
    const nextBtn = () => screen.getByRole('button', { name: /next/i });
    await user.click(nextBtn());
    await user.click(nextBtn());
    await user.click(nextBtn());
    await user.click(nextBtn());
    const getStarted = screen.getByRole('button', { name: /let's go/i });
    await user.click(getStarted);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('hasCompletedOnboarding')).toBe('1');
  });

  it('clicking a step dot jumps directly to that step', async () => {
    const user = userEvent.setup();
    render(<Onboarding {...defaultProps} />);
    const allButtons = screen.getAllByRole('button');
    const dotButtons = allButtons.filter(btn => {
      const text = btn.textContent.trim();
      return text === '' && !btn.querySelector('svg');
    });
    // Click the 4th dot (AI step)
    await user.click(dotButtons[3]);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('Back button becomes enabled after advancing a step', async () => {
    const user = userEvent.setup();
    render(<Onboarding {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /next/i }));
    const backBtn = screen.getByRole('button', { name: /back/i });
    expect(backBtn).not.toBeDisabled();
  });
});
