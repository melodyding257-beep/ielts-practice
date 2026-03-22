/**
 * Translation utility using MyMemory free API (no key required).
 * Supports chunking for long texts.
 */

const MAX_CHUNK = 450; // MyMemory free limit per request

function splitIntoChunks(text, maxLen) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? ' ' : '') + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function translateChunk(text, from = 'en', to = 'zh-CN') {
  if (!text.trim()) return '';
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.responseStatus === 200 || data.responseData?.translatedText) {
    return data.responseData.translatedText;
  }
  throw new Error(data.responseDetails || 'Translation failed');
}

// Delay between requests to avoid rate limiting
const delay = ms => new Promise(r => setTimeout(r, ms));

export async function translateText(text, onProgress) {
  if (!text || !text.trim()) return '';
  const chunks = splitIntoChunks(text.trim(), MAX_CHUNK);
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const translated = await translateChunk(chunks[i]);
    results.push(translated);
    if (onProgress) onProgress(Math.round(((i + 1) / chunks.length) * 100));
    if (i < chunks.length - 1) await delay(300);
  }
  return results.join(' ');
}

export async function translateWord(word) {
  return translateChunk(word);
}
