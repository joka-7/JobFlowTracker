import { useState, useEffect, useRef, useCallback } from 'react';
import { shouldNotifyTask, requestReminderPermission } from '../utils/reminders';

const POLL_MS = 30_000;

function currentPermission() {
  return typeof window !== 'undefined' && 'Notification' in window && window.Notification
    ? window.Notification.permission
    : 'unsupported';
}

/**
 * Polls for tasks whose reminder is due while notifications are permitted and
 * hands them to `onDue`.
 *
 * Permission lives in state so granting it starts polling right away; reading
 * it once on mount left reminders silent until the next reload. `getTasks` and
 * `onDue` are read through a ref so a caller's fresh closures on every render
 * never tear down and restart the interval.
 */
export function useTaskReminders({ getTasks, onDue }) {
  const [permission, setPermission] = useState(currentPermission);
  const callbacksRef = useRef({ getTasks, onDue });
  useEffect(() => {
    callbacksRef.current = { getTasks, onDue };
  });

  useEffect(() => {
    if (permission !== 'granted') return undefined;
    const check = () => {
      const { getTasks: read, onDue: fire } = callbacksRef.current;
      // Arrow on purpose: passing shouldNotifyTask straight to filter() feeds
      // the array index in as its `now` argument, so nothing was ever due.
      const due = read().filter((task) => shouldNotifyTask(task));
      if (due.length > 0) fire(due);
    };
    check();
    const timer = setInterval(check, POLL_MS);
    return () => clearInterval(timer);
  }, [permission]);

  const requestPermission = useCallback(async () => {
    const result = await requestReminderPermission();
    setPermission(currentPermission());
    return result;
  }, []);

  return { permission, requestPermission };
}
