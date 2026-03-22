import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PassageView({ passages, currentPassage, onPassageChange }) {
  const [highlights, setHighlights] = useState({});

  if (!passages || passages.length === 0) return null;
  const passage = passages[currentPassage] || passages[0];

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length < 2) return;
    // Highlight is visual-only in this implementation
  };

  return (
    <div className="flex flex-col h-full">
      {/* Passage selector tabs */}
      {passages.length > 1 && (
        <div className="flex gap-1 p-2 bg-gray-50 border-b border-gray-200">
          {passages.map((p, idx) => (
            <button
              key={idx}
              onClick={() => onPassageChange(idx)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors
                ${currentPassage === idx
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50'
                }`}
            >
              Passage {p.number}
            </button>
          ))}
        </div>
      )}

      {/* Passage header */}
      <div className="px-5 py-3 border-b border-gray-200 bg-white">
        <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1">
          Reading Passage {passage.number}
        </div>
        {passage.title && (
          <h2 className="text-base font-semibold text-gray-900 font-serif leading-snug">
            {passage.title}
          </h2>
        )}
      </div>

      {/* Passage content */}
      <div
        className="flex-1 overflow-y-auto p-5 bg-white"
        onMouseUp={handleMouseUp}
      >
        <div className="passage-text max-w-none">
          {passage.paragraphs && passage.paragraphs.length > 0 ? (
            passage.paragraphs.map((para, idx) => (
              <div key={idx} className="mb-4">
                <span className="para-label font-bold text-blue-800">
                  {/^[A-Z]$/.test(para.label) ? para.label : ''}
                </span>
                <span>{para.text}</span>
              </div>
            ))
          ) : (
            <p className="whitespace-pre-wrap">{passage.fullText || passage.text}</p>
          )}
        </div>
      </div>

      {/* Passage navigation arrows (mobile) */}
      {passages.length > 1 && (
        <div className="flex justify-between items-center px-4 py-2 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => onPassageChange(Math.max(0, currentPassage - 1))}
            disabled={currentPassage === 0}
            className="flex items-center gap-1 text-sm text-blue-700 disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="text-xs text-gray-500">{currentPassage + 1} / {passages.length}</span>
          <button
            onClick={() => onPassageChange(Math.min(passages.length - 1, currentPassage + 1))}
            disabled={currentPassage === passages.length - 1}
            className="flex items-center gap-1 text-sm text-blue-700 disabled:opacity-30"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
