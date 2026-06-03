import { describe, it, expect, beforeEach } from 'vitest';
import i18n from '../i18n';
import {
  getLocalizedQuestions, getLocalizedCategoryLabel, formatQuestionList,
} from '../utils/templateQuestions';

describe('templateQuestions', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('returns English interview questions by default', () => {
    const qs = getLocalizedQuestions(i18n.t.bind(i18n), false, 'hr', ['fallback']);
    expect(qs[0]).toBe('Tell me about yourself.');
  });

  it('returns Hebrew interview questions when language is he', async () => {
    await i18n.changeLanguage('he');
    const qs = getLocalizedQuestions(i18n.t.bind(i18n), false, 'hr', ['fallback']);
    expect(qs[0]).toBe('ספר/י לי על עצמך.');
  });

  it('returns French task questions when language is fr', async () => {
    await i18n.changeLanguage('fr');
    const qs = getLocalizedQuestions(i18n.t.bind(i18n), true, 'planning', ['fallback']);
    expect(qs[0]).toContain('résultat concret');
  });

  it('localizes category labels', async () => {
    await i18n.changeLanguage('he');
    const label = getLocalizedCategoryLabel(i18n.t.bind(i18n), false, 'hr', 'HR / Screening');
    expect(label).toBe('משאבי אנוש / סינון');
  });

  it('formatQuestionList numbers questions', () => {
    expect(formatQuestionList(['A', 'B'])).toBe('1. A\n2. B');
  });
});
