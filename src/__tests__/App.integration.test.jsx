import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import '../i18n';
import App from '../App';

vi.mock('../firebase', () => ({
  auth: {},
  onAuthChange: (cb) => { cb(null); return () => {}; },
  completeRedirectSignIn: vi.fn().mockResolvedValue(null),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  loadAllItems: vi.fn().mockResolvedValue(null),
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

describe('App integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows mode selection when appMode is unset and no legacy data', () => {
    render(<App />);
    expect(screen.getByText(/How will you use JobFlowTracker/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Job Search/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Recruiting/i })).toBeInTheDocument();
  });

  it('loads recruiter UI when appMode is recruiter', () => {
    localStorage.setItem('appMode', 'recruiter');
    localStorage.setItem('hasCompletedOnboarding', '1');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Recruiter Pipeline', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Candidate/i })).toBeInTheDocument();
  });

  it('loads job seeker UI when appMode is jobseeker', () => {
    localStorage.setItem('appMode', 'jobseeker');
    localStorage.setItem('hasCompletedOnboarding', '1');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Job Search Tracker', exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Company/i })).toBeInTheDocument();
  });

  it('selecting recruiter in mode screen navigates to recruiter app', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('heading', { name: /Recruiting/i }));
    fireEvent.click(screen.getByRole('button', { name: /Get Started|התחל|Commencer/i }));
    expect(localStorage.getItem('appMode')).toBe('recruiter');
    expect(screen.getByRole('heading', { name: 'Recruiter Pipeline', exact: true })).toBeInTheDocument();
  });

  it('auto-migrates legacy data to jobseeker without mode screen', () => {
    localStorage.setItem('jobTrackerAppV2Data', JSON.stringify([{ id: '1', name: 'Old Co', status: 'applied' }]));
    render(<App />);
    expect(localStorage.getItem('appMode')).toBe('jobseeker');
    expect(screen.queryByText(/How will you use JobFlowTracker/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add Company/i })).toBeInTheDocument();
  });
});
