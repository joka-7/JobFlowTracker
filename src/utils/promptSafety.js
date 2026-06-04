import { safeStr } from '../sanitize';

/** Wrap user-controlled text so it is clearly bounded in LLM prompts. */
export function delimUserField(value, maxLen = 500) {
  const s = safeStr(value).slice(0, maxLen).replace(/<<<|>>>/g, '');
  return `<<<${s}>>>`;
}
