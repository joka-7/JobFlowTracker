import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeSelection from '../components/ModeSelection';
import '../i18n';

describe('ModeSelection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders job seeker and recruiter options', () => {
    const onSelect = vi.fn();
    render(<ModeSelection onSelect={onSelect} />);
    expect(screen.getByText(/Job Search|חיפוש עבודה|Recherche d'emploi/i)).toBeTruthy();
    expect(screen.getByText(/Recruiting|גיוס עובדים|Recrutement/i)).toBeTruthy();
  });

  it('Get Started is disabled until at least one mode is selected', () => {
    const onSelect = vi.fn();
    render(<ModeSelection onSelect={onSelect} />);
    const btn = screen.getByRole('button', { name: /Get Started|התחל|Commencer/i });
    expect(btn.disabled).toBe(true);
  });

  it('selecting job seeker then Get Started saves appMode and calls onSelect', () => {
    const onSelect = vi.fn();
    render(<ModeSelection onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Job Search|חיפוש עבודה|Recherche d'emploi/i));
    fireEvent.click(screen.getByRole('button', { name: /Get Started|התחל|Commencer/i }));
    expect(localStorage.getItem('appMode')).toBe('jobseeker');
    expect(JSON.parse(localStorage.getItem('enabledModes'))).toContain('jobseeker');
    expect(onSelect).toHaveBeenCalledWith('jobseeker');
  });

  it('selecting recruiter then Get Started saves appMode and calls onSelect', () => {
    const onSelect = vi.fn();
    render(<ModeSelection onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Recruiting|גיוס עובדים|Recrutement/i));
    fireEvent.click(screen.getByRole('button', { name: /Get Started|התחל|Commencer/i }));
    expect(localStorage.getItem('appMode')).toBe('recruiter');
    expect(JSON.parse(localStorage.getItem('enabledModes'))).toContain('recruiter');
    expect(onSelect).toHaveBeenCalledWith('recruiter');
  });

  it('selecting multiple modes saves all of them in enabledModes', () => {
    const onSelect = vi.fn();
    render(<ModeSelection onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Job Search|חיפוש עבודה|Recherche d'emploi/i));
    fireEvent.click(screen.getByText(/Recruiting|גיוס עובדים|Recrutement/i));
    fireEvent.click(screen.getByRole('button', { name: /Get Started|התחל|Commencer/i }));
    const enabled = JSON.parse(localStorage.getItem('enabledModes'));
    expect(enabled).toContain('jobseeker');
    expect(enabled).toContain('recruiter');
  });
});
