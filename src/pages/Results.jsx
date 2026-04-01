import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Home, RotateCcw, CheckCircle, XCircle, BookOpen, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useExam } from '../context/ExamContext';
import PassageView from '../components/PassageView';
import QuestionPanel from '../components/QuestionPanel';

function getBand(correct, total) {
  if (total === 0) return 'N/A';
  const p = correct / total;
  if (p >= 0.97) return '9.0'; if (p >= 0.93) return '8.5'; if (p >= 0.87) return '8.0';
  if (p >= 0.80) return '7.5'; if (p >= 0.73) return '7.0'; if (p >= 0.67) return '6.5';
  if (p >= 0.60) return '6.0'; if (p >= 0.53) return '5.5'; if (p >= 0.47) return '5.0';
  if (p >= 0.40) return '4.5'; return '4.0';
}

function ScoreRing({ score, total }) {
  const pct = total > 0 ? score / total : 0;
  const band = getBand(score, total);
  const color = pct >= 0.7 ? '#16a34a' : pct >= 0.5 ? '#d97706' : '#dc2626';
  const r = 52, circ = 2 * Math.PI * r;
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 64 64)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold text-gray-900">{score}<span className="text-base text-gray-400">/{total}</span></div>
        <div className="text-xs text-gray-500 font-medium">Band {band}</div>
      </div>
    </div>
  );
}

