/**
 * IELTS Reading Paper Parser — v2
 * Correctly handles real Cambridge IELTS papers with paragraph labels,
 * numbered questions (not necessarily starting at 1), answer keys, etc.
 */

function clean(text) {
  return text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/R E A D I N G PA S S A G E/g, 'READING PASSAGE')
    .trim();
}

function parsePassage(block, number) {
  const lines = block.split('\n');
  let title = '';
  let subtitle = '';
  const paragraphs = [];
  let currentLabel = null;
  let currentText = '';
  let titleFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (/READING PASSAGE\s*\d*/i.test(line)) continue;
    if (/you should spend/i.test(line)) continue;
    if (/which are based on/i.test(line)) continue;

    const labelMatch = line.match(/^([A-F])\s{1,6}(.+)/);
    if (labelMatch) {
      if (currentLabel !== null) {
        paragraphs.push({ label: currentLabel, text: currentText.trim() });
      }
      currentLabel = labelMatch[1];
      currentText = labelMatch[2];
      titleFound = true;
      continue;
    }

    if (currentLabel !== null) {
      currentText += ' ' + line;
      continue;
    }

    if (!title) { title = line; continue; }
    if (!subtitle && !titleFound) { subtitle = line; continue; }
  }

  if (currentLabel !== null && currentText.trim()) {
    paragraphs.push({ label: currentLabel, text: currentText.trim() });
  }

  if (paragraphs.length === 0) {
    const chunks = block.split(/\n\n+/).filter(c => c.trim().length > 40);
    chunks.forEach((chunk, idx) => {
      if (idx === 0 && !title) { title = chunk.trim().substring(0, 80); return; }
      paragraphs.push({ label: String.fromCharCode(65 + idx - 1), text: chunk.trim() });
    });
  }

  return {
    number,
    title: title.trim(),
    subtitle: subtitle.trim(),
    paragraphs,
    fullText: paragraphs.map(p => p.text).join('\n\n'),
  };
}

function extractAnswerKey(text) {
  const key = {};
  const densePattern = /\b(\d{1,2})[.:)]\s*([A-Z][A-Z\s]*?)(?=\s+\d{1,2}[.:)]|\s*$)/gm;
  let m;
  while ((m = densePattern.exec(text)) !== null) {
    const num = parseInt(m[1]);
    const ans = m[2].trim();
    if (num >= 1 && num <= 50 && ans.length <= 30) key[num] = ans;
  }
  const answerSection = text.match(/answers?:?\s*\n([\s\S]{10,300})/i);
  if (answerSection) {
    const body = answerSection[1];
    const pairs = body.matchAll(/(\d{1,2})[.:)\s]\s*([A-Za-z][^\n\d]{0,40})/g);
    for (const pair of pairs) {
      const num = parseInt(pair[1]);
      const ans = pair[2].trim();
      if (num >= 1 && num <= 50) key[num] = ans;
    }
  }
  return key;
}

function detectType(instruction) {
  const t = instruction.toLowerCase();
  if (t.includes('which paragraph') || (t.includes('paragraph') && t.includes('letter') && t.includes('a') && t.includes('f'))) return 'MATCHING_PARAGRAPHS';
  if (t.includes('true') && t.includes('false') && t.includes('not given')) return 'TRUE_FALSE_NOT_GIVEN';
  if (t.includes('yes') && t.includes('no') && t.includes('not given')) return 'YES_NO_NOT_GIVEN';
  if (t.includes('choose') && t.includes('letter')) return 'MULTIPLE_CHOICE';
  if (t.includes('match') && !t.includes('paragraph')) return 'MATCHING';
  if (t.includes('heading')) return 'MATCHING_HEADINGS';
  if (t.includes('summary') || t.includes('notes') || t.includes('table') || t.includes('flow')) return 'SUMMARY_COMPLETION';
  if (t.includes('no more than') || t.includes('answer the question')) return 'SHORT_ANSWER';
  if (t.includes('complet') || t.includes('fill')) return 'SENTENCE_COMPLETION';
  return 'SHORT_ANSWER';
}

