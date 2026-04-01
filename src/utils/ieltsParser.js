/**
 * IELTS Reading Paper Parser — v4
 * Robust against real IELTS PDF layouts.
 */

function clean(text) {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/---PAGE---/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/R E A D I N G PA S S A G E/g, 'READING PASSAGE')
    .trim();
}

// ─── Passage parsing ─────────────────────────────────────────────────────────

function parsePassage(block, number) {
  const lines = block.split('\n');
  let title = '';
  let subtitle = '';
  const paragraphs = [];
  let currentLabel = null;
  let currentText = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^READING PASSAGE\s*\d*/i.test(line)) continue;
    if (/^you should spend/i.test(line)) continue;
    if (/^which are based on/i.test(line)) continue;

    // Paragraph label: single letter A-Z at start, followed by text (any amount of whitespace)
    // The label itself may be followed by 1 or more spaces/tabs
    const labelMatch = line.match(/^([A-Z])\s+(.+)/);
    if (labelMatch) {
      if (currentLabel !== null && currentText.trim()) {
        paragraphs.push({ label: currentLabel, text: currentText.trim() });
      }
      currentLabel = labelMatch[1];
      currentText = labelMatch[2];
      continue;
    }

    if (currentLabel !== null) {
      currentText += ' ' + line;
    } else if (!title) {
      title = line;
    } else if (!subtitle) {
      subtitle = line;
    }
  }

  if (currentLabel !== null && currentText.trim()) {
    paragraphs.push({ label: currentLabel, text: currentText.trim() });
  }

  if (paragraphs.length === 0) {
    // Fallback: split by double newlines
    const chunks = block.split(/\n\n+/).filter(c => c.trim().length > 40);
    chunks.forEach((chunk, idx) => {
      const trimmed = chunk.trim();
      if (!title && idx === 0) { title = trimmed.substring(0, 80); return; }
      paragraphs.push({ label: String.fromCharCode(65 + paragraphs.length), text: trimmed });
    });
  }

  return { number, title: title.trim(), subtitle: subtitle.trim(), paragraphs,
           fullText: paragraphs.map(p => p.text).join('\n\n') };
}

// ─── Answer key ─────────────────────────────────────────────────────────────

function extractAnswerKey(text) {
  const key = {};
  const dense = /\b(\d{1,2})[.:)]\s*([A-Z][A-Z\s]*?)(?=\s+\d{1,2}[.:)]|\s*$)/gm;
  let m;
  while ((m = dense.exec(text)) !== null) {
    const num = parseInt(m[1]);
    const ans = m[2].trim();
    if (num >= 1 && num <= 50 && ans.length <= 30) key[num] = ans;
  }
  return key;
}

// ─── Question type ───────────────────────────────────────────────────────────

function detectType(instr) {
  const t = instr.toLowerCase();
  if (t.includes('paragraph') && t.includes('letter') && (t.includes('a') || t.includes('a–f'))) return 'MATCHING_PARAGRAPHS';
  if (t.includes('true') && t.includes('false') && t.includes('not given')) return 'TRUE_FALSE_NOT_GIVEN';
  if (t.includes('yes') && t.includes('no') && t.includes('not given')) return 'YES_NO_NOT_GIVEN';
  if (t.includes('choose') && t.includes('letter')) return 'MULTIPLE_CHOICE';
  if (t.includes('match') && !t.includes('paragraph')) return 'MATCHING';
  if (t.includes('heading')) return 'MATCHING_HEADINGS';
  if (t.includes('summary') || t.includes('notes') || t.includes('table') || t.includes('flow')) return 'SUMMARY_COMPLETION';
  if (t.includes('no more than')) return 'SHORT_ANSWER';
  if (t.includes('complet') || t.includes('fill')) return 'SENTENCE_COMPLETION';
  return 'SHORT_ANSWER';
}

// ─── Parse questions ────────────────────────────────────────────────────────

function parseQuestions(block, type, answerKey) {
  const questions = [];
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  // "27 text" or "27. text" or "27) text" — number may have optional separator
  const qRe = /^(\d{1,2})(?:[.)])?\s+(.+)/;
  let currentQ = null;
  let currentOpts = [];

  const save = () => {
    if (!currentQ) return;
    const q = { number: currentQ.num, text: currentQ.text.trim(), type };
    if (type === 'TRUE_FALSE_NOT_GIVEN') q.options = ['TRUE', 'FALSE', 'NOT GIVEN'];
    else if (type === 'YES_NO_NOT_GIVEN') q.options = ['YES', 'NO', 'NOT GIVEN'];
    else if (type === 'MATCHING_PARAGRAPHS') q.options = ['A','B','C','D','E','F','G'];
    else if (type === 'MULTIPLE_CHOICE' && currentOpts.length > 0) q.options = [...currentOpts];
    if (answerKey[currentQ.num]) q.answer = answerKey[currentQ.num];
    questions.push(q);
    currentOpts = []; currentQ = null;
  };

  for (const line of lines) {
    if (/^(questions?|NB|write|choose|in boxes|answer sheet|do the following)/i.test(line)) continue;
    if (/^(TRUE|FALSE|NOT GIVEN|YES|NO)\s*$/i.test(line)) continue;
    if (/^if the statement/i.test(line)) continue;

    const qMatch = line.match(qRe);
    if (qMatch) {
      const num = parseInt(qMatch[1]);
      const text = qMatch[2].trim();
      if (num >= 1 && num <= 100 && text.length > 2) { save(); currentQ = { num, text }; continue; }
    }

    const optMatch = line.match(/^([A-H])[.)]\s*(.+)/);
    if (optMatch && currentQ && (type === 'MULTIPLE_CHOICE' || type === 'MATCHING_HEADINGS')) {
      currentOpts.push({ label: optMatch[1], text: optMatch[2].trim() }); continue;
    }

    if (currentQ) currentQ.text += ' ' + line;
  }
  save();
  return questions;
}

