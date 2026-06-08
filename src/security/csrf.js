/**
 * CSRF Token Management
 * Prevents Cross-Site Request Forgery attacks on Firestore writes
 */

const CSRF_STORAGE_KEY = 'jobTracker_csrfToken';
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a new CSRF token and store it locally
 */
export function generateCSRFToken() {
  const token = {
    value: generateRandomToken(),
    createdAt: Date.now(),
    expiresAt: Date.now() + CSRF_TOKEN_EXPIRY,
  };

  sessionStorage.setItem(CSRF_STORAGE_KEY, JSON.stringify(token));
  return token.value;
}

/**
 * Get the current CSRF token (generate if missing or expired)
 */
export function getCSRFToken() {
  try {
    const stored = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (!stored) {
      return generateCSRFToken();
    }

    const token = JSON.parse(stored);
    if (Date.now() > token.expiresAt) {
      return generateCSRFToken();
    }

    return token.value;
  } catch {
    return generateCSRFToken();
  }
}

/**
 * Verify CSRF token matches stored value
 */
export function verifyCSRFToken(token) {
  try {
    const stored = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (!stored) return false;

    const parsed = JSON.parse(stored);
    if (Date.now() > parsed.expiresAt) return false;

    return parsed.value === token;
  } catch {
    return false;
  }
}

/**
 * Generate cryptographically secure random token
 */
function generateRandomToken() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback for non-browser environments
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Clear CSRF token (on logout)
 */
export function clearCSRFToken() {
  sessionStorage.removeItem(CSRF_STORAGE_KEY);
}
