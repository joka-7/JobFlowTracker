import Anthropic from '@anthropic-ai/sdk';

let client = null;

export function initAI(apiKey) {
  client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

export function isAIReady() {
  return client !== null;
}

export async function getInterviewPrep(company, interviewType, language = 'en', onChunk) {
  if (!client) throw new Error('AI not initialized');

  const langInstructions = {
    en: 'Respond in English.',
    he: 'ענה בעברית.',
    fr: 'Réponds en français.',
  };

  const prompt = `You are a job search coach helping someone prepare for a ${interviewType} interview at ${company.name}.
${company.role ? `Role: ${company.role}` : ''}
${company.description ? `About the company: ${company.description}` : ''}
${company.location ? `Location: ${company.location}` : ''}

Give exactly 3 focused preparation tips. For each tip:
- Start with a bold title (e.g., **Research Their Stack**)
- Follow with 1-2 actionable sentences
- Be specific and practical

${langInstructions[language] || langInstructions.en}`;

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  let fullText = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text;
      if (onChunk) onChunk(fullText);
    }
  }
  return fullText;
}

export async function analyzeRejection(company, onChunk) {
  if (!client) throw new Error('AI not initialized');

  const interviews = Array.isArray(company.interviews) ? company.interviews : [];
  const lastInterview = interviews[interviews.length - 1];
  const rejection = company.rejection || {};

  const prompt = `You are a supportive job search coach. Someone was rejected from ${company.name}${company.role ? ` for the ${company.role} role` : ''}.

Rejection details:
- Method: ${rejection.method || 'Unknown'}
- Feedback: ${rejection.notes || 'No feedback provided'}
${lastInterview ? `- Last interview: ${lastInterview.type} on ${lastInterview.date || 'unknown date'}` : ''}
${lastInterview?.summary ? `- Interview notes: ${lastInterview.summary}` : ''}

Give 3 constructive, empathetic improvement suggestions. Each should:
- Start with a bold emoji + title (e.g., **💪 Strengthen Technical Skills**)
- Be actionable and specific (under 40 words)
- Focus on what they can improve, not what went wrong

End with one short encouraging sentence.`;

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  let fullText = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text;
      if (onChunk) onChunk(fullText);
    }
  }
  return fullText;
}

export async function analyzePatterns(companies, onChunk) {
  if (!client) throw new Error('AI not initialized');

  const rejected = companies.filter(c => ['rejected', 'ghosted'].includes(c.status));
  const active = companies.filter(c => !['rejected', 'ghosted', 'withdrawn'].includes(c.status));
  const totalInterviews = companies.reduce((acc, c) => acc + (c.interviews?.length || 0), 0);

  const summary = companies.slice(0, 20).map(c => ({
    name: c.name,
    status: c.status,
    interviews: c.interviews?.length || 0,
    rejectionMethod: c.rejection?.method || '',
  }));

  const prompt = `You are a job search strategist analyzing someone's job hunt data.

Stats:
- Total applications: ${companies.length}
- Rejected/ghosted: ${rejected.length}
- Active processes: ${active.length}
- Total interviews: ${totalInterviews}

Recent applications sample: ${JSON.stringify(summary, null, 2)}

Identify 3 patterns or insights from this data. For each:
- Bold title with emoji
- 1-2 sentences with a specific, actionable recommendation

Keep it analytical and practical.`;

  const stream = await client.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  let fullText = '';
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text;
      if (onChunk) onChunk(fullText);
    }
  }
  return fullText;
}
