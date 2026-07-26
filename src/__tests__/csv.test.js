import { describe, it, expect } from 'vitest';
import { toCSV } from '../utils/csv';

describe('toCSV', () => {
  it('builds a header row from column labels and one row per record', () => {
    const records = [{ name: 'Acme', role: 'Engineer' }, { name: 'Globex', role: 'Manager' }];
    const columns = [{ key: 'name', label: 'Name' }, { key: 'role', label: 'Role' }];
    expect(toCSV(records, columns)).toBe('Name,Role\r\nAcme,Engineer\r\nGlobex,Manager');
  });

  it('quotes fields containing commas, quotes, or newlines', () => {
    const records = [{ notes: 'Hello, "world"\nnext line' }];
    const columns = [{ key: 'notes', label: 'Notes' }];
    expect(toCSV(records, columns)).toBe('Notes\r\n"Hello, ""world""\nnext line"');
  });

  it('renders null/undefined as an empty field', () => {
    const records = [{ a: null, b: undefined, c: 0 }];
    const columns = [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }, { key: 'c', label: 'C' }];
    expect(toCSV(records, columns)).toBe('A,B,C\r\n,,0');
  });

  it('supports a get() accessor for derived/nested values', () => {
    const records = [{ rejection: { date: '2024-01-01' } }];
    const columns = [{ key: 'rejectionDate', label: 'Rejection Date', get: r => r.rejection?.date }];
    expect(toCSV(records, columns)).toBe('Rejection Date\r\n2024-01-01');
  });

  it('returns just the header for an empty record list', () => {
    expect(toCSV([], [{ key: 'a', label: 'A' }])).toBe('A');
  });
});
