import { describe, it, expect } from 'vitest';
import { safeStr, sanitizeTrackerRecords } from '../sanitize';

// --- safeUrl (mirrors JobTrackerApp.jsx) ---
const safeUrl = (val) => {
  try {
    const str = safeStr(val).trim();
    if (!str) return null;
    const withScheme = /^https?:\/\//i.test(str) ? str : `https://${str}`;
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.href;
  } catch { return null; }
};

const sanitizeImport = sanitizeTrackerRecords;

// ─── safeUrl tests ───────────────────────────────────────────────────────────

describe('safeUrl — valid URLs', () => {
  it('passes https URL as-is', () => {
    expect(safeUrl('https://google.com')).toBe('https://google.com/');
  });
  it('passes http URL as-is', () => {
    expect(safeUrl('http://google.com')).toBe('http://google.com/');
  });
  it('prepends https:// when scheme is missing', () => {
    expect(safeUrl('google.com')).toBe('https://google.com/');
  });
  it('handles URLs with paths', () => {
    expect(safeUrl('https://linkedin.com/in/user')).toBe('https://linkedin.com/in/user');
  });
});

describe('safeUrl — blocks dangerous inputs', () => {
  it('blocks javascript: URI', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
  });
  it('blocks data: URI', () => {
    expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });
  it('blocks vbscript: URI', () => {
    expect(safeUrl('vbscript:msgbox(1)')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(safeUrl('')).toBeNull();
  });
  it('returns null for null', () => {
    expect(safeUrl(null)).toBeNull();
  });
  it('returns null for invalid URL', () => {
    expect(safeUrl('not a url !!!')).toBeNull();
  });
});

// ─── sanitizeImport tests ────────────────────────────────────────────────────

describe('sanitizeImport — basic field mapping', () => {
  it('maps name and role correctly', () => {
    const result = sanitizeImport([{ name: 'Google', role: 'Engineer' }]);
    expect(result[0].name).toBe('Google');
    expect(result[0].role).toBe('Engineer');
  });
  it('falls back to company field for name', () => {
    const result = sanitizeImport([{ company: 'Meta' }]);
    expect(result[0].name).toBe('Meta');
  });
  it('falls back to position field for role', () => {
    const result = sanitizeImport([{ name: 'Acme', position: 'Designer' }]);
    expect(result[0].role).toBe('Designer');
  });
  it('generates id when missing', () => {
    const result = sanitizeImport([{ name: 'Test' }]);
    expect(result[0].id).toBeTruthy();
  });
  it('truncates long id to 64 chars', () => {
    const longId = 'a'.repeat(200);
    const result = sanitizeImport([{ id: longId, name: 'Test' }]);
    expect(result[0].id.length).toBeLessThanOrEqual(64);
  });
});

describe('sanitizeImport — strips unknown fields', () => {
  it('does not copy unknown fields from input', () => {
    const result = sanitizeImport([{ name: 'Evil', __proto__: { admin: true }, malicious: 'payload', eval: 'code' }]);
    expect(result[0].malicious).toBeUndefined();
    expect(result[0].eval).toBeUndefined();
  });
  it('does not allow prototype pollution', () => {
    sanitizeImport([{ name: 'Test', '__proto__': { polluted: true } }]);
    expect({}.polluted).toBeUndefined();
  });
});

describe('sanitizeImport — interview sanitization', () => {
  it('sanitizes interview fields', () => {
    const result = sanitizeImport([{
      name: 'Test',
      interviews: [{ type: 'Technical Interview', date: '2024-01-01', interviewer: 'Bob', summary: 'Good' }],
    }]);
    expect(result[0].interviews[0].type).toBe('Technical Interview');
    expect(result[0].interviews[0].date).toBe('2024-01-01');
  });
  it('falls back to round field for type', () => {
    const result = sanitizeImport([{ name: 'Test', interviews: [{ round: 'HR' }] }]);
    expect(result[0].interviews[0].type).toBe('HR');
  });
  it('strips unknown interview fields', () => {
    const result = sanitizeImport([{ name: 'Test', interviews: [{ type: 'HR', injected: 'bad' }] }]);
    expect(result[0].interviews[0].injected).toBeUndefined();
  });
  it('caps interviews at 100 entries', () => {
    const manyInterviews = Array.from({ length: 200 }, (_, i) => ({ type: `Round ${i}` }));
    const result = sanitizeImport([{ name: 'Test', interviews: manyInterviews }]);
    expect(result[0].interviews.length).toBe(100);
  });
});

describe('sanitizeImport — rejection sanitization', () => {
  it('sanitizes rejection fields', () => {
    const result = sanitizeImport([{ name: 'Test', rejection: { date: '2024-01-01', method: 'Email', notes: 'No fit' } }]);
    expect(result[0].rejection.method).toBe('Email');
  });
  it('defaults rejection to empty when missing', () => {
    const result = sanitizeImport([{ name: 'Test' }]);
    expect(result[0].rejection).toEqual({ date: '', method: '', notes: '' });
  });
  it('defaults rejection to empty when not an object', () => {
    const result = sanitizeImport([{ name: 'Test', rejection: 'bad' }]);
    expect(result[0].rejection).toEqual({ date: '', method: '', notes: '' });
  });
});
