import Anthropic from '@anthropic-ai/sdk';

export const PROVIDERS = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    free: false,
    defaultModel: 'gemini-2.0-flash',
    placeholder: 'AIza...',
    infoUrl: 'https://aistudio.google.com/app/apikey',
    infoText: 'Get free key from Google AI Studio →',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    free: true,
    defaultModel: 'llama-3.1-8b-instant',
    placeholder: 'gsk_...',
    infoUrl: 'https://console.groq.com/keys',
    infoText: 'Get free key from Groq Console →',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (Local)',
    free: true,
    noKey: true,
    defaultModel: 'llama3.2',
    placeholder: 'http://localhost:11434',
    infoUrl: 'https://ollama.ai',
    infoText: 'Install Ollama on your machine →',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    free: false,
    defaultModel: 'claude-haiku-4-5-20251001',
    placeholder: 'sk-ant-...',
    infoUrl: 'https://console.anthropic.com/settings/keys',
    infoText: 'Get key from Anthropic Console →',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    free: false,
    defaultModel: 'gpt-4o-mini',
    placeholder: 'sk-...',
    infoUrl: 'https://platform.openai.com/api-keys',
    infoText: 'Get key from OpenAI Platform →',
  },
};

let config = { provider: 'gemini', apiKey: '', model: '', ollamaUrl: 'http://localhost:11434' };

export function initAI(provider, apiKey, model, ollamaUrl) {
  config = {
    provider: provider || 'gemini',
    apiKey: apiKey || '',
    model: model || PROVIDERS[provider || 'gemini']?.defaultModel || '',
    ollamaUrl: ollamaUrl || 'http://localhost:11434',
  };
}

export function isAIReady() {
  if (config.provider === 'ollama') return true;
  return !!config.apiKey;
}

export function getCurrentProvider() {
  return config.provider;
}

// SSE stream parser for OpenAI-compatible APIs (OpenAI, Groq)
async function streamOpenAICompat(url, apiKey, body, onChunk) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;
      try {
        const delta = JSON.parse(raw).choices?.[0]?.delta?.content;
        if (delta) { full += delta; onChunk(full); }
      } catch { /* skip malformed */ }
    }
  }
  return full;
}

// Gemini SSE stream
async function streamGemini(apiKey, model, prompt, onChunk) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      try {
        const text = JSON.parse(raw).candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) { full += text; onChunk(full); }
      } catch { /* skip */ }
    }
  }
  return full;
}

// Ollama newline-delimited JSON stream
async function streamOllama(baseUrl, model, prompt, onChunk) {
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: true }),
  });
  if (!res.ok) throw new Error(`Ollama error: HTTP ${res.status}. Is Ollama running?`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.response) { full += obj.response; onChunk(full); }
      } catch { /* skip */ }
    }
  }
  return full;
}

// Anthropic SDK stream
async function streamAnthropic(apiKey, model, prompt, onChunk) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const stream = await client.messages.stream({
    model,
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });
  let full = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      full += chunk.delta.text;
      onChunk(full);
    }
  }
  return full;
}

async function runStream(prompt, onChunk) {
  const { provider, apiKey, model, ollamaUrl } = config;
  switch (provider) {
    case 'gemini':
      return streamGemini(apiKey, model, prompt, onChunk);
    case 'groq':
      return streamOpenAICompat(
        'https://api.groq.com/openai/v1/chat/completions',
        apiKey,
        { model, messages: [{ role: 'user', content: prompt }] },
        onChunk,
      );
    case 'openai':
      return streamOpenAICompat(
        'https://api.openai.com/v1/chat/completions',
        apiKey,
        { model, messages: [{ role: 'user', content: prompt }] },
        onChunk,
      );
    case 'ollama':
      return streamOllama(ollamaUrl, model, prompt, onChunk);
    case 'anthropic':
      return streamAnthropic(apiKey, model, prompt, onChunk);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

const LANG = { en: 'Respond in English.', he: 'ענה בעברית.', fr: 'Réponds en français.' };

export async function getInterviewPrep(company, interviewType, language = 'en', onChunk) {
  const prompt = `You are a job search coach helping someone prepare for a ${interviewType} interview at ${company.name}.
${company.role ? `Role: ${company.role}` : ''}
${company.description ? `About the company: ${company.description}` : ''}
${company.location ? `Location: ${company.location}` : ''}

Give exactly 3 focused preparation tips. For each tip:
- Start with a bold title (e.g., **Research Their Stack**)
- Follow with 1-2 actionable sentences
- Be specific and practical

${LANG[language] || LANG.en}`;
  return runStream(prompt, onChunk);
}

export async function analyzeRejection(company, language = 'en', onChunk) {
  const interviews = Array.isArray(company.interviews) ? company.interviews : [];
  const last = interviews[interviews.length - 1];
  const r = company.rejection || {};
  const prompt = `You are a supportive job search coach. Someone was rejected from ${company.name}${company.role ? ` for the ${company.role} role` : ''}.

Rejection details:
- Method: ${r.method || 'Unknown'}
- Feedback: ${r.notes || 'No feedback provided'}
${last ? `- Last interview: ${last.type} on ${last.date || 'unknown date'}` : ''}
${last?.summary ? `- Interview notes: ${last.summary}` : ''}

Give 3 constructive, empathetic improvement suggestions. Each should:
- Start with a bold emoji + title (e.g., **💪 Strengthen Technical Skills**)
- Be actionable and specific (under 40 words)

End with one short encouraging sentence.

${LANG[language] || LANG.en}`;
  return runStream(prompt, onChunk);
}

export async function analyzePatterns(companies, language = 'en', onChunk) {
  const rejected = companies.filter(c => ['rejected', 'ghosted'].includes(c.status)).length;
  const active = companies.filter(c => !['rejected', 'ghosted', 'withdrawn'].includes(c.status)).length;
  const totalInterviews = companies.reduce((acc, c) => acc + (c.interviews?.length || 0), 0);
  const sample = companies.slice(0, 20).map(c => ({
    name: c.name, status: c.status,
    interviews: c.interviews?.length || 0,
    rejectionMethod: c.rejection?.method || '',
  }));
  const prompt = `You are a job search strategist analyzing someone's job hunt data.

Stats:
- Total applications: ${companies.length}
- Rejected/ghosted: ${rejected}
- Active processes: ${active}
- Total interviews: ${totalInterviews}

Recent applications: ${JSON.stringify(sample, null, 2)}

Identify 3 patterns or insights. For each:
- Bold title with emoji
- 1-2 sentences with a specific, actionable recommendation

${LANG[language] || LANG.en}`;
  return runStream(prompt, onChunk);
}

export async function debriefInterview(notes, context, language = 'en', onChunk) {
  const prompt = `You are an expert interview coach. Analyze these post-interview notes written by the candidate:

---
${notes}
---
${context ? `\nContext: ${context}` : ''}

Provide a structured debrief with these 4 sections:

**✅ What went well**
(2-3 bullet points of strengths shown)

**⚠️ Areas to improve**
(2-3 specific things to work on before the next interview)

**📌 Key topics covered**
(quick list of main subjects discussed)

**🎯 Action items**
(1-3 concrete next steps before next interview or follow-up)

Be direct, specific, and constructive. ${LANG[language] || LANG.en}`;
  return runStream(prompt, onChunk);
}
