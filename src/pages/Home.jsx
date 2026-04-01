import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, FileText, AlertTriangle, Info, Pencil, Loader } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { useExam } from '../context/ExamContext';

export default function Home() {
  const navigate = useNavigate();
  const { startSession } = useExam();
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [selectedMode, setSelectedMode] = useState('practice');
  const [confirmedAnswers, setConfirmedAnswers] = useState({});
  const [showAnswerConfirm, setShowAnswerConfirm] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(null); // {qNum, value}
  const [editText, setEditText] = useState('');

  const handleParsed = (data, name) => {
    setParsed(data);
    setFileName(name);
    setConfirmedAnswers(data._ocrAnswers || {});
    setShowAnswerConfirm(data._ocrPerformed && Object.keys(data._ocrAnswers || {}).length > 0);
  };

  const handleStart = () => {
    if (!parsed) return;
    // Merge confirmed answers into parsed question sets
    const mergedData = { ...parsed };
    mergedData.questionSets = mergedData.questionSets.map(set => ({
      ...set,
      questions: set.questions.map(q => {
        const confirmed = confirmedAnswers[q.number];
        if (confirmed !== undefined) {
          return { ...q, answer: confirmed };
        }
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

  const handleCancelEdit = () => {
    setEditingAnswer(null);
  };

  // Build ordered list of Q numbers with answers for display
  const answerEntries = Object.entries(confirmedAnswers)
    .map(([num, ans]) => ({ qNum: parseInt(num), ans }))
    .sort((a, b) => a.qNum - b.qNum);

  const detectedCount = answerEntries.length;

  // Determine content status
  const hasQuestions = parsed?.hasQuestions;
  const hasAnswerKey = parsed?.hasAnswerKey;
  const isReadingOnly = parsed && !hasQuestions;
  const noAnswers = parsed && hasQuestions && !hasAnswerKey;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #002147 0%, #003B71 50%, #005099 100%)' }}>
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

      <div className="flex flex-col items-center px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="text-[28px] font-bold text-white mb-2">上传雅思阅读文件</h2>
          <p className="text-blue-200 text-sm max-w-sm mx-auto leading-relaxed">
            支持 PDF、Word 文档、图片（OCR）<br />自动识别题目、段落与答案
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-7 w-full max-w-md">
          <FileUpload onParsed={handleParsed} />

          {parsed && (
            <div className="mt-5">
              {/* File info */}
              <div className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-green-800 truncate">{fileName}</p>
                  <p className="text-xs text-green-600">
                    {parsed.passages?.length || 0} 篇文章
                    {hasQuestions ? ` · ${parsed.totalQuestions} 道题` : ''}
                    {hasAnswerKey ? ' · 含答案' : ''}
                  </p>
                </div>
              </div>

              {/* Status banners */}
              {isReadingOnly && (
                <div className="reading-mode-banner mb-4">
                  <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">无法练习此文章，但可以做成阅读版本</p>
                    <p className="text-xs text-amber-700 mt-0.5">未检测到结构化题目，将以纯阅读模式打开，保留翻译功能。</p>
                  </div>
                </div>
              )}

              {noAnswers && (
                <div className="no-answer-banner mb-4">
                  <Info size={15} className="text-sky-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-sky-800">这篇阅读没有答案，做完之后无法批改</p>
                    <p className="text-xs text-sky-700 mt-0.5">提交后将保存你的作答记录，供自行对照参考。</p>
                  </div>
                </div>
              )}

              {/* Answer confirmation from OCR */}
              {showAnswerConfirm && detectedCount > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={14} className="text-blue-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-blue-800">检测到答案（共 {detectedCount} 题）</p>
                  </div>
                  <p className="text-xs text-blue-600 mb-2.5">请确认以下答案是否正确，如有错误可点击编辑。</p>
                  <div className="flex flex-wrap gap-1.5">
                    {answerEntries.map(({ qNum, ans }) => (
                      <div key={qNum} className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1">
                        <span className="text-[11px] font-bold text-gray-500">Q{qNum}</span>
                        <span className="text-[12px] font-semibold text-[#003B71]">{ans}</span>
                        <button onClick={() => handleEditAnswer(qNum, ans)}
                          className="ml-0.5 text-gray-400 hover:text-blue-600 transition-colors">
                          <Pencil size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {editingAnswer && (
                    <div className="mt-3 p-2.5 bg-white border border-blue-300 rounded-lg">
                      <p className="text-xs font-semibold text-gray-600 mb-1.5">编辑 Q{editingAnswer.qNum} 的答案</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="输入答案"
                          autoFocus
                        />
                        <button onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-[#003B71] text-white text-xs font-semibold rounded hover:bg-[#002147]">
                          保存
                        </button>
                        <button onClick={handleCancelEdit}
                          className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-semibold rounded hover:bg-gray-50">
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
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">选择模式</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { key: 'practice', icon: BookOpen, label: '练习模式', desc: '无时限，可随时查看' },
                      { key: 'exam', icon: Clock, label: '考试模式', desc: '60分钟计时，模拟真实考试' },
                    ].map(({ key, icon: Icon, label, desc }) => (
                      <button key={key} onClick={() => setSelectedMode(key)}
                        className={`p-3.5 rounded-xl border-2 text-left transition-all
                          ${selectedMode === key ? 'border-[#003B71] bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                        <Icon size={18} className={selectedMode === key ? 'text-[#003B71]' : 'text-gray-400'} />
                        <p className={`font-semibold text-sm mt-2 ${selectedMode === key ? 'text-[#003B71]' : 'text-gray-700'}`}>{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
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
        <div className="flex flex-wrap gap-3 mt-8 justify-center">
          {['PDF / DOCX / 图片', '全文一键翻译', '划词翻译', '60分钟考试模式', '重点词汇报告', '长难句分析'].map(f => (
            <span key={f} className="px-3 py-1 bg-white/10 text-white/80 text-xs rounded-full border border-white/20">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
