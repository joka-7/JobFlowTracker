import { safeStr } from '../sanitize';

/** Wrap user-controlled text so it is clearly bounded in LLM prompts.
 * Escapes newlines and control characters to prevent prompt injection.
 */
export function delimUserField(value, maxLen = 500) {
  const s = safeStr(value)
    .slice(0, maxLen)
    .replace(/[\n\r\t]/g, ' ') // Strip newlines, carriage returns, tabs
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
  return `<<<${s}>>>`;
}

const isPromptSafeChar = (ch) => {
  const code = ch.charCodeAt(0);
  return code === 9 || code === 10 || (code >= 32 && code !== 127);
};

/** Fence multi-line user text (a resume, interview notes) in an LLM prompt.
 * Keeps line breaks, which these texts need, but drops angle brackets so the
 * content can never close its own `>>>` fence and continue as instructions.
 */
export function delimUserBlock(value, maxLen = 5000) {
  const s = [...safeStr(value).replace(/\r\n?/g, '\n').slice(0, maxLen)]
    .filter(isPromptSafeChar)
    .join('')
    .replace(/[<>]/g, '')
    .trim();
  return `<<<\n${s}\n>>>`;
}
