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

  it('selecting job seeker saves appMode and calls onSelect', () => {
    const onSelect = vi.fn();
    render(<ModeSelection onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Job Search|חיפוש עבודה|Recherche d'emploi/i));
    expect(localStorage.getItem('appMode')).toBe('jobseeker');
    expect(onSelect).toHaveBeenCalledWith('jobseeker');
  });

  it('selecting recruiter saves appMode and calls onSelect', () => {
    const onSelect = vi.fn();
    render(<ModeSelection onSelect={onSelect} />);
    fireEvent.click(screen.getByText(/Recruiting|גיוס עובדים|Recrutement/i));
    expect(localStorage.getItem('appMode')).toBe('recruiter');
    expect(onSelect).toHaveBeenCalledWith('recruiter');
  });
});
