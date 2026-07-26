/**
 * Save text content to a file the user picks.
 *
 * Where the File System Access API is available (Chromium-based browsers) the
 * user gets a native "Save As" dialog and can choose the destination folder and
 * filename. Elsewhere (Firefox, Safari) it falls back to a standard download to
 * the browser's default download location.
 */
async function saveTextFile(suggestedName, content, { mimeType, description, extensions }) {
  if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [{ description, accept: { [mimeType]: extensions } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err) {
      // User dismissed the picker — don't fall back, just report no save.
      if (err && err.name === 'AbortError') return false;
      // Any other failure (e.g. permission): fall through to the classic download.
    }
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * @param {string} suggestedName - default filename, e.g. "job-tracker-backup.json"
 * @param {unknown} data - value to serialize as pretty-printed JSON
 * @returns {Promise<boolean>} true if saved, false if the user cancelled the picker
 */
export async function saveJsonFile(suggestedName, data) {
  // Prefix a UTF-8 BOM so apps that don't sniff the encoding (Windows Notepad,
  // Excel) render non-Latin text (Hebrew, etc.) correctly instead of as mojibake.
  const json = '﻿' + JSON.stringify(data, null, 2);
  return saveTextFile(suggestedName, json, {
    mimeType: 'application/json',
    description: 'JSON file',
    extensions: ['.json'],
  });
}

/**
 * @param {string} suggestedName - default filename, e.g. "job-tracker-export.csv"
 * @param {string} csvText - CSV content (without a BOM — one is added here)
 * @returns {Promise<boolean>} true if saved, false if the user cancelled the picker
 */
export async function saveCsvFile(suggestedName, csvText) {
  const csv = '﻿' + csvText;
  return saveTextFile(suggestedName, csv, {
    mimeType: 'text/csv',
    description: 'CSV file',
    extensions: ['.csv'],
  });
}
