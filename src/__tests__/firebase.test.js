import { describe, it, expect, vi } from 'vitest';
import { formatSignInError, loadAllItems } from '../firebase';

const { batchSets, rootCompanies } = vi.hoisted(() => ({ batchSets: [], rootCompanies: { value: [] } }));

vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({}) }));
vi.mock('firebase/firestore', () => ({
  initializeFirestore: () => ({}),
  persistentLocalCache: () => ({}),
  persistentMultipleTabManager: () => ({}),
  collection: (...path) => path.slice(1).join('/'),
  doc: (...path) => path.slice(1).join('/'),
  getDocs: async () => ({ empty: true, docs: [] }),
  getDoc: async () => ({ exists: () => true, data: () => ({ companies: rootCompanies.value }) }),
  writeBatch: () => ({
    set: (ref, data) => batchSets.push({ ref, data }),
    commit: async () => {},
  }),
}));

describe('formatSignInError', () => {
  it.each([
    ['popup blocked', { code: 'auth/popup-blocked' }, /Popup blocked/],
    ['popup closed', { code: 'auth/popup-closed-by-user' }, /Sign-in cancelled/],
    ['unauthorized domain', { code: 'auth/unauthorized-domain' }, /Authorized domains/],
    ['API key referrer block', { message: 'Requests from referer https://x are blocked. API_KEY_HTTP_REFERRER_BLOCKED' },
      /isn't allowed to use Google sign-in/],
    ['invalid action', { message: 'The requested action is invalid.' }, /Google sign-in config error/],
    ['unknown error with message', { message: 'Network down' }, /^Network down$/],
    ['empty error', {}, /^Sign-in failed\.$/],
    ['null error', null, /^Sign-in failed\.$/],
  ])('%s', (_name, err, expected) => {
    expect(formatSignInError(err)).toMatch(expected);
  });

  it('never tells end users to loosen the API key restrictions', () => {
    const message = formatSignInError({ message: 'API_KEY_HTTP_REFERRER_BLOCKED' });
    expect(message).not.toMatch(/None|restriction/i);
  });
});

describe('loadAllItems legacy migration', () => {
  it('sanitizes root-doc companies before writing them, so every doc has a valid id', async () => {
    rootCompanies.value = [{ name: 'No Id Co' }, { id: 7, company: 'Numeric Id Co', extra: 'x' }];
    batchSets.length = 0;

    const migrated = await loadAllItems('uid1', 'jobseeker');

    expect(batchSets).toHaveLength(2);
    for (const { ref, data } of batchSets) {
      expect(data.id).toMatch(/^.{1,64}$/);
      expect(ref).toBe(`users/uid1/companies/${data.id}`);
      expect(data).not.toHaveProperty('extra');
    }
    expect(migrated.map((c) => c.name)).toEqual(['No Id Co', 'Numeric Id Co']);
  });
});
