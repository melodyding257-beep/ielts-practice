import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Languages, Loader, X } from 'lucide-react';
import { translateText, translateWord } from '../utils/translateApi';

function SelectionTooltip({ target, onClose }) {
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    translateWord(target.text)
      .then(t => { setTranslation(t); setLoading(false); })
      .catch(() => { setTranslation('翻译失败，请重试'); setLoading(false); });
  }, [target.text]);

  return (
    <div className="selection-tooltip" style={{ top: target.y, left: Math.min(target.x, 280) }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400 truncate mb-0.5 italic">
            "{target.text.slice(0, 50)}{target.text.length > 50 ? '…' : ''}"
          </p>
          {loading ? (
            <div className="flex items-center gap-1.5 text-gray-500">
              <Loader size={12} className="animate-spin" />
              <span className="text-xs">翻译中...</span>
            </div>
          ) : (
            <p className="text-[13px] font-medium text-gray-900 leading-snug">{translation}</p>
          )}
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function PassageParagraph({ para, translation }) {
  const isAlpha = /^[A-F]$/.test(para.label);
  return (
    <div className="mb-5">
      <p className="passage-text">
        {isAlpha && <span className="para-label">{para.label}</span>}
        {para.text}
      </p>
      {translation && (
        <p className="mt-2 text-[13px] text-gray-500 leading-relaxed pl-5 border-l-2 border-blue-200 italic">
          {translation}
        </p>
      )}
    </div>
  );
}

export default function PassageView({ passages, currentPassage, onPassageChange }) {
  const [tooltip, setTooltip] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translations, setTranslations] = useState({});
  const [showTranslation, setShowTranslation] = useState(false);
  const [transProgress, setTransProgress] = useState(0);
  const containerRef = useRef(null);

  if (!passages?.length) return null;
  const passage = passages[currentPassage] || passages[0];

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.toString().trim().length < 2) { setTooltip(null); return; }
    const text = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setTooltip({
      text,
      x: rect.left - containerRect.left,
      y: rect.bottom - containerRect.top + 8,
    });
  };

  const handleTranslateAll = async () => {
    const key = `p${currentPassage}`;
    if (translating) return;
    if (translations[key]) { setShowTranslation(v => !v); return; }
    setTranslating(true);
    setShowTranslation(true);
    try {
      const result = {};
      for (let i = 0; i < passage.paragraphs.length; i++) {
        const para = passage.paragraphs[i];
        const t = await translateText(para.text, p => {
          setTransProgress(Math.round(((i + p / 100) / passage.paragraphs.length) * 100));
        });
        result[`${currentPassage}-${i}`] = t;
        setTransProgress(Math.round(((i + 1) / passage.paragraphs.length) * 100));
      }
      setTranslations(prev => ({ ...prev, ...result, [key]: true }));
    } catch (e) { console.error(e); }
    finally { setTranslating(false); }
  };

  const translationReady = !!translations[`p${currentPassage}`];

  return (
    <div className="flex flex-col h-full" ref={containerRef} style={{ position: 'relative' }}>
      {passages.length > 1 && (
        <div className="flex border-b border-gray-200 bg-white">
          {passages.map((p, idx) => (
            <button key={idx} onClick={() => onPassageChange(idx)}
              className={`px-5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors
                ${currentPassage === idx ? 'border-[#003B71] text-[#003B71]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              Passage {p.number}
            </button>
          ))}
        </div>
      )}

      <div className="px-6 pt-5 pb-3 border-b border-gray-100 bg-white">
        <p className="text-[10px] font-bold text-[#003B71] uppercase tracking-[0.15em] mb-2">
          Reading Passage {passage.number}
        </p>
        {passage.title && (
          <h2 className="text-[18px] font-bold text-gray-900 font-serif leading-tight">{passage.title}</h2>
        )}
        {passage.subtitle && (
          <p className="text-[13px] text-gray-500 italic mt-1">{passage.subtitle}</p>
        )}
        <div className="flex items-center gap-3 mt-3">
          <button onClick={handleTranslateAll}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
              ${showTranslation && translationReady ? 'bg-[#003B71] text-white border-[#003B71]' : 'text-[#003B71] border-[#003B71]/30 hover:bg-blue-50'}`}>
            {translating ? <Loader size={11} className="animate-spin" /> : <Languages size={11} />}
            {translating ? `翻译中 ${transProgress}%` : showTranslation && translationReady ? '隐藏译文' : '一键翻译全文'}
          </button>
          <span className="text-[11px] text-gray-400">选中文字可翻译单句/单词</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 bg-white" onMouseUp={handleMouseUp}>
        {passage.paragraphs?.map((para, idx) => (
          <PassageParagraph key={idx} para={para}
            translation={showTranslation ? translations[`${currentPassage}-${idx}`] : null} />
        ))}
        {(!passage.paragraphs?.length) && (
          <p className="passage-text whitespace-pre-wrap">{passage.fullText}</p>
        )}

        {tooltip && (
          <SelectionTooltip target={tooltip} onClose={() => { setTooltip(null); window.getSelection()?.removeAllRanges(); }} />
        )}
      </div>

      {passages.length > 1 && (
        <div className="flex justify-between items-center px-5 py-2 border-t border-gray-100 bg-gray-50">
          <button onClick={() => onPassageChange(Math.max(0, currentPassage - 1))}
            disabled={currentPassage === 0}
            className="flex items-center gap-1 text-sm text-[#003B71] disabled:opacity-30">
            <ChevronLeft size={14} /> 上一篇
          </button>
          <span className="text-xs text-gray-400">{currentPassage + 1} / {passages.length}</span>
          <button onClick={() => onPassageChange(Math.min(passages.length - 1, currentPassage + 1))}
            disabled={currentPassage === passages.length - 1}
            className="flex items-center gap-1 text-sm text-[#003B71] disabled:opacity-30">
            下一篇 <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
