import { useEffect } from 'react';

/**
 * Prevents a PWA back-gesture (or a final "back" press) from exiting the app:
 * seeds a null "sentinel" history entry beneath the current one, and when a
 * popstate reaches it, re-arms a fresh entry and calls `onExit` instead of
 * letting the browser navigate away from the app entirely. Any other popstate
 * (normal in-app back/forward) is forwarded to `onNavigate(tab, itemId)`.
 */
export function useBackGestureGuard({ activeTab, selectedId, onNavigate, onExit, defaultTab = 'board' }) {
  useEffect(() => {
    window.history.replaceState(null, '');
    window.history.pushState({ tab: activeTab, selectedId }, '');

    const onPop = (e) => {
      const s = e.state;
      if (!s) {
        window.history.pushState({ tab: defaultTab, selectedId: null }, '');
        onExit();
        return;
      }
      onNavigate(s.tab || defaultTab, s.selectedId || null);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
