import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { platform } = vi.hoisted(() => ({ platform: { native: false } }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => platform.native } }));

import { usePwaInstall } from '../usePwaInstall';

describe('usePwaInstall', () => {
  it.each([
    ['offers install in a browser tab', false, true],
    ['hides install inside the Android app, which is already installed', true, false],
  ])('%s', (_name, native, expected) => {
    platform.native = native;

    const { result } = renderHook(() => usePwaInstall());

    expect(result.current.canInstall).toBe(expected);
  });
});
