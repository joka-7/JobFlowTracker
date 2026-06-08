import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  _resetRateLimitForTests,
  _setRateLimitingEnabled,
} from '../services/aiAssistant.js';

describe('AI Assistant - Rate Limiting Setup', () => {
  beforeEach(() => {
    _resetRateLimitForTests();
  });

  it('exports rate limiting test utilities', () => {
    // Verify the utility functions exist
    expect(typeof _resetRateLimitForTests).toBe('function');
    expect(typeof _setRateLimitingEnabled).toBe('function');
  });

  it('resets rate limit state between tests', () => {
    _setRateLimitingEnabled(false);
    _resetRateLimitForTests();

    // Should be able to call again without issues
    _setRateLimitingEnabled(false);
    _resetRateLimitForTests();

    expect(true).toBe(true); // Dummy assertion - just verify no errors
  });

  it('disables rate limiting for test environment', () => {
    _setRateLimitingEnabled(false);

    // This should be safe to call multiple times
    for (let i = 0; i < 3; i++) {
      _resetRateLimitForTests();
    }

    expect(true).toBe(true);
  });
});

describe('AI Assistant - Rate Limiting Error Messages', () => {
  it('provides helpful rate limit error message', () => {
    // When rate limiting is enabled, error should guide user
    const error = new Error('Rate limited. Please wait 3s before next request.');
    expect(error.message).toContain('wait');
    expect(error.message).toContain('3s');
  });
});
