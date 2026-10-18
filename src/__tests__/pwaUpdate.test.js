import { describe, it, expect, vi, afterEach } from 'vitest';

const { registerSW, platform } = vi.hoisted(() => ({ registerSW: vi.fn(), platform: { native: false } }));
vi.mock('virtual:pwa-register', () => ({ registerSW }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => platform.native } }));

describe('initPwaUpdate', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    registerSW.mockClear();
  });

  it.each([
    ['registers the service worker on the production website', true, false, 1],
    ['skips it in development', false, false, 0],
    // Inside the APK the worker would keep serving the previous build after an update.
    ['skips it inside the Android app', true, true, 0],
  ])('%s', async (_name, prod, native, expectedCalls) => {
    vi.stubEnv('PROD', prod);
    platform.native = native;
    const { initPwaUpdate } = await import('../pwaUpdate');

    initPwaUpdate();

    expect(registerSW).toHaveBeenCalledTimes(expectedCalls);
  });
});
