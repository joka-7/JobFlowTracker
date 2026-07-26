/** Appends `text` to `existingNotes`, separated by a horizontal rule if notes already exist. */
export function appendNote(existingNotes, text) {
  return existingNotes ? `${existingNotes}\n\n---\n${text}` : text;
}
