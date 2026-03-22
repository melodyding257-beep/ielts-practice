/**
 * Generate vocabulary and long-sentence reports from passage text.
 */

// Common English words to exclude from vocabulary report
const COMMON = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were',
  'be','been','being','have','has','had','do','does','did','will','would','could','should','may','might',
  'shall','can','need','dare','ought','used','it','its','this','that','these','those','he','she','they',
  'we','you','i','me','him','her','us','them','my','your','his','our','their','what','which','who','how',
  'when','where','why','not','no','so','as','if','then','than','more','most','very','all','one','two',
  'three','each','any','some','much','many','also','even','just','there','here','now','up','out','about',
  'into','through','during','before','after','above','below','between','same','other','such','new','good',
  'own','first','last','long','great','little','time','work','people','life','year','way','day','man','men',
  'world','fact','idea','back','because','both','while','however','although','therefore','thus','hence',
  'only','well','say','said','make','like','know','take','see','come','think','look','want','give','use',
  'find','tell','ask','seem','feel','try','leave','call','keep','let','put','turn','get','set','move','play',
]);

function tokenize(text) {
  return text
    .replace(/[^a-zA-Z\s'-]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^[-']+|[-']+$/g, '').toLowerCase())
    .filter(w => w.length >= 4 && !COMMON.has(w));
}

function countSyllables(word) {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function isAdvanced(word) {
  return word.length >= 8 || countSyllables(word) >= 3;
}

export function generateVocabReport(passages) {
  const wordFreq = {};
  const passageText = passages.map(p => p.fullText || p.paragraphs?.map(par => par.text).join(' ') || '').join(' ');

  const tokens = tokenize(passageText);
  for (const w of tokens) {
    if (isAdvanced(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  // Sort by frequency then length
  const sorted = Object.entries(wordFreq)
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 40);

  return sorted.map(([word, count]) => ({
    word,
    count,
    syllables: countSyllables(word),
  }));
}

export function generateSentenceReport(passages) {
  const passageText = passages
    .map(p => p.paragraphs?.map(par => par.text).join(' ') || p.fullText || '')
    .join(' ');

  // Split into sentences
  const sentences = passageText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const complex = sentences
    .filter(s => {
      const wordCount = s.split(/\s+/).length;
      const hasClause = /\b(which|although|however|whereas|despite|nevertheless|furthermore|moreover|consequently|therefore|whilst|whereby|thereby|wherein)\b/i.test(s);
      return wordCount >= 25 || hasClause;
    })
    .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)
    .slice(0, 10);

  return complex.map(s => ({
    text: s,
    wordCount: s.split(/\s+/).length,
  }));
}
