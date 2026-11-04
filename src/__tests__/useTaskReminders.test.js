import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTaskReminders } from '../hooks/useTaskReminders';

const NOW = new Date(2026, 9, 16, 10, 0, 0);

const dueTask = {
  id: 't1',
  name: 'Call the bank',
  dueDate: '2026-10-16',
  dueTime: '10:30',
  reminder: { enabled: true, minutesBefore: 60, snoozedUntil: '' },
  lastReminderKey: '',
};

function installNotification(initialPermission) {
  const FakeNotification = vi.fn();
  FakeNotification.permission = initialPermission;
  FakeNotification.requestPermission = vi.fn(async () => {
    FakeNotification.permission = 'granted';
    return 'granted';
  });
  vi.stubGlobal('Notification', FakeNotification);
  return FakeNotification;
}

describe('useTaskReminders', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it.each([
    ['fires due tasks immediately when permission is already granted', 'granted', false, 1],
    ['does not poll while permission has not been granted', 'default', false, 0],
    ['starts polling as soon as the user grants permission', 'default', true, 1],
    ['stays silent when the user denied permission', 'denied', false, 0],
  ])('%s', async (_name, initialPermission, grant, expectedFires) => {
    installNotification(initialPermission);
    const onDue = vi.fn();

    const { result } = renderHook(() => useTaskReminders({ getTasks: () => [dueTask], onDue }));
    if (grant) {
      await act(async () => { await result.current.requestPermission(); });
    }

    expect(onDue).toHaveBeenCalledTimes(expectedFires);
    if (expectedFires) expect(onDue).toHaveBeenCalledWith([dueTask]);
  });

  it('re-checks on every interval tick without re-subscribing on re-render', () => {
    installNotification('granted');
    const onDue = vi.fn();
    let tasks = [];

    const { rerender } = renderHook(() => useTaskReminders({ getTasks: () => tasks, onDue }));
    rerender();
    tasks = [dueTask];
    act(() => { vi.advanceTimersByTime(30_000); });

    expect(onDue).toHaveBeenCalledTimes(1);
  });

  it('reports unsupported when the browser has no Notification API', async () => {
    vi.stubGlobal('Notification', undefined);
    delete window.Notification;
    const { result } = renderHook(() => useTaskReminders({ getTasks: () => [dueTask], onDue: vi.fn() }));

    let outcome;
    await act(async () => { outcome = await result.current.requestPermission(); });

    expect(outcome).toBe('unsupported');
  });
});
