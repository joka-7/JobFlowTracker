import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackGestureGuard } from '../hooks/useBackGestureGuard';

function fireVersion(state) {
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
  });
}

describe('useBackGestureGuard', () => {
  beforeEach(() => {
    window.history.replaceState(null, '');
  });

  it('seeds a null sentinel entry beneath the current one on mount', () => {
    const replaceSpy = vi.spyOn(window.history, 'replaceState');
    const pushSpy = vi.spyOn(window.history, 'pushState');
    renderHook(() => useBackGestureGuard({
      activeTab: 'board', selectedId: null, onNavigate: vi.fn(), onExit: vi.fn(),
    }));
    expect(replaceSpy).toHaveBeenCalledWith(null, '');
    expect(pushSpy).toHaveBeenCalledWith({ tab: 'board', selectedId: null }, '');
    replaceSpy.mockRestore();
    pushSpy.mockRestore();
  });

  it('calls onNavigate with the popped state on a normal back/forward', () => {
    const onNavigate = vi.fn();
    const onExit = vi.fn();
    renderHook(() => useBackGestureGuard({
      activeTab: 'board', selectedId: null, onNavigate, onExit,
    }));
    fireVersion({ tab: 'list', selectedId: 'abc' });
    expect(onNavigate).toHaveBeenCalledWith('list', 'abc');
    expect(onExit).not.toHaveBeenCalled();
  });

  it('falls back to the default tab when a present-but-empty state omits tab/selectedId', () => {
    const onNavigate = vi.fn();
    renderHook(() => useBackGestureGuard({
      activeTab: 'board', selectedId: null, onNavigate, onExit: vi.fn(),
    }));
    fireVersion({ tab: undefined, selectedId: null });
    expect(onNavigate).toHaveBeenCalledWith('board', null);
  });

  it('re-arms a history entry and calls onExit when the sentinel is reached', () => {
    const onExit = vi.fn();
    const pushSpy = vi.spyOn(window.history, 'pushState');
    renderHook(() => useBackGestureGuard({
      activeTab: 'board', selectedId: null, onNavigate: vi.fn(), onExit,
    }));
    pushSpy.mockClear();
    fireVersion(null);
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(pushSpy).toHaveBeenCalledWith({ tab: 'board', selectedId: null }, '');
    pushSpy.mockRestore();
  });

  it('uses a custom defaultTab for both the exit fallback and missing-tab navigation', () => {
    const onNavigate = vi.fn();
    const onExit = vi.fn();
    renderHook(() => useBackGestureGuard({
      activeTab: 'board', selectedId: null, onNavigate, onExit, defaultTab: 'list',
    }));
    fireVersion(null);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('removes the popstate listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useBackGestureGuard({
      activeTab: 'board', selectedId: null, onNavigate: vi.fn(), onExit: vi.fn(),
    }));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('popstate', expect.any(Function));
    removeSpy.mockRestore();
  });
});
