// Image OCR using Tesseract.js
import Tesseract from 'tesseract.js';

export async function extractTextFromImage(file, onProgress) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });
    return result.data.text;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
