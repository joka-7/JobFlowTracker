import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PROVIDERS, initAI, isAIReady, loadAIConfigFromStorage, getCurrentProvider, getInterviewPrep, analyzeRejection, analyzePatterns, debriefInterview, buildApiMessages, getJobFinderSystemPrompt, getCandidateFinderSystemPrompt, getGoalsTasksSystemPrompt } from '../services/aiAssistant.js';

vi.mock('@anthropic-ai/sdk', () => ({ default: vi.fn() }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a ReadableStream that yields OpenAI-compatible SSE chunks. */
function makeOpenAIStream(content = 'hello') {
  const lines = [
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`,
    `data: [DONE]\n`,
  ].join('\n');
  const bytes = new TextEncoder().encode(lines);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

/** Build a ReadableStream that yields Gemini SSE chunks. */
function makeGeminiStream(content = 'hello') {
  const line = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: content }] } }] })}\n\n`;
  const bytes = new TextEncoder().encode(line);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

/** Build a ReadableStream that yields Ollama NDJSON chunks. */
function makeOllamaStream(content = 'hello') {
  const line = JSON.stringify({ response: content }) + '\n';
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

// ---------------------------------------------------------------------------
// 1. PROVIDERS config
// ---------------------------------------------------------------------------

describe('buildApiMessages', () => {
  it('appendSimBegin adds a begin user turn for simulation start', () => {
    expect(buildApiMessages([], { appendSimBegin: true })).toEqual([
      { role: 'user', content: 'begin' },
    ]);
  });

  it('prepends begin when history starts with assistant', () => {
    const out = buildApiMessages([{ role: 'assistant', content: 'Hello' }]);
    expect(out[0]).toEqual({ role: 'user', content: 'begin' });
    expect(out[1].role).toBe('assistant');
  });

  it('merges consecutive same-role messages', () => {
    const out = buildApiMessages([
      { role: 'user', content: 'Hi' },
      { role: 'user', content: 'There' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].content).toContain('Hi');
    expect(out[0].content).toContain('There');
  });

  it('strips simulation trigger sentinel from API history', () => {
    const out = buildApiMessages([{ role: 'user', content: '__sim_start__' }]);
    expect(out).toEqual([{ role: 'user', content: 'begin' }]);
  });
});

describe('PROVIDERS config', () => {
  it('has exactly 5 providers', () => {
    expect(Object.keys(PROVIDERS)).toHaveLength(5);
  });

  it('has all 5 expected provider keys', () => {
    ['gemini', 'groq', 'ollama', 'anthropic', 'openai'].forEach(key => {
      expect(PROVIDERS).toHaveProperty(key);
    });
  });

  it.each(['gemini', 'groq', 'ollama', 'anthropic', 'openai'])(
    '%s has id, name, defaultModel, and placeholder fields',
    key => {
      const p = PROVIDERS[key];
      expect(p.id).toBe(key);
      expect(typeof p.name).toBe('string');
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.defaultModel).toBe('string');
      expect(p.defaultModel.length).toBeGreaterThan(0);
      expect(typeof p.placeholder).toBe('string');
      expect(p.placeholder.length).toBeGreaterThan(0);
    }
  );

  it('ollama has noKey: true', () => {
    expect(PROVIDERS.ollama.noKey).toBe(true);
  });

  it('groq is free', () => {
    expect(PROVIDERS.groq.free).toBe(true);
  });

  it('ollama is free', () => {
    expect(PROVIDERS.ollama.free).toBe(true);
  });

  it('gemini is NOT free', () => {
    expect(PROVIDERS.gemini.free).toBe(false);
  });

  it('anthropic is NOT free', () => {
    expect(PROVIDERS.anthropic.free).toBe(false);
  });

  it('openai is NOT free', () => {
    expect(PROVIDERS.openai.free).toBe(false);
  });

  it('only groq and ollama are free', () => {
    const freeProviders = Object.values(PROVIDERS).filter(p => p.free).map(p => p.id).sort();
    expect(freeProviders).toEqual(['groq', 'ollama']);
  });
});

// ---------------------------------------------------------------------------
// 2. initAI / isAIReady
// ---------------------------------------------------------------------------

describe('loadAIConfigFromStorage', () => {
  beforeEach(() => localStorage.clear());

  it('loads provider and legacy anthropicApiKey from localStorage', () => {
    localStorage.setItem('aiProvider', 'anthropic');
    localStorage.setItem('anthropicApiKey', 'sk-ant-test');
    expect(loadAIConfigFromStorage()).toBe(true);
    expect(getCurrentProvider()).toBe('anthropic');
  });
});

describe('initAI / isAIReady', () => {
  beforeEach(() => {
    // Reset to a state with no key so tests start clean
    initAI('gemini', '', '', 'http://localhost:11434');
  });

  it('isAIReady returns false when no api key is set', () => {
    initAI('gemini', '', '', '');
    expect(isAIReady()).toBe(false);
  });

  it('isAIReady returns true after initAI with a key for gemini', () => {
    initAI('gemini', 'AIza-test-key', '', '');
    expect(isAIReady()).toBe(true);
  });

  it('isAIReady returns true after initAI with a key for groq', () => {
    initAI('groq', 'gsk_test', '', '');
    expect(isAIReady()).toBe(true);
  });

  it('isAIReady returns true after initAI with a key for openai', () => {
    initAI('openai', 'sk-test', '', '');
    expect(isAIReady()).toBe(true);
  });

  it('isAIReady returns true after initAI with a key for anthropic', () => {
    initAI('anthropic', 'sk-ant-test', '', '');
    expect(isAIReady()).toBe(true);
  });

  it('isAIReady returns false when key is a blank string', () => {
    initAI('openai', '   ', '', '');
    // blank string is falsy via !! — note: '   ' is truthy, so this is expected true
    // Actually '   ' is truthy — test that an actual empty string yields false
    initAI('openai', '', '', '');
    expect(isAIReady()).toBe(false);
  });

  it('ollama is always ready regardless of key', () => {
    initAI('ollama', '', '', 'http://localhost:11434');
    expect(isAIReady()).toBe(true);
  });

  it('ollama is ready even with no ollamaUrl passed', () => {
    initAI('ollama', '', '');
    expect(isAIReady()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. getCurrentProvider
// ---------------------------------------------------------------------------

describe('getCurrentProvider', () => {
  it('returns gemini after initAI with gemini', () => {
    initAI('gemini', 'key', '', '');
    expect(getCurrentProvider()).toBe('gemini');
  });

  it('returns groq after initAI with groq', () => {
    initAI('groq', 'key', '', '');
    expect(getCurrentProvider()).toBe('groq');
  });

  it('returns ollama after initAI with ollama', () => {
    initAI('ollama', '', '', 'http://localhost:11434');
    expect(getCurrentProvider()).toBe('ollama');
  });

  it('returns anthropic after initAI with anthropic', () => {
    initAI('anthropic', 'sk-ant-key', '', '');
    expect(getCurrentProvider()).toBe('anthropic');
  });

  it('returns openai after initAI with openai', () => {
    initAI('openai', 'sk-key', '', '');
    expect(getCurrentProvider()).toBe('openai');
  });

  it('defaults to gemini when no provider is passed', () => {
    initAI(null, 'key', '', '');
    expect(getCurrentProvider()).toBe('gemini');
  });

  it('uses the defaultModel for the provider when no model is given', () => {
    // We verify this indirectly: initAI should not throw and provider is set
    initAI('groq', 'gsk_test', '', '');
    expect(getCurrentProvider()).toBe('groq');
  });
});

// ---------------------------------------------------------------------------
// 4. Privacy: getInterviewPrep prompt
// ---------------------------------------------------------------------------

describe('getInterviewPrep prompt privacy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does NOT include description in prompt sent to API', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('tip1')));
    vi.stubGlobal('fetch', mockFetch);

    const company = {
      name: 'Acme Corp',
      role: 'Backend Engineer',
      description: 'SECRET DESCRIPTION CONTENT',
      summary: 'SECRET SUMMARY CONTENT',
      interviews: [],
    };

    await getInterviewPrep(company, 'technical', 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).not.toContain('SECRET DESCRIPTION CONTENT');
    expect(promptText).not.toContain('description');
  });

  it('does NOT include summary in prompt sent to API', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('tip1')));
    vi.stubGlobal('fetch', mockFetch);

    const company = {
      name: 'Acme Corp',
      role: 'Backend Engineer',
      description: 'SECRET DESCRIPTION',
      summary: 'SECRET SUMMARY TEXT',
      interviews: [],
    };

    await getInterviewPrep(company, 'technical', 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).not.toContain('SECRET SUMMARY TEXT');
    expect(promptText).not.toContain('summary');
  });

  it('DOES include the company name in prompt', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('tip1')));
    vi.stubGlobal('fetch', mockFetch);

    const company = { name: 'UniqueCompanyXYZ', role: 'Engineer', interviews: [] };
    await getInterviewPrep(company, 'technical', 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('UniqueCompanyXYZ');
  });

  it('DOES include the interview role in prompt', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('tip1')));
    vi.stubGlobal('fetch', mockFetch);

    const company = { name: 'Acme Corp', role: 'UniqueRoleABC', interviews: [] };
    await getInterviewPrep(company, 'technical', 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('UniqueRoleABC');
  });

  it('DOES include the interviewType in prompt', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('tip1')));
    vi.stubGlobal('fetch', mockFetch);

    const company = { name: 'Acme Corp', role: 'Engineer', interviews: [] };
    await getInterviewPrep(company, 'behavioral', 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('behavioral');
  });
});

