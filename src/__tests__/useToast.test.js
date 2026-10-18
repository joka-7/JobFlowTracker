import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../hooks/useToast';

describe('useToast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it.each([
    ['hides a single toast after 3 s', [['first', 0]], 2999, 'first'],
    ['hides it once the 3 s are up', [['first', 0]], 3000, ''],
    ['keeps a re-shown toast for its own full 3 s', [['first', 0], ['second', 2000]], 1500, 'second'],
  ])('%s', (_name, shows, waitAfterLastMs, expected) => {
    const { result } = renderHook(() => useToast());

    for (const [message, delayMs] of shows) {
      act(() => { vi.advanceTimersByTime(delayMs); });
      act(() => { result.current.showToast(message); });
    }
    act(() => { vi.advanceTimersByTime(waitAfterLastMs); });

    expect(result.current.toastMessage).toBe(expected);
  });
});
