/**
 * Split text into overlapping chunks for embedding
 * Target: 500 words per chunk, 75 word overlap
 * Small docs (< 600 words) = single chunk
 *
 * @param {string} text - Text to chunk
 * @returns {Array<{text: string, index: number}>} Array of chunks
 */
export function chunkText(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const words = text.split(/\s+/).filter(w => w.length > 0);

  // Small documents get a single chunk
  if (words.length < 600) {
    return [{ text: text.trim(), index: 0 }];
  }

  const TARGET_SIZE = 500;
  const OVERLAP = 75;
  const STEP = TARGET_SIZE - OVERLAP;

  const chunks = [];
  let chunkIndex = 0;

  for (let start = 0; start < words.length; start += STEP) {
    const end = Math.min(start + TARGET_SIZE, words.length);
    const chunkWords = words.slice(start, end);
    const chunkText = chunkWords.join(' ');

    chunks.push({
      text: chunkText,
      index: chunkIndex
    });

    chunkIndex++;

    // Stop if we've reached the end
    if (end >= words.length) {
      break;
    }
  }

  return chunks;
}