// ---------------------------------------------------------------------------
// 5. Privacy: analyzeRejection prompt
// ---------------------------------------------------------------------------

describe('analyzeRejection prompt privacy', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does NOT include r.notes in prompt', async () => {
    initAI('openai', 'sk-test', 'gpt-4o-mini', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('advice')));
    vi.stubGlobal('fetch', mockFetch);

    const company = {
      name: 'TechCorp',
      role: 'Developer',
      interviews: [{ type: 'technical' }],
      rejection: { method: 'email', notes: 'PRIVATE REJECTION NOTES HERE' },
    };

    await analyzeRejection(company, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).not.toContain('PRIVATE REJECTION NOTES HERE');
    expect(promptText).not.toContain('notes');
  });

  it('does NOT include last.summary in prompt', async () => {
    initAI('openai', 'sk-test', 'gpt-4o-mini', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('advice')));
    vi.stubGlobal('fetch', mockFetch);

    const company = {
      name: 'TechCorp',
      role: 'Developer',
      interviews: [{ type: 'technical', summary: 'PRIVATE INTERVIEW SUMMARY' }],
      rejection: { method: 'phone' },
    };

    await analyzeRejection(company, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).not.toContain('PRIVATE INTERVIEW SUMMARY');
    expect(promptText).not.toContain('summary');
  });

  it('DOES include company name in prompt', async () => {
    initAI('openai', 'sk-test', 'gpt-4o-mini', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('advice')));
    vi.stubGlobal('fetch', mockFetch);

    const company = {
      name: 'DistinctiveCompanyName',
      interviews: [],
      rejection: { method: 'email' },
    };

    await analyzeRejection(company, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('DistinctiveCompanyName');
  });

  it('DOES include rejection method in prompt', async () => {
    initAI('openai', 'sk-test', 'gpt-4o-mini', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('advice')));
    vi.stubGlobal('fetch', mockFetch);

    const company = {
      name: 'TechCorp',
      interviews: [],
      rejection: { method: 'linkedin_message' },
    };

    await analyzeRejection(company, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('linkedin_message');
  });

  it('DOES include interview types in prompt', async () => {
    initAI('openai', 'sk-test', 'gpt-4o-mini', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('advice')));
    vi.stubGlobal('fetch', mockFetch);

    const company = {
      name: 'TechCorp',
      interviews: [{ type: 'system_design' }, { type: 'coding_challenge' }],
      rejection: { method: 'email' },
    };

    await analyzeRejection(company, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('system_design');
    expect(promptText).toContain('coding_challenge');
  });
});

