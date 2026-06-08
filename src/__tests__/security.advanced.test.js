import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateCSRFToken,
  getCSRFToken,
  verifyCSRFToken,
  clearCSRFToken,
} from '../security/csrf.js';
import {
  isEncrypted,
} from '../security/encryption.js';
import auditLogger, {
  AUDIT_ACTIONS,
  logItemDelete,
  logItemCreate,
  logError,
} from '../security/auditLog.js';

describe('CSRF Token Management', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearCSRFToken();
  });

  it('generates a CSRF token on demand', () => {
    const token = generateCSRFToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);
  });

  it('retrieves existing token without regenerating', () => {
    const token1 = generateCSRFToken();
    const token2 = getCSRFToken();
    expect(token1).toBe(token2);
  });

  it('regenerates expired tokens', async () => {
    const token1 = generateCSRFToken();

    // Manually expire the token
    const stored = JSON.parse(sessionStorage.getItem('jobTracker_csrfToken'));
    stored.expiresAt = Date.now() - 1000; // Expired
    sessionStorage.setItem('jobTracker_csrfToken', JSON.stringify(stored));

    const token2 = getCSRFToken();
    expect(token2).not.toBe(token1); // Should be different
  });

  it('verifies valid CSRF tokens', () => {
    const token = generateCSRFToken();
    expect(verifyCSRFToken(token)).toBe(true);
  });

  it('rejects invalid CSRF tokens', () => {
    generateCSRFToken();
    expect(verifyCSRFToken('invalid-token')).toBe(false);
  });

  it('clears CSRF token on logout', () => {
    generateCSRFToken();
    clearCSRFToken();
    expect(sessionStorage.getItem('jobTracker_csrfToken')).toBeNull();
  });
});

describe('Encryption Detection', () => {
  it('detects encrypted values', () => {
    expect(isEncrypted('enc:abc123')).toBe(true);
  });

  it('detects plaintext values', () => {
    expect(isEncrypted('plaintext')).toBe(false);
    expect(isEncrypted('sk-ant-xyz')).toBe(false);
  });
});

describe('Audit Logging', () => {
  beforeEach(() => {
    auditLogger.clearLogs();
  });

  it('logs item deletion', () => {
    logItemDelete('user123', 'company', 'comp-1', 'jobseeker');
    const logs = auditLogger.getLogsForAction(AUDIT_ACTIONS.DELETE);
    expect(logs.length).toBe(1);
    expect(logs[0].itemType).toBe('company');
    expect(logs[0].itemId).toBe('comp-1');
  });

  it('logs item creation', () => {
    logItemCreate('user123', 'candidate', 'cand-1', 'recruiter');
    const logs = auditLogger.getLogsForAction(AUDIT_ACTIONS.CREATE);
    expect(logs.length).toBe(1);
    expect(logs[0].itemType).toBe('candidate');
  });

  it('logs errors with context', () => {
    logError(AUDIT_ACTIONS.DELETE, new Error('Permission denied'), {
      itemId: 'comp-1',
      userId: 'user123',
    });
    const logs = auditLogger.getErrorLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].error).toContain('Permission denied');
  });

  it('retrieves logs for specific item', () => {
    logItemCreate('user123', 'company', 'comp-1', 'jobseeker');
    logItemCreate('user123', 'company', 'comp-2', 'jobseeker');
    logItemDelete('user123', 'company', 'comp-1', 'jobseeker');

    const logs = auditLogger.getLogsForItem('comp-1');
    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe(AUDIT_ACTIONS.DELETE);
    expect(logs[1].action).toBe(AUDIT_ACTIONS.CREATE);
  });

  it('generates summary statistics', () => {
    logItemCreate('user123', 'company', 'comp-1', 'jobseeker');
    logItemCreate('user123', 'company', 'comp-2', 'jobseeker');
    logError(AUDIT_ACTIONS.UPDATE, new Error('Test error'));

    const summary = auditLogger.getSummary();
    expect(summary.totalLogs).toBe(3);
    expect(summary.byAction[AUDIT_ACTIONS.CREATE]).toBe(2);
    expect(summary.errorCount).toBe(1);
  });

  it('maintains max log size limit', () => {
    // Create many logs
    for (let i = 0; i < 1500; i++) {
      logItemCreate('user123', 'company', `comp-${i}`, 'jobseeker');
    }

    const summary = auditLogger.getSummary();
    expect(summary.totalLogs).toBeLessThanOrEqual(1000);
  });

  it('exports logs as JSON', () => {
    logItemCreate('user123', 'company', 'comp-1', 'jobseeker');
    const exported = auditLogger.exportLogs();
    expect(typeof exported).toBe('string');
    const parsed = JSON.parse(exported);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].action).toBe(AUDIT_ACTIONS.CREATE);
  });
});
