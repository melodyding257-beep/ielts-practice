import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, CheckSquare, Flag, X, Info, BookOpen, Settings } from 'lucide-react';
import { useExam } from '../context/ExamContext';
import PassageView from '../components/PassageView';
import QuestionPanel from '../components/QuestionPanel';
import Timer from '../components/Timer';

function ReviewPanel({ allQ, answers, flagged, onJump, onEnd }) {
  const answered = allQ.filter(q => answers[q.number] !== undefined && answers[q.number] !== '');
  const unanswered = allQ.filter(q => answers[q.number] === undefined || answers[q.number] === '');
  const flaggedQ = allQ.filter(q => flagged.includes(q.number));
  return (
    <div className="border-t border-gray-200 bg-[#f7f8fa] px-4 py-3">
      <div className="flex flex-wrap gap-4 justify-center text-[12px]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-600" />
          <span className="text-gray-600">已作答 ({answered.length})</span>
          {answered.length > 0 && <button onClick={() => onJump(answered[0].number)} className="text-blue-600 hover:underline ml-1">查看</button>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-300" />
          <span className="text-gray-600">未作答 ({unanswered.length})</span>
          {unanswered.length > 0 && <button onClick={() => onJump(unanswered[0].number)} className="text-blue-600 hover:underline ml-1">查看</button>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="text-gray-600">标记 ({flagged.length})</span>
        </div>
        <button onClick={onEnd} className="ml-4 px-4 py-1.5 bg-[#c0392b] hover:bg-[#a93226] text-white text-[12px] font-semibold rounded-lg transition-colors">
          结束测试
        </button>
      </div>
    </div>
  );
}

export default function Practice() {
  const navigate = useNavigate();
  const { examData, answers, mode, fileName, submitExam, reset } = useExam();
  const [currentPassage, setCurrentPassage] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMobileQ, setShowMobileQ] = useState(false);
  const [flagged, setFlagged] = useState([]);

  if (!examData) { navigate('/'); return null; }

  const isReadingOnly = !examData.hasQuestions;
  const noAnswers = examData.hasQuestions && !examData.hasAnswerKey;
  const allQ = examData.questionSets?.flatMap(s => s.questions) || [];
  const answeredCount = allQ.filter(q => answers[q.number] !== undefined && answers[q.number] !== '').length;
  const totalPassages = examData.passages?.length || 1;

  const handleSubmit = () => { submitExam(); navigate('/results'); };
  const handleHome = () => { reset(); navigate('/'); };
  const handleFlag = (num) => setFlagged(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
  const handleJump = () => {};

  return (
    <div className="flex flex-col h-screen practice-body">
      {/* Dark navy header */}
      <div className="flex items-center justify-between px-4 flex-shrink-0"
        style={{ background: '#0f0f14', minHeight: 52, borderBottom: '1px solid #27272a' }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleHome} className="p-1.5 hover:bg-white/10 rounded transition-colors flex-shrink-0">
            <Home size={16} className="text-white" />
          </button>
          {totalPassages > 1 && (
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: totalPassages }, (_, i) => (
                <button key={i} onClick={() => setCurrentPassage(i)}
                  className={`px-2.5 py-1 text-[12px] font-semibold rounded transition-colors
                    ${currentPassage === i ? 'bg-white/20 text-white' : 'text-blue-200 hover:text-white'}`}>
                  P{i + 1}
                </button>
              ))}
            </div>
          )}
          <div className="min-w-0 hidden md:block">
            <p className="text-white text-[13px] font-semibold truncate max-w-48 leading-tight">{fileName}</p>
            <p className="text-blue-300 text-[10px] leading-tight">
              {isReadingOnly ? '阅读模式' : mode === 'exam' ? '考试模式' : '练习模式'}
            </p>
          </div>
        </div>

        {!isReadingOnly && (
          <div className="hidden lg:flex flex-col items-center">
            <p className="text-white/80 text-[11px]">
              Passage {Math.min(currentPassage + 1, totalPassages)} of {totalPassages} · Q {allQ[0]?.number || 1}–{allQ.length}
            </p>
            <div className="flex gap-1 mt-1">
              {allQ.slice(0, 40).map(q => (
                <div key={q.number}
                  className={`w-2 h-2 rounded-full transition-colors
                    ${answers[q.number] !== undefined ? 'bg-green-400' : 'bg-white/25'}
                    ${flagged.includes(q.number) ? 'ring-1 ring-amber-400' : ''}`}
                />
              ))}
              {allQ.length > 40 && <span className="text-white/40 text-[10px]">+{allQ.length - 40}</span>}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {!isReadingOnly && mode === 'exam' && <Timer durationMinutes={60} onTimeUp={handleSubmit} />}
          {!isReadingOnly && (
            <button onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 bg-white text-[#1e3a6e] hover:bg-blue-50 font-semibold text-[12.5px] px-3 py-1.5 rounded-lg transition-colors">
              <CheckSquare size={13} /> 提交
            </button>
          )}
          <button onClick={() => setShowMobileQ(v => !v)}
            className="lg:hidden p-1.5 hover:bg-white/10 rounded transition-colors text-white">
            {showMobileQ ? <X size={17} /> : <Settings size={17} />}
          </button>
        </div>
      </div>

      {noAnswers && (
        <div className="px-4 py-1.5 bg-sky-50 border-b border-sky-200 flex items-center gap-2 flex-shrink-0">
          <Info size={12} className="text-sky-500" />
          <p className="text-[12px] text-sky-700 font-medium">此阅读无标准答案，提交后将保存作答记录（不自动批改）。</p>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        <div className={`flex flex-col bg-white ${showMobileQ ? 'hidden' : 'flex'} lg:flex w-full lg:w-1/2`}
          style={{ borderRight: '1px solid #e5e7eb' }}>
          <PassageView passages={examData.passages} currentPassage={currentPassage} onPassageChange={setCurrentPassage} />
        </div>

        {!isReadingOnly ? (
          <div className={`flex flex-col ${showMobileQ ? 'flex' : 'hidden'} lg:flex w-full lg:w-1/2 bg-white`}>
            <div className="flex-1 overflow-hidden">
              <QuestionPanel showResult={false} flaggedQuestions={flagged} onToggleFlag={handleFlag} />
            </div>
            <ReviewPanel allQ={allQ} answers={answers} flagged={flagged} onJump={handleJump} onEnd={() => setShowConfirm(true)} />
          </div>
        ) : (
          <div className="hidden lg:flex flex-col w-1/2 items-center justify-center bg-white text-center p-8">
            <BookOpen size={36} className="text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm font-medium">阅读模式</p>
            <p className="text-gray-300 text-xs mt-1 max-w-xs">此文件无结构化题目，请在左侧阅读文章并使用翻译功能。</p>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full">
            <h3 className="text-base font-bold text-gray-900 mb-2">确认提交？</h3>
            <p className="text-sm text-gray-600">已作答 <strong>{answeredCount}</strong> / <strong>{allQ.length}</strong> 题</p>
            {answeredCount < allQ.length && <p className="text-xs text-amber-600 mt-1">还有 {allQ.length - answeredCount} 题未作答。</p>}
            {noAnswers && <p className="text-xs text-sky-600 mt-1">无标准答案，提交后仅保存记录。</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">继续作答</button>
              <button onClick={handleSubmit}
                className="flex-1 py-2.5 bg-[#1e3a6e] text-white rounded-xl text-sm font-semibold hover:bg-[#1a2a4a]">确认提交</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