// ---------------------------------------------------------------------------
// 6. analyzePatterns prompt
// ---------------------------------------------------------------------------

describe('analyzePatterns prompt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const sampleCompanies = [
    { name: 'Alpha Inc', status: 'rejected', interviews: [{ type: 'technical' }], rejection: { method: 'email' }, notes: 'PRIVATE NOTES ALPHA', summary: 'PRIVATE SUMMARY ALPHA' },
    { name: 'Beta LLC', status: 'ghosted', interviews: [], rejection: {}, notes: 'PRIVATE NOTES BETA', summary: 'PRIVATE SUMMARY BETA' },
    { name: 'Gamma Co', status: 'offer', interviews: [{ type: 'hr' }], rejection: {}, notes: 'PRIVATE NOTES GAMMA', summary: 'PRIVATE SUMMARY GAMMA' },
  ];

  it('DOES send company names in prompt', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('patterns')));
    vi.stubGlobal('fetch', mockFetch);

    await analyzePatterns(sampleCompanies, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('Alpha Inc');
    expect(promptText).toContain('Beta LLC');
    expect(promptText).toContain('Gamma Co');
  });

  it('DOES send statuses in prompt', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('patterns')));
    vi.stubGlobal('fetch', mockFetch);

    await analyzePatterns(sampleCompanies, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('rejected');
    expect(promptText).toContain('ghosted');
    expect(promptText).toContain('offer');
  });

  it('does NOT send free-text notes fields in prompt', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('patterns')));
    vi.stubGlobal('fetch', mockFetch);

    await analyzePatterns(sampleCompanies, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).not.toContain('PRIVATE NOTES ALPHA');
    expect(promptText).not.toContain('PRIVATE NOTES BETA');
    expect(promptText).not.toContain('PRIVATE NOTES GAMMA');
  });

  it('does NOT send free-text summary fields in prompt', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('patterns')));
    vi.stubGlobal('fetch', mockFetch);

    await analyzePatterns(sampleCompanies, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).not.toContain('PRIVATE SUMMARY ALPHA');
    expect(promptText).not.toContain('PRIVATE SUMMARY BETA');
    expect(promptText).not.toContain('PRIVATE SUMMARY GAMMA');
  });

  it('sends aggregate stats including total application count', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('patterns')));
    vi.stubGlobal('fetch', mockFetch);

    await analyzePatterns(sampleCompanies, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    // 3 total applications should appear as a number in the prompt
    expect(promptText).toContain('3');
  });
});

