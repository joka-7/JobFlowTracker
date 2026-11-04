import { useCallback, useEffect, useRef, useState } from 'react';

const TOAST_DURATION_MS = 3000;

/** Shared toast-message state: was copy-pasted identically in JobTrackerApp and TasksApp. */
export function useToast() {
  const [toastMessage, setToastMessage] = useState('');
  // A newer toast restarts the clock; the older timer would otherwise hide it early.
  const timerRef = useRef(null);

  const showToast = useCallback((msg) => {
    clearTimeout(timerRef.current);
    setToastMessage(msg);
    timerRef.current = setTimeout(() => setToastMessage(''), TOAST_DURATION_MS);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { toastMessage, showToast };
}