// ─── Parse question sets ────────────────────────────────────────────────────

function parseQuestionSets(text, answerKey) {
  const sets = [];
  const headerRe = /Questions?\s+(\d{1,2})\s*[–\-—]\s*(\d{1,2})/gi;
  const matches = [...text.matchAll(headerRe)];
  if (matches.length === 0) return sets;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = parseInt(m[1]);
    const end = parseInt(m[2]);
    const blockStart = m.index;
    const blockEnd = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const block = text.slice(blockStart, blockEnd);

    // Instruction lines: lines between header and first question number
    const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const instrLines = [];
    let qi = 1;
    while (qi < blockLines.length) {
      const l = blockLines[qi];
      if (/^\d{1,2}(?:[.)])?\s/.test(l)) break;
      if (!/^(TRUE|FALSE|NOT GIVEN|YES|NO)$/i.test(l)) instrLines.push(l);
      qi++;
    }

    const instruction = instrLines.join(' ').trim();
    const questions = parseQuestions(block, detectType(instruction), answerKey);
    if (questions.length > 0) {
      sets.push({ questionRange: `${start}–${end}`, start, end,
                  type: detectType(instruction), instruction, questions });
    }
  }
  return sets;
}

// ─── Find where passage ends (skip header "Questions X-Y" mentions) ─────────

function findPassageEnd(text) {
  // Find all "Questions X-Y" occurrences
  const qRe = /Questions?\s+(\d{1,2})\s*[–\-—]\s*(\d{1,2})/gi;
  const matches = [...text.matchAll(qRe)];

  for (const m of matches) {
    // Get the line containing this match
    const lineStart = text.lastIndexOf('\n', m.index) + 1;
    const lineEnd = text.indexOf('\n', m.index);
    const line = text.slice(lineStart, lineEnd >= 0 ? lineEnd : text.length);
    // If the line starts with "You should spend" or contains "which are based on",
    // this is a header mention — skip it
    if (/^you should spend/i.test(line) || /which are based on/i.test(line)) continue;
    // This is a real question section header
    return m.index;
  }
  return text.length;
}

// ─── Main ───────────────────────────────────────────────────────────────────

export function parseIELTSText(rawText, ocrAnswers) {
  const text = clean(rawText);
  const answerKey = extractAnswerKey(text);
  // Merge OCR answers (OCR takes priority — it reads image-based answer pages)
  const mergedAnswers = { ...answerKey };
  if (ocrAnswers) {
    for (const [num, ans] of Object.entries(ocrAnswers)) {
      const key = parseInt(num);
      if (!mergedAnswers[key]) {
        mergedAnswers[key] = ans;
      }
    }
  }
  const hasAnswerKey = Object.keys(mergedAnswers).length > 0;

  // Split passage block from question block
  const passageEnd = findPassageEnd(text);
  const passageBlock = text.slice(0, passageEnd);
  const questionBlock = text.slice(passageEnd);

  // Find passage numbers within passage block
  const passageRe = /READING PASSAGE\s*(\d+)/gi;
  const passageMatches = [...passageBlock.matchAll(passageRe)];

  let passages = [];
  if (passageMatches.length > 0) {
    for (let i = 0; i < passageMatches.length; i++) {
      const pm = passageMatches[i];
      const num = parseInt(pm[1]) || i + 1;
      const start = pm.index;
      const nextStart = i + 1 < passageMatches.length ? passageMatches[i + 1].index : passageBlock.length;
      passages.push(parsePassage(passageBlock.slice(start, nextStart), num));
    }
  } else {
    passages.push(parsePassage(passageBlock, 1));
  }

  const questionSets = parseQuestionSets(questionBlock || text, mergedAnswers);
  const totalQuestions = questionSets.reduce((s, qs) => s + qs.questions.length, 0);
  const hasQuestions = totalQuestions > 0;

  return { passages, questionSets, totalQuestions, hasAnswerKey, hasQuestions, rawText: text, detectedAnswers: mergedAnswers };
}

export async function extractText(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    const { extractTextFromPDF } = await import('./pdfParser.js');
    const text = await extractTextFromPDF(file);
    return { text, file }; // file passed through for OCR step
  } else if (ext === 'docx' || ext === 'doc') {
    const { extractTextFromDocx } = await import('./docxParser.js');
    return { text: await extractTextFromDocx(file) };
  } else if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(ext)) {
    const { extractTextFromImage } = await import('./imageParser.js');
    return { text: await extractTextFromImage(file, onProgress) };
  } else {
    throw new Error(`不支持的文件格式：.${ext}`);
  }
}
