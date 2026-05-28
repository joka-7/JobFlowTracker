import { describe, it, expect } from 'vitest';

// Copy of utility functions (pure, no React deps)
const safeStr = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    try { return JSON.stringify(val); } catch { return ''; }
  }
  return String(val);
};

const getInitials = (name) => {
  const strName = safeStr(name);
  if (!strName) return '?';
  return strName.substring(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
  const strName = safeStr(name);
  if (!strName) return 'bg-gray-500';
  const colors = ['bg-pink-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500'];
  const index = strName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
};

describe('safeStr', () => {
  it('returns empty string for null', () => expect(safeStr(null)).toBe(''));
  it('returns empty string for undefined', () => expect(safeStr(undefined)).toBe(''));
  it('returns string as-is', () => expect(safeStr('hello')).toBe('hello'));
  it('converts number to string', () => expect(safeStr(42)).toBe('42'));
  it('converts boolean to string', () => expect(safeStr(true)).toBe('true'));
  it('serializes object to JSON', () => expect(safeStr({ a: 1 })).toBe('{"a":1}'));
  it('returns empty string for empty input', () => expect(safeStr('')).toBe(''));
});

describe('getInitials', () => {
  it('returns first 2 chars uppercase', () => expect(getInitials('Google')).toBe('GO'));
  it('returns ? for empty string', () => expect(getInitials('')).toBe('?'));
  it('returns ? for null', () => expect(getInitials(null)).toBe('?'));
  it('handles short names', () => expect(getInitials('A')).toBe('A'));
  it('uppercases lowercase input', () => expect(getInitials('amazon')).toBe('AM'));
});

describe('getAvatarColor', () => {
  it('returns a valid tailwind bg class', () => {
    const color = getAvatarColor('Google');
    expect(color).toMatch(/^bg-\w+-500$/);
  });
  it('returns gray for empty name', () => expect(getAvatarColor('')).toBe('bg-gray-500'));
  it('returns gray for null', () => expect(getAvatarColor(null)).toBe('bg-gray-500'));
  it('is deterministic — same name always same color', () => {
    expect(getAvatarColor('Acme')).toBe(getAvatarColor('Acme'));
  });
});
