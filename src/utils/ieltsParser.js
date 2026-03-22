/**
 * IELTS Reading Paper Parser
 * Parses extracted text into structured passages and question sets.
 */

// Clean up raw text from PDF/OCR/DOCX
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Detect question type from instruction text
function detectQuestionType(instruction) {
  const t = instruction.toLowerCase();
  if (t.includes('true') && t.includes('false') && t.includes('not given')) return 'TRUE_FALSE_NOT_GIVEN';
  if (t.includes('yes') && t.includes('no') && t.includes('not given')) return 'YES_NO_NOT_GIVEN';
  if (t.includes('choose') || t.includes('correct letter')) return 'MULTIPLE_CHOICE';
  if (t.includes('match') && t.includes('heading')) return 'MATCHING_HEADINGS';
  if (t.includes('match')) return 'MATCHING';
  if (t.includes('complete') && (t.includes('summary') || t.includes('notes') || t.includes('table'))) return 'SUMMARY_COMPLETION';
  if (t.includes('complete') || t.includes('fill')) return 'SENTENCE_COMPLETION';
  if (t.includes('write') || t.includes('answer')) return 'SHORT_ANSWER';
  return 'SHORT_ANSWER';
}

// Parse individual questions from a block of text
function parseQuestions(text, type, startNum) {
  const questions = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Regex to match numbered questions like "1.", "1 ", "1)"
  const questionRegex = /^(\d{1,2})[.)]\s+(.+)/;
  let currentQ = null;
  let currentOptions = [];

  const saveCurrentQ = () => {
    if (currentQ !== null) {
      const q = { number: currentQ.number, text: currentQ.text, type };
      if (type === 'TRUE_FALSE_NOT_GIVEN' || type === 'YES_NO_NOT_GIVEN') {
        q.options = type === 'TRUE_FALSE_NOT_GIVEN'
          ? ['TRUE', 'FALSE', 'NOT GIVEN']
          : ['YES', 'NO', 'NOT GIVEN'];
      } else if (type === 'MULTIPLE_CHOICE' && currentOptions.length > 0) {
        q.options = [...currentOptions];
      } else if (type === 'MATCHING_HEADINGS') {
        q.options = [];
      }
      questions.push(q);
      currentOptions = [];
    }
  };

  for (const line of lines) {
    const match = line.match(questionRegex);
    const optMatch = line.match(/^([A-H])[.)]\s+(.+)/);

    if (match && parseInt(match[1]) >= startNum) {
      saveCurrentQ();
      currentQ = { number: parseInt(match[1]), text: match[2] };
    } else if (optMatch && currentQ && type === 'MULTIPLE_CHOICE') {
      currentOptions.push({ label: optMatch[1], text: optMatch[2] });
    } else if (currentQ && !optMatch) {
      // Continuation of current question text
      currentQ.text += ' ' + line;
    }
  }
  saveCurrentQ();

  return questions;
}

// Parse a single passage block
function parsePassage(text, number) {
  const lines = text.split('\n').filter(l => l.trim());
  let title = '';
  let paragraphs = [];
  let currentPara = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Title: usually the first non-empty line or line in CAPS
    if (!title && i < 3) {
      title = line;
      continue;
    }

    // Paragraph label: A, B, C, etc. at start of line
    const paraLabel = line.match(/^([A-Z])\s+(.+)/);
    if (paraLabel && paraLabel[1].length === 1) {
      if (currentPara) paragraphs.push(currentPara);
      currentPara = { label: paraLabel[1], text: paraLabel[2] };
    } else if (currentPara) {
      currentPara.text += ' ' + line;
    } else {
      // No label found yet, treat as unlabeled paragraph
      if (!currentPara) currentPara = { label: String(paragraphs.length + 1), text: line };
      else currentPara.text += ' ' + line;
    }
  }
  if (currentPara) paragraphs.push(currentPara);

  // If no labeled paragraphs were found, split by double newline
  if (paragraphs.length <= 1 && text.length > 200) {
    const rawParas = text.split(/\n\n+/).filter(p => p.trim().length > 30);
    if (rawParas.length > 1) {
      paragraphs = rawParas.map((p, idx) => ({
        label: String.fromCharCode(65 + idx),
        text: p.trim(),
      }));
      if (!title) title = paragraphs[0].text.substring(0, 60);
    }
  }

  return { number, title, paragraphs, fullText: paragraphs.map(p => p.text).join('\n\n') };
}

