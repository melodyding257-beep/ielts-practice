/**
 * OCR answer extraction from PDF answer page images using Tesseract.js
 * Mirrors the logic of scripts/ocr_answers.py but runs entirely in the browser.
 */
import Tesseract from 'tesseract.js';

// Polyfill String.capitalize for older browsers / Node
if (!String.prototype.capitalize) {
  String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1).toLowerCase();
  };
}

// ─── OCR one image data URL ───────────────────────────────────────────────────

async function ocrImage(dataUrl, onProgress) {
  const result = await Tesseract.recognize(dataUrl, 'eng', {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text;
}

// ─── Validate an answer looks reasonable ─────────────────────────────────────

function isValidAnswer(ans) {
  if (!ans || typeof ans !== 'string') return false;
  const trimmed = ans.trim();
  if (!trimmed) return false;
  // Reject if contains multiple weird characters (OCR garbage)
  const weirdCharRatio = ([...trimmed].filter(c => c.match(/[^A-Za-z0-9\s\-\'\.\,]/) && !'ÀÈÌÒÙàèìòùÂÊÎÔÛâêîôû'.includes(c))).length / trimmed.length;
  if (weirdCharRatio > 0.4) return false;
  return true;
}

// ─── Parse one line of OCR text ───────────────────────────────────────────────

function parseAnswerLine(line) {
  line = line.trim();
  if (!line) return null;

  // Pattern: "27. A" or "27 A" or "27: E"
  const m = line.match(/^(\d{1,2})[\.\s:]+(.+)$/);
  if (!m) return null;

  const qNum = parseInt(m[1]);
  const raw = m[2].trim();

  // Priority 1: TRUE / FALSE / NOT GIVEN (multi-word, must be first)
  const tfng = raw.match(/^(NOT GIVEN|NOTGIVEN|TRUE|FALSE)\b/i);
  if (tfng) {
    const ans = tfng[1].toUpperCase().replace('NOTGIVEN', 'NOT GIVEN');
    if (isValidAnswer(ans)) return { qNum, answer: ans };
  }

  // Priority 2: Single letter (matching paragraphs) — up to 2 chars
  const letter = raw.match(/^([A-Z]{1,2})\b/);
  if (letter) {
    const ans = letter[1].toUpperCase();
    if (isValidAnswer(ans)) return { qNum, answer: ans };
  }

  // Priority 3: Number (short answer)
  const num = raw.match(/^(\d+)\b/);
  if (num) {
    const ans = num[1];
    if (isValidAnswer(ans)) return { qNum, answer: ans };
  }

  // Priority 4: Word (names like Bach, coaches, truthful — 3+ letters)
  const word = raw.match(/^([A-Za-z]{3,20})\b/);
  if (word) {
    const ans = word[1].capitalize();
    if (isValidAnswer(ans)) return { qNum, answer: ans };
  }

  return null;
}

// ─── Extract answers from OCR text of one image ────────────────────────────────

function extractFromOcrText(ocrText, qStart = 1, qEnd = 50) {
  const answers = {};
  const lines = ocrText.split(/\n/);

  for (const line of lines) {
    const parsed = parseAnswerLine(line);
    if (!parsed) continue;
    const { qNum, answer } = parsed;
    if (qNum < qStart || qNum > qEnd) continue;
    // Don't overwrite an earlier answer (keep first match per question)
    if (answers[qNum] === undefined) {
      answers[qNum] = answer;
    }
  }

  return answers;
}

// ─── Main: attempt OCR on the last few pages of a PDF ─────────────────────────

/**
 * Given a PDF file and detected question range, attempt to extract answers
 * by OCR-ing the last 2 pages (which in Cambridge IELTS books contain the answer key).
 *
 * @param {File} file — the PDF file
 * @param {number} qStart — first question number (default 27)
 * @param {number} qEnd — last question number (default 40)
 * @param {Function} onProgress — called with percent (0-100) during OCR
 * @returns {Promise<Object>} — dict of {questionNumber: answerString}
 */
export async function extractAnswersFromPDF(file, qStart = 27, qEnd = 40, onProgress) {
  const { renderPDFPagesToImages } = await import('./pdfParser.js');

  // Get total page count by loading just the first page briefly
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await import('pdfjs-dist').then(m => m.getDocument({ data: arrayBuffer }).promise);
  const totalPages = pdf.numPages;

  // Answer pages: last 2 pages for typical PDFs, last 3 for 8-page PDFs (like Tasmania)
  const candidatePages = [];
  if (totalPages >= 3) candidatePages.push(totalPages - 2); // third-to-last
  if (totalPages >= 2) candidatePages.push(totalPages - 1); // second-to-last
  candidatePages.push(totalPages); // last page

  const images = await renderPDFPagesToImages(file, candidatePages.map(p => p - 1)); // convert to 0-based

  const allAnswers = {};

  for (let i = 0; i < images.length; i++) {
    if (onProgress) onProgress(`Running OCR on answer page ${i + 1}...`);
    const ocrText = await ocrImage(images[i]);
    const pageAnswers = extractFromOcrText(ocrText, qStart, qEnd);
    Object.assign(allAnswers, pageAnswers);
  }

  return allAnswers;
}
