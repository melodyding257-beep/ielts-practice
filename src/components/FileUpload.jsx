import { useState, useRef } from 'react';
import { Upload, FileText, Image, File, X, Loader } from 'lucide-react';
import { extractText } from '../utils/ieltsParser';
import { parseIELTSText } from '../utils/ieltsParser';

const ACCEPTED = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.bmp,.tiff,.webp';

function FileIcon({ name }) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(ext)) return <Image size={20} className="text-green-600" />;
  if (ext === 'pdf') return <FileText size={20} className="text-red-500" />;
  return <File size={20} className="text-blue-500" />;
}

export default function FileUpload({ onParsed }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const inputRef = useRef();

  const processFile = async (file) => {
    setSelectedFile(file);
    setError('');
    setLoading(true);
    setProgress(0);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const result = await extractText(file, p => setProgress(p));
      const text = result.text;

      if (!text || text.trim().length < 50) {
        throw new Error('Could not extract enough text from this file. Try a different file or format.');
      }

      let ocrAnswers = null;
      let ocrPerformed = false;

      // For PDFs, attempt OCR on answer pages to find image-embedded answers
      if (ext === 'pdf' && result.file) {
        try {
          setProgress(90);
          const { extractAnswersFromPDF } = await import('../utils/ocrPdfAnswers.js');
          ocrAnswers = await extractAnswersFromPDF(result.file, 27, 40, p => setProgress(p));
          ocrPerformed = true;
        } catch (e) {
          // OCR failed — continue without answers
          console.warn('OCR answer extraction failed:', e);
        }
      }

      const parsed = parseIELTSText(text, ocrAnswers);
      // Attach OCR metadata so Home can show confirmation UI
      parsed._ocrPerformed = ocrPerformed;
      parsed._ocrAnswers = ocrAnswers || {};
      onParsed(parsed, file.name, file);
    } catch (e) {
      setError(e.message || 'Failed to process file.');
      setSelectedFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className={`upload-area p-10 text-center ${dragging ? 'dragging' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleChange}
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader size={40} className="text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-[#a1a1aa]">
              {progress > 0 ? `OCR in progress: ${progress}%` : 'Extracting and parsing...'}
            </p>
            {progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#27272a] flex items-center justify-center">
              <Upload size={28} className="text-[#7c3aed]" />
            </div>
            <div>
              <p className="font-semibold text-white">Drop your file here</p>
              <p className="text-sm text-[#71717a] mt-1">or click to browse</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center mt-1">
              {['PDF', 'DOCX', 'JPG', 'PNG'].map(f => (
                <span key={f} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 font-medium">{f}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <X size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