// Parse question sections from text
function parseQuestionSections(text, passageNumber) {
  const sections = [];
  const lines = text.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect "Questions X-Y" header
    const rangeMatch = line.match(/Questions?\s+(\d+)[–\-–—](\d+)/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1]);
      const end = parseInt(rangeMatch[2]);

      // Collect instruction lines (next few lines before questions start)
      const instrLines = [];
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().match(/^(\d{1,2})[.)]\s+/)) {
        if (lines[j].trim()) instrLines.push(lines[j].trim());
        j++;
        if (instrLines.length > 8) break;
      }
      const instruction = instrLines.join(' ');
      const type = detectQuestionType(instruction);

      // Collect question lines
      const qLines = [];
      while (j < lines.length) {
        const nextRangeMatch = lines[j].trim().match(/Questions?\s+\d+[–\-–—]\d+/i);
        if (nextRangeMatch && j > i + 1) break;
        qLines.push(lines[j]);
        j++;
      }

      const questions = parseQuestions(qLines.join('\n'), type, start);
      if (questions.length > 0) {
        sections.push({
          passageNumber,
          questionRange: `${start}-${end}`,
          start, end,
          type,
          instruction,
          questions,
        });
      }
      i = j;
      continue;
    }
    i++;
  }

  return sections;
}

// Main parse function
export function parseIELTSText(rawText) {
  const text = cleanText(rawText);

  // Split into passage sections and question sections
  // Look for "READING PASSAGE X" or "Passage X" markers
  const passageMarkers = [];
  const passageRegex = /(?:READING\s+)?PASSAGE\s+(\d+)|(?:Reading\s+Passage\s+(\d+))/gi;
  let match;
  while ((match = passageRegex.exec(text)) !== null) {
    passageMarkers.push({
      index: match.index,
      number: parseInt(match[1] || match[2]),
    });
  }

  const passages = [];
  const allQuestionSections = [];

  if (passageMarkers.length === 0) {
    // No clear passage markers - treat whole text as one passage
    // Try to find where questions start
    const questionsStart = text.search(/Questions?\s+\d+[–\-–—]\d+/i);
    if (questionsStart > 100) {
      const passageText = text.substring(0, questionsStart).trim();
      const questionsText = text.substring(questionsStart);
      passages.push(parsePassage(passageText, 1));
      const sections = parseQuestionSections(questionsText, 1);
      allQuestionSections.push(...sections);
    } else {
      // Just show raw text as one passage with no questions
      passages.push(parsePassage(text, 1));
    }
  } else {
    for (let i = 0; i < passageMarkers.length; i++) {
      const start = passageMarkers[i].index;
      const end = i + 1 < passageMarkers.length ? passageMarkers[i + 1].index : text.length;
      const block = text.substring(start, end);
      const num = passageMarkers[i].number;

      // Within the block, split passage text from questions
      const qIdx = block.search(/Questions?\s+\d+[–\-–—]\d+/i);
      if (qIdx > 50) {
        passages.push(parsePassage(block.substring(0, qIdx), num));
        const sections = parseQuestionSections(block.substring(qIdx), num);
        allQuestionSections.push(...sections);
      } else {
        passages.push(parsePassage(block, num));
      }
    }
  }

  // Count total questions
  const totalQuestions = allQuestionSections.reduce((sum, s) => sum + s.questions.length, 0);

  return {
    passages,
    questionSets: allQuestionSections,
    totalQuestions,
    rawText: text,
  };
}

// Extract text from any file type
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
    throw new Error(`Unsupported file type: .${ext}`);
  }
}