function VocabReport({ passages }) {
  const [open, setOpen] = useState(false);
  const [words, setWords] = useState([]);
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { generateVocabReport } = await import('../utils/reportGenerator');
        const { translateWord } = await import('../utils/translateApi');
        const report = await generateVocabReport(passages);
        if (cancelled) return;
        setWords(report);
        // Translate first 10 words in background
        const newTrans = {};
        for (let i = 0; i < Math.min(10, report.length); i++) {
          try {
            newTrans[report[i].word] = await translateWord(report[i].word);
          } catch { break; }
        }
        if (!cancelled) {
          setTranslations(newTrans);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [passages]);

  if (!words.length) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-blue-700" />
          <span className="text-sm font-semibold text-gray-800">重点词汇报告</span>
          <span className="text-xs text-gray-400">({words.length} 词)</span>
          {loading && <span className="text-[10px] text-blue-400">翻译中...</span>}
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && (
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {words.map(({ word, count }) => (
              <div key={word} className="flex flex-col items-start px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-lg min-w-[80px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-blue-900">{word}</span>
                  {count > 1 && <span className="text-[10px] text-blue-400 font-bold">×{count}</span>}
                </div>
                <div className="text-[11px] text-blue-600 mt-0.5 leading-tight min-h-[14px]">
                  {translations[word] || (loading ? '' : '—')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SentenceReport({ passages }) {
  const [open, setOpen] = useState(false);
  const [sentences, setSentences] = useState([]);
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { generateSentenceReport } = await import('../utils/reportGenerator');
        const { translateText } = await import('../utils/translateApi');
        const report = await generateSentenceReport(passages);
        if (cancelled) return;
        setSentences(report);
        // Translate first 3 sentences in background
        const newTrans = {};
        for (let i = 0; i < Math.min(3, report.length); i++) {
          try {
            newTrans[i] = await translateText(report[i].text);
          } catch { break; }
        }
        if (!cancelled) {
          setTranslations(newTrans);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [passages]);

  if (!sentences.length) return null;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-purple-700" />
          <span className="text-sm font-semibold text-gray-800">长难句分析</span>
          <span className="text-xs text-gray-400">({sentences.length} 句)</span>
          {loading && <span className="text-[10px] text-purple-400">翻译中...</span>}
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && (
        <div className="p-4 space-y-4">
          {sentences.map((s, i) => (
            <div key={i} className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
              <p className="text-[13px] text-gray-800 leading-relaxed font-serif italic">"{s.text}"</p>
              <div className="mt-1.5 pt-1.5 border-t border-purple-100">
                <p className="text-[12px] leading-relaxed text-purple-700">
                  {translations[i] || (loading ? '翻译中...' : '—')}
                </p>
                <p className="text-[11px] text-purple-400 mt-1 font-medium">{s.wordCount} 词</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const { examData, answers, calculateScore, reset, startSession, mode, fileName } = useExam();
  const [showReview, setShowReview] = useState(false);
  const [reviewPassage, setReviewPassage] = useState(0);

  if (!examData) { navigate('/'); return null; }

  const { score, total, correct, wrong } = calculateScore();
  const hasAnswerKey = examData.hasAnswerKey;
  const allQ = examData.questionSets?.flatMap(s => s.questions) || [];
  const answeredCount = allQ.filter(q => answers[q.number] !== undefined && answers[q.number] !== '').length;

  const handleRetry = () => { startSession(examData, mode, fileName); navigate('/practice'); };
  const handleHome = () => { reset(); navigate('/'); };

  if (showReview) {
    return (
      <div className="flex flex-col h-screen" style={{ background: '#f0f2f5' }}>
        <div className="flex items-center gap-3 px-4 flex-shrink-0 shadow-sm"
          style={{ background: '#003B71', minHeight: 52 }}>
          <button onClick={() => setShowReview(false)} className="p-1.5 hover:bg-white/10 rounded text-white">
            <Home size={17} />
          </button>
          <span className="text-white font-semibold text-sm">查看答案与解析</span>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="w-1/2 bg-white border-r border-gray-200 flex flex-col">
            <PassageView passages={examData.passages} currentPassage={reviewPassage} onPassageChange={setReviewPassage} />
          </div>
          <div className="w-1/2 bg-white flex flex-col">
            <QuestionPanel showResult={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#09090b' }}>
      <div className="bg-[#18181b] rounded-2xl shadow-2xl p-7 max-w-lg w-full border border-[#27272a]">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-11 h-11 bg-[#7c3aed]/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen size={22} className="text-[#7c3aed]" />
          </div>
          <h2 className="text-xl font-bold text-white">测试完成</h2>
          <p className="text-gray-400 text-xs mt-1 truncate max-w-xs mx-auto">{fileName}</p>
        </div>

        {/* Score */}
        <div className="flex justify-center mb-5">
          {hasAnswerKey ? (
            <ScoreRing score={score} total={total} />
          ) : (
            <div className="text-center py-4">
              <div className="text-5xl font-bold text-[#7c3aed]">{answeredCount}</div>
              <div className="text-[#71717a] text-sm mt-1">题已作答 / 共 {allQ.length} 题</div>
              <p className="text-xs text-[#52525b] mt-2 max-w-xs">此文章无标准答案，已保存你的作答记录</p>
            </div>
          )}
        </div>

        {/* Stats */}
        {(() => {
          const stats = hasAnswerKey
            ? [
                { label: '已作答', value: answeredCount, Ic: CheckCircle, color: 'text-blue-600' },
                { label: '正确', value: correct.length, Ic: CheckCircle, color: 'text-green-600' },
                { label: '错误', value: wrong.length, Ic: XCircle, color: 'text-red-500' },
              ]
            : [
                { label: '已作答', value: answeredCount, Ic: CheckCircle, color: 'text-blue-600' },
                { label: '未作答', value: allQ.length - answeredCount, Ic: XCircle, color: 'text-amber-500' },
              ];
          return (
            <div className={`grid gap-3 mb-5 ${hasAnswerKey ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {stats.map(({ label, value, Ic, color }) => (
                <div key={label} className="bg-[#27272a] rounded-xl p-3 text-center border border-[#3f3f46]">
                  <Ic size={16} className={`${color} mx-auto mb-1`} />
                  <div className="text-xl font-bold text-white">{value}</div>
                  <div className="text-xs text-[#71717a]">{label}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Wrong answers */}
        {hasAnswerKey && wrong.length > 0 && (
          <div className="mb-4 p-3 bg-[#27272a] rounded-xl border border-[#3f3f46]">
            <p className="text-xs font-bold text-[#f87171] mb-2 uppercase tracking-wide">需要复习的题目</p>
            <div className="flex flex-wrap gap-1.5">
              {wrong.map(w => (
                <span key={w.number} className="text-xs bg-[#3f3f46] text-[#f87171] px-2 py-0.5 rounded font-mono font-bold">
                  Q{w.number}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reports */}
        <div className="space-y-2 mb-5">
          <VocabReport passages={examData.passages} />
          <SentenceReport passages={examData.passages} />
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button onClick={() => setShowReview(true)}
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
            <BookOpen size={15} /> 查看答案与解析
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleRetry}
              className="py-2.5 border border-[#3f3f46] rounded-xl text-sm font-medium text-[#a1a1aa] hover:bg-[#27272a] flex items-center justify-center gap-1.5">
              <RotateCcw size={13} /> 重新练习
            </button>
            <button onClick={handleHome}
              className="py-2.5 border border-[#3f3f46] rounded-xl text-sm font-medium text-[#a1a1aa] hover:bg-[#27272a] flex items-center justify-center gap-1.5">
              <Home size={13} /> 上传新文件
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
