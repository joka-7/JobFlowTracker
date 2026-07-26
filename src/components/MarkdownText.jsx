/** Renders **bold** markdown segments as <strong>; everything else as plain text. */
export default function MarkdownText({ text }) {
  const safe = String(text ?? '');
  if (!safe) return null;
  const parts = safe.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}
