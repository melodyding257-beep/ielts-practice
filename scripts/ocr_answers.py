#!/usr/bin/env python3
"""
OCR answer extraction for IELTS PDFs.
Uses pdfimages to extract embedded answer page images, then Tesseract OCR.
Run: python3 ocr_answers.py <pdf_path> [q_start] [q_end]
"""
import sys, os, re, json, tempfile, subprocess, pdfplumber

def ocr_image(png_path):
    """Run Tesseract OCR on an image file."""
    result = subprocess.run(
        ['tesseract', png_path, 'stdout', '-l', 'eng', '--psm', '6'],
        capture_output=True, text=True
    )
    return result.stdout

def extract_answers(pdf_path, q_start=1, q_end=50):
    answers = {}

    # Use pdfimages to extract all images from the PDF
    with tempfile.TemporaryDirectory() as tmpdir:
        prefix = os.path.join(tmpdir, 'ans_img')
        subprocess.run(
            ['pdfimages', '-f', '1', '-l', str(max(3, 50)),
            # Extract from all pages, images only
            '-png', pdf_path, prefix,
            capture_output=True
        )

        # List all extracted images
        img_files = sorted([
            f for f in os.listdir(tmpdir)
            if f.startswith('ans_img') and f.endswith('.png')
        ], key=lambda x: os.path.getsize(os.path.join(tmpdir, x)), reverse=True)

        if not img_files:
            return answers

        # OCR each large image (answer pages tend to be large images)
        for img_file in img_files:
            img_path = os.path.join(tmpdir, img_file)
            file_size = os.path.getsize(img_path)
            if file_size < 20000:  # Skip tiny images (probably icons)
                continue

            ocr_text = ocr_image(img_path)
            if not ocr_text.strip():
                continue

            # Parse answers from OCR text
            for line in ocr_text.split('\n'):
                line = line.strip()
                if not line:
                    continue

                # Find "number. answer" or "number answer" pattern
                m = re.match(r'^(\d{1,2})[\.\s:]+(.+)$', line)
                if not m:
                    continue

                q_num = int(m.group(1))
                if q_num < q_start or q_num > q_end:
                    continue

                raw = m.group(2).strip()

                # Determine answer type by context
                # Priority 1: TRUE/FALSE/NOT GIVEN
                tfng = re.match(r'^(NOT GIVEN|NOTGIVEN|TRUE|FALSE)\b', raw, re.IGNORECASE)
                if tfng:
                    ans = tfng.group(1).upper().replace('NOTGIVEN', 'NOT GIVEN')
                    answers[q_num] = ans
                    continue

                # Priority 2: Single letter (matching paragraphs) - up to 2 chars
                letter = re.match(r'^([A-Z]{1,2})\b', raw)
                if letter:
                    answers[q_num] = letter.group(1).upper()
                    continue

                # Priority 3: Number (short answer)
                num = re.match(r'^(\d+)\b', raw)
                if num:
                    answers[q_num] = num.group(1)
                    continue

                # Priority 4: Word (short answer like names) - clean up
                word = re.match(r'^([A-Za-z]{3,20})\b', raw)
                if word:
                    answers[q_num] = word.group(1).capitalize()

    return answers

if __name__ == '__main__':
    pdf_path = sys.argv[1]
    q_start = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    q_end = int(sys.argv[3]) if len(sys.argv) > 3 else 50
    result = extract_answers(pdf_path, q_start, q_end)
    print(json.dumps(result, ensure_ascii=False))