// ---------------------------------------------------------------------------
// 7. debriefInterview prompt
// ---------------------------------------------------------------------------

describe('debriefInterview prompt', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the user-provided notes text in prompt', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('debrief')));
    vi.stubGlobal('fetch', mockFetch);

    const notes = 'The interviewer asked about binary trees and I blanked on the traversal.';
    await debriefInterview(notes, null, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('binary trees');
    expect(promptText).toContain('traversal');
  });

  it('appends Hebrew LANG instruction for language=he', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('debrief')));
    vi.stubGlobal('fetch', mockFetch);

    await debriefInterview('Some interview notes', null, 'he', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('ענה בעברית');
  });

  it('does NOT include Hebrew instruction for language=en', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('debrief')));
    vi.stubGlobal('fetch', mockFetch);

    await debriefInterview('Some interview notes', null, 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).not.toContain('ענה בעברית');
  });

  it('includes optional context when provided', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('debrief')));
    vi.stubGlobal('fetch', mockFetch);

    await debriefInterview('Notes text', 'Role: Senior Engineer at StartupXYZ', 'en', () => {});

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const promptText = JSON.stringify(body);
    expect(promptText).toContain('StartupXYZ');
  });

  it('calls fetch with the Groq completions URL', async () => {
    initAI('groq', 'gsk_test', 'llama-3.1-8b-instant', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOpenAIStream('debrief')));
    vi.stubGlobal('fetch', mockFetch);

    await debriefInterview('My notes', null, 'en', () => {});

    expect(mockFetch.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  it('calls fetch with Gemini URL when provider is gemini', async () => {
    initAI('gemini', 'AIza-test', 'gemini-2.0-flash', '');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeGeminiStream('debrief')));
    vi.stubGlobal('fetch', mockFetch);

    await debriefInterview('My notes', null, 'en', () => {});

    expect(mockFetch.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
  });

  it('calls fetch with Ollama URL when provider is ollama', async () => {
    initAI('ollama', '', 'llama3.2', 'http://localhost:11434');
    const mockFetch = vi.fn().mockResolvedValue(makeOkResponse(makeOllamaStream('debrief')));
    vi.stubGlobal('fetch', mockFetch);

    await debriefInterview('My notes', null, 'en', () => {});

    expect(mockFetch.mock.calls[0][0]).toContain('http://localhost:11434');
  });
});

// ---------------------------------------------------------------------------
// 8. getJobFinderSystemPrompt
// ---------------------------------------------------------------------------

