// PDF text extraction using PDF.js — layout-preserving line reconstruction
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PARA_GAP = 14; // pts — Y gap larger than this = new paragraph

// ─── Render PDF page(s) to image data URLs for OCR ────────────────────────────
// Renders the given pages at high resolution (scale=3 ≈ 216 DPI)

export async function renderPDFPagesToImages(file, pageIndices) {
  // pageIndices is 0-based
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const scale = 3.0; // ~216 DPI for better OCR accuracy
  const images = [];

  for (const idx of pageIndices) {
    const pageNum = idx + 1;
    if (pageNum < 1 || pageNum > pdf.numPages) continue;
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    // White background for pages with dark backgrounds
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push(canvas.toDataURL('image/png'));
  }

  return images; // array of data URL strings
}

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const { items } = await page.getTextContent();

    // Group items by Y → one line
    const lineMap = new Map();
    for (const item of items) {
      if (item.str == null) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push(item);
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    const lines = [];

    for (const y of sortedYs) {
      // Sort left → right
      const lineItems = lineMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]);

      // Filter out pure-space items — they'll be handled via gap logic
      const textItems = lineItems.filter(it => it.str !== ' ');

      let lineText = '';
      for (let j = 0; j < textItems.length; j++) {
        const item = textItems[j];

        if (j > 0) {
          // Find the previous text item (could be j-1 or earlier if spaces were skipped)
          let prevTextIdx = j - 1;
          // Actually, since we filtered, textItems is contiguous non-space
          // So prev item is at j-1 in textItems
          const prev = textItems[j - 1];
          const prevEnd = prev.transform[4] + (prev.width || 0);
          const gap = item.transform[4] - prevEnd;
          // Add one space when there is any positive gap between the two words
          if (gap > 0) lineText += ' ';
        }
        lineText += item.str;
      }

      lines.push({ y, text: lineText.trimEnd() });
    }

    // Reconstruct page — blank line = paragraph break
    const pageTextLines = [];
    for (let li = 0; li < lines.length; li++) {
      const { y, text } = lines[li];
      const prevY = li > 0 ? lines[li - 1].y : y + PARA_GAP + 1;
      if (prevY - y > PARA_GAP && li > 0) pageTextLines.push('');
      pageTextLines.push(text);
    }

    pages.push(pageTextLines.join('\n'));
  }

  return pages.join('\n\n---PAGE---\n\n');
}
