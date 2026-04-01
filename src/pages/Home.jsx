import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, AlertTriangle, Info, Pencil, Loader, Trash2, FileText, History } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { useExam } from '../context/ExamContext';

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return d.toLocaleDateString('zh-CN');
}

function HistoryItem({ record, onOpen, onDelete }) {
  return (
    <div className="flex items-center gap-3 p-3 border border-[#27272a] rounded-xl hover:border-[#7c3aed] hover:bg-[#1f1f26] transition-all group">
      <div className="w-9 h-9 bg-[#7c3aed]/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <FileText size={16} className="text-[#7c3aed]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{record.name}</p>
        <p className="text-[11px] text-[#71717a] mt-0.5">
          {record.passagesCount} 篇 · {record.questionsCount > 0 ? `${record.questionsCount} 题` : '阅读模式'}
          {record.hasAnswerKey ? ' · 附答案' : ''}
          <span className="mx-1">·</span>
          {formatDate(record.uploadedAt)}
          <span className="mx-1">·</span>
          {formatBytes(record.size)}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onOpen(record.id)}
          className="px-3 py-1.5 bg-[#7c3aed] text-white text-[11px] font-semibold rounded-lg hover:bg-[#6d28d9] transition-colors">
          打开
        </button>
        <button onClick={() => onDelete(record.id)}
          className="p-1.5 text-[#71717a] hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { startSession } = useExam();
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [selectedMode, setSelectedMode] = useState('practice');
  const [confirmedAnswers, setConfirmedAnswers] = useState({});
  const [showAnswerConfirm, setShowAnswerConfirm] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(null);
  const [editText, setEditText] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [openingId, setOpeningId] = useState(null);

  // Load history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const { getFileRecords } = await import('../utils/historyManager');
        const records = await getFileRecords();
        setHistory(records);
      } catch {
        // IndexedDB may not be available
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleParsed = async (data, name, file) => {
    setParsed(data);
    setFileName(name);
    setConfirmedAnswers(data._ocrAnswers || {});
    setShowAnswerConfirm(data._ocrPerformed && Object.keys(data._ocrAnswers || {}).length > 0);

    // Save to history
    if (file) {
      try {
        const { saveFileRecord } = await import('../utils/historyManager');
        await saveFileRecord(file, data);
        const { getFileRecords } = await import('../utils/historyManager');
        const records = await getFileRecords();
        setHistory(records);
      } catch { /* ignore */ }
    }
  };

  const handleHistoryOpen = async (id) => {
    setOpeningId(id);
    try {
      const { getFileBuffer } = await import('../utils/historyManager');
      const result = await getFileBuffer(id);
      if (!result) return;
      const file = new File([result.buffer], result.name, { type: result.type });
      // Re-parse the file
      const { extractText } = await import('../utils/ieltsParser');
      const { parseIELTSText } = await import('../utils/ieltsParser');
      const ext = file.name.split('.').pop().toLowerCase();
      const extResult = await extractText(file, () => {});
      const text = extResult.text;

      let ocrAnswers = null;
      let ocrPerformed = false;
      if (extResult.file) {
        try {
          const { extractAnswersFromPDF } = await import('../utils/ocrPdfAnswers.js');
          ocrAnswers = await extractAnswersFromPDF(extResult.file, 27, 40, () => {});
          ocrPerformed = true;
        } catch { /* OCR failed */ }
      }
      const parsedData = parseIELTSText(text, ocrAnswers);
      parsedData._ocrPerformed = ocrPerformed;
      parsedData._ocrAnswers = ocrAnswers || {};
      handleParsed(parsedData, file.name, null); // null = don't double-save
    } catch (e) {
      alert('无法重新打开文件，请重新上传。');
    } finally {
      setOpeningId(null);
    }
  };

  const handleHistoryDelete = async (id) => {
    if (!confirm('确定删除此记录？')) return;
    try {
      const { deleteFileRecord } = await import('../utils/historyManager');
      await deleteFileRecord(id);
      setHistory(prev => prev.filter(r => r.id !== id));
    } catch { /* ignore */ }
  };

  const handleStart = () => {
    if (!parsed) return;
    const mergedData = { ...parsed };
    mergedData.questionSets = mergedData.questionSets.map(set => ({
      ...set,
      questions: set.questions.map(q => {
        const confirmed = confirmedAnswers[q.number];
        if (confirmed !== undefined) return { ...q, answer: confirmed };
        return q;
      }),
    }));
    startSession(mergedData, selectedMode, fileName);
    navigate('/practice');
  };

  const handleEditAnswer = (qNum, value) => {
    setEditingAnswer({ qNum, value });
    setEditText(value || '');
  };

  const handleSaveEdit = () => {
    if (editingAnswer) {
      setConfirmedAnswers(prev => ({ ...prev, [editingAnswer.qNum]: editText.trim() }));
      setEditingAnswer(null);
    }
  };

  const handleCancelEdit = () => setEditingAnswer(null);

  const answerEntries = Object.entries(confirmedAnswers)
    .map(([num, ans]) => ({ qNum: parseInt(num), ans }))
    .sort((a, b) => a.qNum - b.qNum);

  const detectedCount = answerEntries.length;
  const hasQuestions = parsed?.hasQuestions;
  const hasAnswerKey = parsed?.hasAnswerKey;
  const isReadingOnly = parsed && !hasQuestions;
  const noAnswers = parsed && hasQuestions && !hasAnswerKey;

  return (
    <div className="min-h-screen" style={{ background: '#09090b' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center gap-3 border-b border-white/10">
        <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
          <BookOpen size={17} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-none">IELTS Reading Practice</h1>
          <p className="text-blue-300 text-[11px] mt-0.5">Computer-Based Practice Platform</p>
        </div>
      </header>

      <div className="flex flex-col items-center px-4 py-10 gap-6">
        <div className="text-center mb-2">
          <h2 className="text-[28px] font-bold text-white mb-2">上传雅思阅读文件</h2>
          <p className="text-blue-200 text-sm max-w-sm mx-auto leading-relaxed">
            支持 PDF、Word 文档、图片（OCR）<br />自动识别题目、段落与答案
          </p>
        </div>

        {/* History section */}
        {!parsed && history.length > 0 && (
          <div className="w-full max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <History size={14} className="text-blue-300" />
              <span className="text-blue-200 text-xs font-semibold uppercase tracking-wider">最近练习</span>
            </div>
            <div className="space-y-2">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader size={20} className="text-blue-300 animate-spin" />
                </div>
              ) : (
                history.map(r => (
                  <HistoryItem key={r.id} record={r} onOpen={handleHistoryOpen} onDelete={handleHistoryDelete} />
                ))
              )}
            </div>
          </div>
        )}

        {/* Upload card */}
        <div className="bg-[#18181b] rounded-2xl shadow-2xl p-7 w-full max-w-md border border-[#27272a]">
          <FileUpload onParsed={(data, name, file) => handleParsed(data, name, file)} />

          {parsed && (
            <div className="mt-5">
              {/* File info */}
              <div className="flex items-center gap-2.5 p-3 bg-[#27272a] border border-[#3f3f46] rounded-lg mb-4">
                <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{fileName}</p>
                  <p className="text-xs text-[#71717a]">
                    {parsed.passages?.length || 0} 篇文章
                    {hasQuestions ? ` · ${parsed.totalQuestions} 道题` : ''}
                    {hasAnswerKey ? ' · 含答案' : ''}
                  </p>
                </div>
              </div>

              {/* Status banners */}
              {isReadingOnly && (
                <div className="reading-mode-banner mb-4">
                  <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-200">无法练习此文章，但可以做成阅读版本</p>
                    <p className="text-xs text-amber-400 mt-0.5">未检测到结构化题目，将以纯阅读模式打开，保留翻译功能。</p>
                  </div>
                </div>
              )}

              {noAnswers && (
                <div className="no-answer-banner mb-4">
                  <Info size={15} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-200">这篇阅读没有答案，做完之后无法批改</p>
                    <p className="text-xs text-indigo-400 mt-0.5">提交后将保存你的作答记录，供自行对照参考。</p>
                  </div>
                </div>
              )}

              {/* Answer confirmation from OCR */}
              {showAnswerConfirm && detectedCount > 0 && (
                <div className="mb-4 p-3 bg-[#27272a] border border-[#7c3aed] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={14} className="text-[#a78bfa] flex-shrink-0" />
                    <p className="text-sm font-semibold text-white">检测到答案（共 {detectedCount} 题）</p>
                  </div>
                  <p className="text-xs text-[#a1a1aa] mb-2.5">请确认以下答案是否正确，如有错误可点击编辑。</p>
                  <div className="flex flex-wrap gap-1.5">
                    {answerEntries.map(({ qNum, ans }) => (
                      <div key={qNum} className="flex items-center gap-1 bg-[#27272a] border border-[#3f3f46] rounded px-2 py-1">
                        <span className="text-[11px] font-bold text-[#71717a]">Q{qNum}</span>
                        <span className="text-[12px] font-semibold text-[#a78bfa]">{ans}</span>
                        <button onClick={() => handleEditAnswer(qNum, ans)}
                          className="ml-0.5 text-[#71717a] hover:text-[#7c3aed] transition-colors">
                          <Pencil size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {editingAnswer && (
                    <div className="mt-3 p-2.5 bg-[#27272a] border border-[#7c3aed] rounded-lg">
                      <p className="text-xs font-semibold text-[#a1a1aa] mb-1.5">编辑 Q{editingAnswer.qNum} 的答案</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="flex-1 border border-[#3f3f46] bg-[#18181b] text-white rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                          placeholder="输入答案"
                          autoFocus
                        />
                        <button onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-[#7c3aed] text-white text-xs font-semibold rounded hover:bg-[#6d28d9]">
                          保存
                        </button>
                        <button onClick={handleCancelEdit}
                          className="px-3 py-1.5 border border-[#3f3f46] text-[#a1a1aa] text-xs font-semibold rounded hover:bg-[#27272a]">
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode selection (only if has questions) */}
              {hasQuestions && (
                <div className="mb-5">
                  <p className="text-xs font-bold text-[#71717a] uppercase tracking-wider mb-2">选择模式</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { key: 'practice', icon: BookOpen, label: '练习模式', desc: '无时限，可随时查看' },
                      { key: 'exam', icon: Clock, label: '考试模式', desc: '60分钟计时，模拟真实考试' },
                    ].map(({ key, icon: Icon, label, desc }) => (
                      <button key={key} onClick={() => setSelectedMode(key)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all
                          ${selectedMode === key ? 'border-[#7c3aed] bg-[#7c3aed]/10' : 'border-[#3f3f46] hover:border-[#7c3aed]'}`}>
                        <Icon size={18} className={selectedMode === key ? 'text-[#7c3aed]' : 'text-[#71717a]'} />
                        <p className={`font-semibold text-sm mt-2 ${selectedMode === key ? 'text-[#7c3aed]' : 'text-[#a1a1aa]'}`}>{label}</p>
                        <p className="text-xs text-[#71717a] mt-0.5 leading-snug">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleStart}
                className="w-full bg-[#003B71] hover:bg-[#002147] text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                {isReadingOnly ? '进入阅读模式' : `开始${selectedMode === 'exam' ? '考试' : '练习'}`}
              </button>
            </div>
          )}
        </div>

        {/* Feature tags */}
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {['PDF / DOCX / 图片', '全文一键翻译', '划词翻译', '60分钟考试模式', '重点词汇报告', '长难句分析'].map(f => (
            <span key={f} className="px-3 py-1 bg-white/10 text-white/80 text-xs rounded-full border border-white/20">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