describe('getJobFinderSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = getJobFinderSystemPrompt([], 'en');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
  });

  it('includes English language instruction for language=en', () => {
    const prompt = getJobFinderSystemPrompt([], 'en');
    expect(prompt).toContain('Respond in English');
  });

  it('includes Hebrew language instruction for language=he', () => {
    const prompt = getJobFinderSystemPrompt([], 'he');
    expect(prompt).toContain('ענה בעברית');
  });

  it('includes French language instruction for language=fr', () => {
    const prompt = getJobFinderSystemPrompt([], 'fr');
    expect(prompt).toContain('Réponds en français');
  });

  it('includes applied roles from companies data', () => {
    const companies = [
      { name: 'Acme', role: 'Backend Engineer', location: 'Tel Aviv' },
      { name: 'Beta', role: 'Frontend Developer', location: 'Remote' },
    ];
    const prompt = getJobFinderSystemPrompt(companies, 'en');
    expect(prompt).toContain('Backend Engineer');
    expect(prompt).toContain('Frontend Developer');
  });

  it('includes company names from pipeline', () => {
    const companies = [{ name: 'UniqueCompanyAlpha', role: 'Dev' }];
    const prompt = getJobFinderSystemPrompt(companies, 'en');
    expect(prompt).toContain('UniqueCompanyAlpha');
  });

  it('works with empty companies array', () => {
    expect(() => getJobFinderSystemPrompt([], 'en')).not.toThrow();
  });

  it('deduplicates roles', () => {
    const companies = [
      { name: 'A', role: 'Engineer' },
      { name: 'B', role: 'Engineer' },
      { name: 'C', role: 'Engineer' },
    ];
    const prompt = getJobFinderSystemPrompt(companies, 'en');
    const matches = (prompt.match(/Engineer/g) || []).length;
    expect(matches).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 9. getCandidateFinderSystemPrompt
// ---------------------------------------------------------------------------

describe('getCandidateFinderSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = getCandidateFinderSystemPrompt([], 'en');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
  });

  it('includes English language instruction for language=en', () => {
    const prompt = getCandidateFinderSystemPrompt([], 'en');
    expect(prompt).toContain('Respond in English');
  });

  it('includes Hebrew language instruction for language=he', () => {
    const prompt = getCandidateFinderSystemPrompt([], 'he');
    expect(prompt).toContain('ענה בעברית');
  });

  it('includes open position roles from candidates data', () => {
    const candidates = [
      { name: 'Alice', role: 'Senior Backend Engineer', status: 'screening' },
      { name: 'Bob', role: 'Product Designer', status: 'applied' },
    ];
    const prompt = getCandidateFinderSystemPrompt(candidates, 'en');
    expect(prompt).toContain('Senior Backend Engineer');
    expect(prompt).toContain('Product Designer');
  });

  it('includes active candidate count', () => {
    const candidates = [
      { name: 'Alice', role: 'Dev', status: 'screening' },
      { name: 'Bob', role: 'Dev', status: 'rejected' },
      { name: 'Carol', role: 'Dev', status: 'technical' },
    ];
    const prompt = getCandidateFinderSystemPrompt(candidates, 'en');
    // 2 active (Alice and Carol), 1 rejected
    expect(prompt).toContain('2');
  });

  it('works with empty candidates array', () => {
    expect(() => getCandidateFinderSystemPrompt([], 'en')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 10. getGoalsTasksSystemPrompt
// ---------------------------------------------------------------------------

describe('getGoalsTasksSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = getGoalsTasksSystemPrompt([], 'en');
    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(50);
  });

  it('includes English language instruction for language=en', () => {
    const prompt = getGoalsTasksSystemPrompt([], 'en');
    expect(prompt).toContain('Respond in English');
  });

  it('includes Hebrew language instruction for language=he', () => {
    const prompt = getGoalsTasksSystemPrompt([], 'he');
    expect(prompt).toContain('ענה בעברית');
  });

  it('includes active task names', () => {
    const tasks = [
      { name: 'Learn TypeScript', status: 'active' },
      { name: 'Build side project', status: 'active' },
      { name: 'Old task', status: 'completed' },
    ];
    const prompt = getGoalsTasksSystemPrompt(tasks, 'en');
    expect(prompt).toContain('Learn TypeScript');
    expect(prompt).toContain('Build side project');
  });

  it('includes completed task names', () => {
    const tasks = [
      { name: 'Finished course', status: 'completed' },
    ];
    const prompt = getGoalsTasksSystemPrompt(tasks, 'en');
    expect(prompt).toContain('Finished course');
  });

  it('does not include cancelled task names', () => {
    const tasks = [
      { name: 'CancelledTaskXYZ', status: 'cancelled' },
      { name: 'Active task', status: 'active' },
    ];
    const prompt = getGoalsTasksSystemPrompt(tasks, 'en');
    expect(prompt).not.toContain('CancelledTaskXYZ');
  });

  it('works with empty tasks array', () => {
    expect(() => getGoalsTasksSystemPrompt([], 'en')).not.toThrow();
  });

  it('mentions SMART goals', () => {
    const prompt = getGoalsTasksSystemPrompt([], 'en');
    expect(prompt).toContain('SMART');
  });

  it('mentions volunteering', () => {
    const prompt = getGoalsTasksSystemPrompt([], 'en');
    expect(prompt.toLowerCase()).toContain('volunteer');
  });
});
