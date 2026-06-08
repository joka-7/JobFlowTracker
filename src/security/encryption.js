/**
 * localStorage Encryption
 * Encrypts sensitive data (API keys) using Web Crypto API
 * Falls back to plaintext if crypto unavailable (with warning)
 */

const ENCRYPTION_PREFIX = 'enc:';

/**
 * Derive encryption key from a master key using PBKDF2
 */
async function deriveKey(masterKey, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(plaintext, masterKey = '') {
  try {
    if (!window.crypto?.subtle) {
      console.warn('Web Crypto API not available. Storing plaintext (NOT SECURE on shared devices)');
      return plaintext;
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Generate random salt and IV
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Derive encryption key
    const key = await deriveKey(masterKey, salt);

    // Encrypt
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );

    // Combine salt + iv + ciphertext and encode as base64
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    const base64 = btoa(String.fromCharCode.apply(null, combined));
    return ENCRYPTION_PREFIX + base64;
  } catch (error) {
    console.error('Encryption failed:', error);
    console.warn('Storing plaintext (NOT SECURE on shared devices)');
    return plaintext;
  }
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(ciphertext, masterKey = '') {
  try {
    // Check if data is encrypted
    if (!ciphertext.startsWith(ENCRYPTION_PREFIX)) {
      return ciphertext; // Not encrypted, return as-is
    }

    if (!window.crypto?.subtle) {
      console.warn('Web Crypto API not available. Returning stored data (may be plaintext)');
      return ciphertext.slice(ENCRYPTION_PREFIX.length);
    }

    const base64 = ciphertext.slice(ENCRYPTION_PREFIX.length);
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Extract salt, iv, and ciphertext
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const encrypted = bytes.slice(28);

    // Derive key using same parameters
    const key = await deriveKey(masterKey, salt);

    // Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    // If decryption fails, might be plaintext - return as-is
    if (ciphertext.startsWith(ENCRYPTION_PREFIX)) {
      return ciphertext.slice(ENCRYPTION_PREFIX.length);
    }
    return ciphertext;
  }
}

/**
 * Encrypt API key before storing in localStorage
 */
export async function storeApiKeySecurely(key, apiKey, masterKey = '') {
  try {
    const encrypted = await encryptData(apiKey, masterKey);
    localStorage.setItem(key, encrypted);
  } catch (error) {
    console.error('Failed to store API key securely:', error);
    // Fallback: store plaintext with warning
    console.warn('⚠️ Storing API key in plaintext - use a dedicated key manager on production');
    localStorage.setItem(key, apiKey);
  }
}

/**
 * Retrieve and decrypt API key from localStorage
 */
export async function retrieveApiKeySecurely(key, masterKey = '') {
  try {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    return await decryptData(encrypted, masterKey);
  } catch (error) {
    console.error('Failed to retrieve API key securely:', error);
    return null;
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Migrate plaintext API keys to encrypted storage
 * Call this once during app startup
 */
export async function migrateToEncryptedStorage(masterKey = '') {
  const keysToEncrypt = ['aiApiKey', 'anthropicApiKey', 'ollamaUrl'];

  for (const key of keysToEncrypt) {
    const plaintext = localStorage.getItem(key);
    if (plaintext && !isEncrypted(plaintext)) {
      try {
        const encrypted = await encryptData(plaintext, masterKey);
        localStorage.setItem(key, encrypted);
        console.log(`✓ Migrated ${key} to encrypted storage`);
      } catch (error) {
        console.error(`Failed to encrypt ${key}:`, error);
      }
    }
  }
}
