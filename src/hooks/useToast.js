import { useCallback, useState } from 'react';

const TOAST_DURATION_MS = 3000;

/** Shared toast-message state: was copy-pasted identically in JobTrackerApp and TasksApp. */
export function useToast() {
  const [toastMessage, setToastMessage] = useState('');

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), TOAST_DURATION_MS);
  }, []);

  return { toastMessage, showToast };
}
