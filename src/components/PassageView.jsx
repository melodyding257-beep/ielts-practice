import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Languages, Loader, X, StickyNote, Highlighter, Copy } from 'lucide-react';
import { translateText, translateWord } from '../utils/translateApi';

function SelectionMenu({ pos, text, onClose, onNote, onHighlight }) {
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState('');

  const handleTranslate = async () => {
    if (translation) { onClose(); return; }
    setTranslating(true);
    try {
      const t = await translateWord(text);
      setTranslation(t);
    } catch {
      setTranslation('翻译失败');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="highlight-menu" style={{ top: pos.y, left: Math.min(pos.x, 260) }}>
      {translation ? (
        <div className="mb-2">
          <p className="text-[11px] text-gray-400 italic mb-1">"{text.slice(0, 35)}{text.length > 35 ? '…' : ''}"</p>
          <p className="text-[13px] font-medium text-gray-900 leading-snug">{translation}</p>
        </div>
      ) : (
        <p className="text-xs text-gray-500 mb-2 px-1">
          {translating ? (
            <><Loader size={10} className="inline animate-spin mr-1" />翻译中…</>
          ) : (
            `"${text.slice(0, 25)}${text.length > 25 ? '…' : ''}"`
          )}
        </p>
      )}
      <div className="flex gap-1 flex-wrap">
        <button onClick={handleTranslate} className="ielts-highlight-btn">
          <Languages size={11} />
          {translation ? '已翻译' : '翻译'}
        </button>
        <button onClick={() => { onHighlight(text); onClose(); }} className="ielts-highlight-btn">
          <Highlighter size={11} /> 高亮
        </button>
        <button onClick={() => { onNote(text); onClose(); }} className="ielts-highlight-btn">
          <StickyNote size={11} /> 笔记
        </button>
        <button onClick={() => { navigator.clipboard.writeText(text); onClose(); }} className="ielts-highlight-btn">
          <Copy size={11} /> 复制
        </button>
        <button onClick={onClose} className="ielts-highlight-btn text-gray-400 hover:text-gray-600">
          <X size={11} />
        </button>
      </div>
    </div>
  );
}

export default function PassageView({ passages, currentPassage, onPassageChange }) {
  const [menu, setMenu] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translations, setTranslations] = useState({});
  const [showTranslation, setShowTranslation] = useState(false);
  const [transProgress, setTransProgress] = useState(0);
  const [highlights, setHighlights] = useState([]);
  const containerRef = useRef(null);

  if (!passages?.length) return null;
  const passage = passages[currentPassage] || passages[0];

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.toString().trim().length < 2) { setMenu(null); return; }
    const text = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    setMenu({ text, x: rect.left - containerRect.left, y: rect.bottom - containerRect.top + 8 });
  }, []);

  const handleTranslateAll = async () => {
    const key = `p${currentPassage}`;
    if (translating) return;
    if (translations[key]) { setShowTranslation(v => !v); return; }
    setTranslating(true);
    setShowTranslation(true);
    try {
      const result = {};
      for (let i = 0; i < passage.paragraphs.length; i++) {
        const t = await translateText(passage.paragraphs[i].text, p =>
          setTransProgress(Math.round(((i + p / 100) / passage.paragraphs.length) * 100))
        );
        result[`${currentPassage}-${i}`] = t;
        setTransProgress(Math.round(((i + 1) / passage.paragraphs.length) * 100));
      }
      setTranslations(prev => ({ ...prev, ...result, [key]: true }));
    } catch (e) { console.error(e); }
    finally { setTranslating(false); }
  };

  const translationReady = !!translations[`p${currentPassage}`];

  const applyHighlight = (text) => {
    setHighlights(prev => [...prev, { text, color: '#A0522D' }]);
    window.getSelection()?.removeAllRanges();
  };

  const applyNote = (text) => {
    const note = prompt('添加笔记:');
    if (note) setHighlights(prev => [...prev, { text, color: '#D4A853', note }]);
    window.getSelection()?.removeAllRanges();
  };

  const removeHighlight = (idx) => {
    setHighlights(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col h-full" ref={containerRef} style={{ position: 'relative' }}>
      {passages.length > 1 && (
        <div className="flex border-b border-gray-200 bg-white px-4">
          {passages.map((p, idx) => (
            <button key={idx} onClick={() => onPassageChange(idx)}
              className={`px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors
                ${currentPassage === idx ? 'border-[#003B71] text-[#003B71]' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              Passage {p.number}
            </button>
          ))}
        </div>
      )}

      <div className="px-6 pt-4 pb-3 border-b border-gray-100 bg-white">
        <p className="text-[10px] font-bold text-[#003B71] uppercase tracking-[0.15em] mb-1.5">
          Reading Passage {passage.number}
        </p>
        {passage.title && <h2 className="text-[17px] font-bold text-gray-900 font-serif leading-snug">{passage.title}</h2>}
        {passage.subtitle && <p className="text-[12.5px] text-gray-500 italic mt-0.5">{passage.subtitle}</p>}
        <div className="flex items-center gap-3 mt-3">
          <button onClick={handleTranslateAll}
            className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-all
              ${showTranslation && translationReady ? 'bg-[#003B71] text-white border-[#003B71]' : 'text-[#003B71] border-[#003B71]/30 hover:bg-blue-50'}`}>
            {translating ? <Loader size={11} className="animate-spin" /> : <Languages size={11} />}
            {translating ? `翻译中 ${transProgress}%` : showTranslation && translationReady ? '隐藏译文' : '一键翻译全文'}
          </button>
          <span className="text-[11px] text-gray-400">选中文字可高亮 / 笔记 / 翻译</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 bg-white passage-scroll" onMouseUp={handleMouseUp}>
        <div className="passage-body">
          {passage.paragraphs?.map((para, idx) => {
            const paraHighlights = highlights.filter(h => h.text === para.text);
            return (
              <div key={idx} className="mb-5">
                <p className="passage-text">
                  {paraHighlights.length > 0 ? (
                    <span
                      className="highlighted-text px-0.5 rounded-sm cursor-pointer"
                      style={{ backgroundColor: paraHighlights[0].color + '55' }}
                      title={paraHighlights[0].note || '点击移除高亮'}
                      onClick={() => {
                        const idx = highlights.findIndex(h => h.text === para.text);
                        removeHighlight(idx);
                      }}>
                      <span className="para-label">{para.label}</span>
                      {para.text}
                    </span>
                  ) : (
                    <>
                      <span className="para-label">{para.label}</span>
                      {para.text}
                    </>
                  )}
                </p>
                {showTranslation && translations[`${currentPassage}-${idx}`] && (
                  <p className="mt-2 text-[13px] text-gray-500 leading-relaxed pl-5 border-l-2 border-blue-200 italic">
                    {translations[`${currentPassage}-${idx}`]}
                  </p>
                )}
              </div>
            );
          })}
          {!passage.paragraphs?.length && (
            <p className="passage-text whitespace-pre-wrap">{passage.fullText}</p>
          )}
        </div>

        {menu && (
          <SelectionMenu
            pos={menu}
            text={menu.text}
            onClose={() => { setMenu(null); window.getSelection()?.removeAllRanges(); }}
            onNote={applyNote}
            onHighlight={applyHighlight}
          />
        )}
      </div>

      {passages.length > 1 && (
        <div className="flex justify-between items-center px-5 py-2 border-t border-gray-100 bg-gray-50">
          <button onClick={() => onPassageChange(Math.max(0, currentPassage - 1))}
            disabled={currentPassage === 0}
            className="flex items-center gap-1 text-sm text-[#003B71] disabled:opacity-30 hover:underline">
            <ChevronLeft size={14} /> 上一篇
          </button>
          <span className="text-xs text-gray-400">{currentPassage + 1} / {passages.length}</span>
          <button onClick={() => onPassageChange(Math.min(passages.length - 1, currentPassage + 1))}
            disabled={currentPassage === passages.length - 1}
            className="flex items-center gap-1 text-sm text-[#003B71] disabled:opacity-30 hover:underline">
            下一篇 <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
