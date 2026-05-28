import { describe, it, expect } from 'vitest';

const STATUSES = ['applied','hr_call','tech_interview','manager_interview','home_assignment','references','offer','frozen','rejected','ghosted','withdrawn'];

// Filtering logic (mirrors what's in JobTrackerApp)
function filterCompanies(companies, searchQuery, statusFilter) {
  return companies.filter(c => {
    const nameStr = (c.name || c.company || '').toLowerCase();
    const roleStr = (c.role || c.position || '').toLowerCase();
    const searchStr = searchQuery.toLowerCase();
    const matchSearch = nameStr.includes(searchStr) || roleStr.includes(searchStr);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });
}

// Import sanitization logic
function sanitizeImport(raw) {
  return raw.map((c, idx) => ({
    ...c,
    name: c.name || c.company || 'Unnamed Company',
    role: c.role || c.position || '',
    interviews: Array.isArray(c.interviews) ? c.interviews.map(inv => ({ ...inv, type: inv.type || inv.round || '' })) : [],
    id: c.id ? String(c.id) : String(Date.now() + idx),
  }));
}

const mockCompanies = [
  { id: '1', name: 'Google', role: 'Engineer', status: 'applied' },
  { id: '2', name: 'Meta', role: 'Designer', status: 'offer' },
  { id: '3', name: 'Amazon', role: 'Engineer', status: 'rejected' },
];

describe('filterCompanies', () => {
  it('returns all when search is empty and status is all', () => {
    expect(filterCompanies(mockCompanies, '', 'all')).toHaveLength(3);
  });

  it('filters by company name', () => {
    const result = filterCompanies(mockCompanies, 'google', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Google');
  });

  it('filters by role', () => {
    const result = filterCompanies(mockCompanies, 'engineer', 'all');
    expect(result).toHaveLength(2);
  });

  it('filters by status', () => {
    const result = filterCompanies(mockCompanies, '', 'offer');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Meta');
  });

  it('combines search and status filter', () => {
    const result = filterCompanies(mockCompanies, 'engineer', 'rejected');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Amazon');
  });

  it('returns empty array when no match', () => {
    expect(filterCompanies(mockCompanies, 'xyz', 'all')).toHaveLength(0);
  });

  it('is case insensitive', () => {
    expect(filterCompanies(mockCompanies, 'GOOGLE', 'all')).toHaveLength(1);
  });
});

describe('sanitizeImport', () => {
  it('keeps existing fields', () => {
    const result = sanitizeImport([{ id: '1', name: 'Acme', role: 'Dev', status: 'applied', interviews: [] }]);
    expect(result[0].name).toBe('Acme');
    expect(result[0].role).toBe('Dev');
  });

  it('falls back to company field if name is missing', () => {
    const result = sanitizeImport([{ company: 'Acme Corp' }]);
    expect(result[0].name).toBe('Acme Corp');
  });

  it('falls back to position field if role is missing', () => {
    const result = sanitizeImport([{ name: 'Acme', position: 'Manager' }]);
    expect(result[0].role).toBe('Manager');
  });

  it('uses Unnamed Company as fallback', () => {
    const result = sanitizeImport([{}]);
    expect(result[0].name).toBe('Unnamed Company');
  });

  it('always returns an interviews array', () => {
    const result = sanitizeImport([{ name: 'Acme' }]);
    expect(Array.isArray(result[0].interviews)).toBe(true);
  });

  it('converts id to string', () => {
    const result = sanitizeImport([{ id: 123, name: 'Acme' }]);
    expect(typeof result[0].id).toBe('string');
  });
});

describe('STATUSES', () => {
  it('contains all expected status ids', () => {
    const expected = ['applied', 'hr_call', 'tech_interview', 'offer', 'rejected', 'ghosted'];
    expected.forEach(s => expect(STATUSES).toContain(s));
  });
});
