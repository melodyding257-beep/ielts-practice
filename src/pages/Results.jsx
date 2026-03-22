import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Home, RotateCcw, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { useExam } from '../context/ExamContext';
import PassageView from '../components/PassageView';
import QuestionPanel from '../components/QuestionPanel';

// IELTS Band Score lookup (approximate)
function getBandScore(correct, total) {
  if (total === 0) return 'N/A';
  const pct = correct / total;
  if (pct >= 0.97) return '9.0';
  if (pct >= 0.93) return '8.5';
  if (pct >= 0.87) return '8.0';
  if (pct >= 0.80) return '7.5';
  if (pct >= 0.73) return '7.0';
  if (pct >= 0.67) return '6.5';
  if (pct >= 0.60) return '6.0';
  if (pct >= 0.53) return '5.5';
  if (pct >= 0.47) return '5.0';
  if (pct >= 0.40) return '4.5';
  return '4.0';
}

function ScoreCircle({ score, total }) {
  const pct = total > 0 ? score / total : 0;
  const band = getBandScore(score, total);
  const color = pct >= 0.7 ? '#10B981' : pct >= 0.5 ? '#F59E0B' : '#EF4444';
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle
          cx="72" cy="72" r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 72 72)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-gray-900">{score}<span className="text-lg text-gray-400">/{total}</span></div>
        <div className="text-xs text-gray-500">Band {band}</div>
      </div>
    </div>
  );
}

export default function Results() {
  const navigate = useNavigate();
  const { examData, answers, calculateScore, reset, startSession, mode, fileName } = useExam();
  const [showReview, setShowReview] = useState(false);

  if (!examData) { navigate('/'); return null; }

  const { score, total, correct, wrong } = calculateScore();
  const hasAnswerKey = total > 0;
  const allQuestions = examData.questionSets?.flatMap(s => s.questions) || [];
  const answeredCount = allQuestions.filter(q => answers[q.number] !== undefined && answers[q.number] !== '').length;

  const handleRetry = () => {
    startSession(examData, mode, fileName);
    navigate('/practice');
  };

  const handleHome = () => { reset(); navigate('/'); };

  if (showReview) {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setShowReview(false)} className="p-1.5 hover:bg-white/10 rounded">
            <Home size={18} />
          </button>
          <span className="font-semibold text-sm">Review Answers</span>
        </div>
        <div className="flex flex-1 min-h-0">
          <div className="w-1/2 bg-white border-r border-gray-200 flex flex-col">
            <PassageView passages={examData.passages} currentPassage={0} onPassageChange={() => {}} />
          </div>
          <div className="w-1/2 bg-gray-50 flex flex-col">
            <QuestionPanel showResult={true} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
        {/* Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} className="text-blue-700" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Test Complete</h2>
          <p className="text-gray-500 text-sm mt-1 truncate">{fileName}</p>
        </div>

        {/* Score */}
        <div className="flex justify-center mb-6">
          {hasAnswerKey ? (
            <ScoreCircle score={score} total={total} />
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-blue-800">{answeredCount}</div>
              <div className="text-gray-500 text-sm">questions answered</div>
              <p className="text-xs text-gray-400 mt-2">
                (No answer key detected in file — cannot auto-score)
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Answered', value: answeredCount, icon: CheckCircle, color: 'text-blue-600' },
            hasAnswerKey && { label: 'Correct', value: correct.length, icon: CheckCircle, color: 'text-green-600' },
            hasAnswerKey && { label: 'Wrong', value: wrong.length, icon: XCircle, color: 'text-red-500' },
            !hasAnswerKey && { label: 'Total Questions', value: allQuestions.length, icon: BookOpen, color: 'text-gray-600' },
            !hasAnswerKey && { label: 'Unanswered', value: allQuestions.length - answeredCount, icon: XCircle, color: 'text-amber-500' },
          ].filter(Boolean).slice(0, 3).map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <Icon size={18} className={`${color} mx-auto mb-1`} />
              <div className="text-xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* Wrong answers summary */}
        {hasAnswerKey && wrong.length > 0 && (
          <div className="mb-5 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm font-semibold text-red-700 mb-2">Questions to review:</p>
            <div className="flex flex-wrap gap-1.5">
              {wrong.map(w => (
                <span key={w.number} className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono">
                  Q{w.number}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => setShowReview(true)}
            className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen size={16} /> Review Answers
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleRetry}
              className="py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} /> Try Again
            </button>
            <button
              onClick={handleHome}
              className="py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5"
            >
              <Home size={14} /> New File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
