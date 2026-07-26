import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initAI,
  getInterviewPrep,
  analyzeRejection,
  _resetRateLimitForTests,
  _setRateLimitingEnabled,
} from '../services/aiAssistant.js';

const RATE_LIMIT_MS = 3000;

/** Build a ReadableStream that yields one Gemini SSE chunk. */
function makeGeminiStream(content = 'hi') {
  const line = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: content }] } }] })}\n\n`;
  const bytes = new TextEncoder().encode(line);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function makeOkResponse(stream) {
  return { ok: true, body: stream, json: async () => ({}) };
}

function stubFetch() {
  // A fresh stream per call — a ReadableStream can only be read once.
  const mockFetch = vi.fn().mockImplementation(() => Promise.resolve(makeOkResponse(makeGeminiStream('hi'))));
  vi.stubGlobal('fetch', mockFetch);
  return mockFetch;
}

const company = { name: 'Acme Corp', role: 'Engineer', interviews: [] };

describe('AI Assistant rate limiting', () => {
  beforeEach(() => {
    _resetRateLimitForTests();
    initAI('gemini', 'AIza-test', 'gemini-2.0-flash', '');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('throttles a second call to the same action within the rate-limit window', async () => {
    _setRateLimitingEnabled(true);
    const mockFetch = stubFetch();

    await getInterviewPrep(company, 'technical', 'en', () => {});
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await expect(getInterviewPrep(company, 'technical', 'en', () => {}))
      .rejects.toThrow(/Rate limited/);
    // The throttled call must reject before ever reaching the network.
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('includes a wait time in the rate-limit error message', async () => {
    _setRateLimitingEnabled(true);
    stubFetch();

    await getInterviewPrep(company, 'technical', 'en', () => {});
    await expect(getInterviewPrep(company, 'technical', 'en', () => {}))
      .rejects.toThrow(/wait \d+s/);
  });

  it('allows the call again once the rate-limit window has elapsed', async () => {
    _setRateLimitingEnabled(true);
    const mockFetch = stubFetch();

    await getInterviewPrep(company, 'technical', 'en', () => {});
    vi.advanceTimersByTime(RATE_LIMIT_MS + 1);
    await getInterviewPrep(company, 'technical', 'en', () => {});

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throttles independently per action key', async () => {
    _setRateLimitingEnabled(true);
    const mockFetch = stubFetch();

    await getInterviewPrep(company, 'technical', 'en', () => {});
    // A different action key is unaffected by interview-prep's throttle.
    await analyzeRejection(company, 'en', () => {});

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not throttle when rate limiting is disabled', async () => {
    _setRateLimitingEnabled(false);
    const mockFetch = stubFetch();

    await getInterviewPrep(company, 'technical', 'en', () => {});
    await getInterviewPrep(company, 'technical', 'en', () => {});

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
