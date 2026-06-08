import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({
    id = Date.now(),
    message,
    action,
    onAction,
    type = 'info',
    timeout = 5000,
  }) => {
    setToasts(prev => [...prev, {
      id,
      message,
      action,
      onAction,
      type,
      timeout,
    }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
