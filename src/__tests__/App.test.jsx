import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

vi.mock('../firebase', () => ({
  completeRedirectSignIn: vi.fn().mockResolvedValue(null),
}));

vi.mock('../JobTrackerApp', () => ({
  default: () => { throw new Error('tracker exploded'); },
}));

vi.mock('../TasksApp', () => ({
  default: () => { throw new Error('tasks exploded'); },
}));

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it.each([
    ['jobseeker', 'tracker exploded'],
    ['recruiter', 'tracker exploded'],
    ['tasks', 'tasks exploded'],
  ])('shows the crash-recovery screen when the %s app throws', async (mode, message) => {
    localStorage.setItem('appMode', mode);

    render(<App />);

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Export my data/i })).toBeInTheDocument();
  });
});
