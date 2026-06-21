import { describe, it, expect } from 'vitest';
import { normalizeInterviewType } from '../statuses.js';

describe('normalizeInterviewType', () => {
  it('maps Hebrew labels back to canonical keys', () => {
    expect(normalizeInterviewType('ראיון טכני')).toBe('Technical Interview');
    expect(normalizeInterviewType('מבחן בית / מטלה')).toBe('Home Assignment / Task');
    expect(normalizeInterviewType('מטלת בית')).toBe('Home Assignment / Task');
  });
  it('maps French labels', () => {
    expect(normalizeInterviewType('Entretien technique')).toBe('Technical Interview');
  });
  it('leaves canonical keys and unknown/empty untouched', () => {
    expect(normalizeInterviewType('Technical Interview')).toBe('Technical Interview');
    expect(normalizeInterviewType('Custom thing')).toBe('Custom thing');
    expect(normalizeInterviewType('')).toBe('');
  });
});
