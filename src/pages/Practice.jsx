import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, CheckSquare, Menu, X, Info, BookOpen } from 'lucide-react';
import { useExam } from '../context/ExamContext';
import PassageView from '../components/PassageView';
import QuestionPanel from '../components/QuestionPanel';
import Timer from '../components/Timer';

export default function Practice() {
  const navigate = useNavigate();
  const { examData, answers, mode, fileName, submitExam, reset } = useExam();
  const [currentPassage, setCurrentPassage] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMobileQ, setShowMobileQ] = useState(false);

  if (!examData) { navigate('/'); return null; }

  const isReadingOnly = !examData.hasQuestions;
  const noAnswers = examData.hasQuestions && !examData.hasAnswerKey;
  const allQ = examData.questionSets?.flatMap(s => s.questions) || [];
  const answeredCount = allQ.filter(q => answers[q.number] !== undefined && answers[q.number] !== '').length;

  const handleSubmit = () => { submitExam(); navigate('/results'); };
  const handleHome = () => { reset(); navigate('/'); };

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f0f2f5' }}>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-0 flex-shrink-0 shadow-sm"
        style={{ background: '#003B71', minHeight: 52 }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleHome} className="p-1.5 hover:bg-white/10 rounded transition-colors flex-shrink-0">
            <Home size={17} className="text-white" />
          </button>
          <div className="min-w-0">
            <p className="text-white text-[13px] font-semibold truncate max-w-56 leading-tight">{fileName}</p>
            <p className="text-blue-300 text-[11px] leading-tight">
              {isReadingOnly ? '阅读模式' : mode === 'exam' ? '考试模式' : '练习模式'}
              {!isReadingOnly && ` · ${answeredCount}/${allQ.length} 已作答`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'exam' && !isReadingOnly && (
            <Timer durationMinutes={60} onTimeUp={handleSubmit} />
          )}
          {!isReadingOnly && (
            <button onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 bg-white text-[#003B71] hover:bg-blue-50 font-semibold text-[12.5px] px-3 py-1.5 rounded-lg transition-colors">
              <CheckSquare size={14} /> 提交
            </button>
          )}
          <button onClick={() => setShowMobileQ(!showMobileQ)}
            className="lg:hidden p-1.5 hover:bg-white/10 rounded transition-colors text-white">
            {showMobileQ ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* ── Status banners ── */}
      {noAnswers && (
        <div className="px-4 py-2 bg-sky-50 border-b border-sky-200 flex items-center gap-2">
          <Info size={13} className="text-sky-500 flex-shrink-0" />
          <p className="text-[12px] text-sky-700 font-medium">这篇阅读没有答案，做完之后无法批改。提交后将保存你的作答记录。</p>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* Passage — left */}
        <div className={`flex flex-col border-r border-gray-200
          ${showMobileQ ? 'hidden' : 'flex'} lg:flex
          w-full lg:w-1/2 bg-white`}>
          <PassageView passages={examData.passages} currentPassage={currentPassage} onPassageChange={setCurrentPassage} />
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-gray-200 flex-shrink-0" />

        {/* Questions — right */}
        {!isReadingOnly ? (
          <div className={`flex flex-col
            ${showMobileQ ? 'flex' : 'hidden'} lg:flex
            w-full lg:w-1/2 bg-white`}>
            <QuestionPanel showResult={false} />
          </div>
        ) : (
          <div className="hidden lg:flex flex-col w-1/2 items-center justify-center bg-white text-center p-12">
            <BookOpen size={40} className="text-gray-300 mb-3" />
            <p className="text-gray-400 text-sm font-medium">阅读模式</p>
            <p className="text-gray-300 text-xs mt-1 max-w-xs">此文件未包含结构化题目，请在左侧阅读文章，可使用翻译功能。</p>
          </div>
        )}
      </div>

      {/* ── Submit confirmation ── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full">
            <h3 className="text-base font-bold text-gray-900 mb-2">确认提交？</h3>
            <p className="text-sm text-gray-600">
              已作答 <strong>{answeredCount}</strong> / <strong>{allQ.length}</strong> 题
            </p>
            {answeredCount < allQ.length && (
              <p className="text-xs text-amber-600 mt-1">还有 {allQ.length - answeredCount} 题未作答。</p>
            )}
            {noAnswers && (
              <p className="text-xs text-sky-600 mt-1">提交后将保存作答记录（无标准答案，不自动批改）。</p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
                继续作答
              </button>
              <button onClick={handleSubmit}
                className="flex-1 py-2.5 bg-[#003B71] text-white rounded-xl text-sm font-semibold hover:bg-[#002147]">
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