function parseQuestions(block, type, answerKey) {
  const questions = [];
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
  const qRe = /^(\d{1,2})[.)]\s*(.+)|^(\d{1,2})\s{1,4}(.+)/;
  let currentQ = null;
  let currentOpts = [];

  const save = () => {
    if (!currentQ) return;
    const q = { number: currentQ.num, text: currentQ.text.trim(), type };
    if (type === 'TRUE_FALSE_NOT_GIVEN') q.options = ['TRUE', 'FALSE', 'NOT GIVEN'];
    else if (type === 'YES_NO_NOT_GIVEN') q.options = ['YES', 'NO', 'NOT GIVEN'];
    else if (type === 'MATCHING_PARAGRAPHS') q.options = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    else if (type === 'MULTIPLE_CHOICE' && currentOpts.length > 0) q.options = [...currentOpts];
    if (answerKey[currentQ.num]) q.answer = answerKey[currentQ.num];
    questions.push(q);
    currentOpts = [];
    currentQ = null;
  };

  for (const line of lines) {
    if (/^(questions?|NB|write|choose|in boxes|answer sheet|do the following)/i.test(line)) continue;
    if (/^(TRUE|FALSE|NOT GIVEN|YES|NO)\s*$/i.test(line)) continue;
    if (/^if the statement/i.test(line)) continue;

    const qMatch = line.match(qRe);
    if (qMatch) {
      const num = parseInt(qMatch[1] || qMatch[3]);
      const text = (qMatch[2] || qMatch[4] || '').trim();
      if (num >= 1 && num <= 100 && text.length > 2) {
        save();
        currentQ = { num, text };
        continue;
      }
    }

    const optMatch = line.match(/^([A-H])[.)]\s*(.+)/);
    if (optMatch && currentQ && (type === 'MULTIPLE_CHOICE' || type === 'MATCHING_HEADINGS')) {
      currentOpts.push({ label: optMatch[1], text: optMatch[2].trim() });
      continue;
    }

    if (currentQ) currentQ.text += ' ' + line;
  }
  save();
  return questions;
}

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

    const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const instrLines = [];
    let qi = 1;
    while (qi < blockLines.length) {
      const l = blockLines[qi];
      if (/^(\d{1,2})[.)]\s/.test(l) || /^(\d{1,2})\s{1,4}\S/.test(l)) break;
      if (!/^(TRUE|FALSE|NOT GIVEN|YES|NO)$/i.test(l)) instrLines.push(l);
      qi++;
    }
    const instruction = instrLines.join(' ').trim();
    const type = detectType(instruction);
    const questions = parseQuestions(block, type, answerKey);
    if (questions.length > 0) {
      sets.push({ questionRange: `${start}–${end}`, start, end, type, instruction, questions });
    }
  }
  return sets;
}

export function parseIELTSText(rawText) {
  const text = clean(rawText);
  const answerKey = extractAnswerKey(text);
  const hasAnswerKey = Object.keys(answerKey).length > 0;

  const passageRe = /READING PASSAGE\s*(\d+)/gi;
  const passageMatches = [...text.matchAll(passageRe)];
  let passages = [];
  let questionText = '';

  if (passageMatches.length > 0) {
    for (let i = 0; i < passageMatches.length; i++) {
      const pm = passageMatches[i];
      const num = parseInt(pm[1]) || i + 1;
      const start = pm.index;
      const nextStart = i + 1 < passageMatches.length ? passageMatches[i + 1].index : text.length;
      const relQ = text.slice(start).search(/Questions?\s+\d{1,2}\s*[–\-—]/i);
      const end = relQ > 0 ? start + relQ : nextStart;
      passages.push(parsePassage(text.slice(start, end), num));
      if (i === passageMatches.length - 1) questionText = text.slice(end);
    }
  } else {
    const qStart = text.search(/Questions?\s+\d{1,2}\s*[–\-—]/i);
    if (qStart > 80) {
      passages.push(parsePassage(text.slice(0, qStart), 1));
      questionText = text.slice(qStart);
    } else {
      passages.push(parsePassage(text, 1));
    }
  }

  const questionSets = parseQuestionSets(questionText || text, answerKey);
  const totalQuestions = questionSets.reduce((s, qs) => s + qs.questions.length, 0);
  const hasQuestions = totalQuestions > 0;

  return { passages, questionSets, totalQuestions, hasAnswerKey, hasQuestions, rawText: text };
}

export async function extractText(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf') {
    const { extractTextFromPDF } = await import('./pdfParser.js');
    return extractTextFromPDF(file);
  } else if (ext === 'docx' || ext === 'doc') {
    const { extractTextFromDocx } = await import('./docxParser.js');
    return extractTextFromDocx(file);
  } else if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(ext)) {
    const { extractTextFromImage } = await import('./imageParser.js');
    return extractTextFromImage(file, onProgress);
  } else {
    throw new Error(`不支持的文件格式：.${ext}`);
  }
}
