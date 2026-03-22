import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, CheckSquare, RotateCcw, Menu, X } from 'lucide-react';
import { useExam } from '../context/ExamContext';
import PassageView from '../components/PassageView';
import QuestionPanel from '../components/QuestionPanel';
import Timer from '../components/Timer';

export default function Practice() {
  const navigate = useNavigate();
  const { examData, answers, mode, fileName, submitExam, reset } = useExam();
  const [currentPassage, setCurrentPassage] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [showMobileQ, setShowMobileQ] = useState(false);

  if (!examData) {
    navigate('/');
    return null;
  }

  const allQuestions = examData.questionSets?.flatMap(s => s.questions) || [];
  const answeredCount = allQuestions.filter(q => answers[q.number] !== undefined && answers[q.number] !== '').length;

  const handleSubmit = () => {
    submitExam();
    navigate('/results');
  };

  const handleTimeUp = () => {
    setTimeUp(true);
    handleSubmit();
  };

  const handleHome = () => {
    reset();
    navigate('/');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top bar */}
      <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between gap-3 flex-shrink-0 shadow-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleHome} className="p-1.5 hover:bg-white/10 rounded transition-colors flex-shrink-0">
            <Home size={18} />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate max-w-48">{fileName}</p>
            <p className="text-blue-300 text-xs">
              {mode === 'exam' ? 'Exam Mode' : 'Practice Mode'} · {answeredCount}/{allQuestions.length} answered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'exam' && (
            <Timer durationMinutes={60} onTimeUp={handleTimeUp} />
          )}

          {/* Submit button */}
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-1.5 bg-white text-blue-900 hover:bg-blue-50 font-semibold text-sm px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckSquare size={15} />
            Submit
          </button>

          {/* Mobile toggle */}
          <button
            onClick={() => setShowMobileQ(!showMobileQ)}
            className="lg:hidden p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            {showMobileQ ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Passage panel — left side */}
        <div className={`flex flex-col bg-white border-r border-gray-200
          ${showMobileQ ? 'hidden' : 'flex'} lg:flex
          w-full lg:w-1/2`}>
          <PassageView
            passages={examData.passages}
            currentPassage={currentPassage}
            onPassageChange={setCurrentPassage}
          />
        </div>

        {/* Divider (desktop) */}
        <div className="hidden lg:block w-px bg-gray-200 flex-shrink-0" />

        {/* Question panel — right side */}
        <div className={`flex flex-col bg-gray-50
          ${showMobileQ ? 'flex' : 'hidden'} lg:flex
          w-full lg:w-1/2`}>
          <QuestionPanel showResult={false} />
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Submit Test?</h3>
            <p className="text-sm text-gray-600 mb-1">
              You have answered <strong>{answeredCount}</strong> out of <strong>{allQuestions.length}</strong> questions.
            </p>
            {answeredCount < allQuestions.length && (
              <p className="text-sm text-amber-600 mb-4">
                {allQuestions.length - answeredCount} question(s) still unanswered.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Continue
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-blue-800 text-white rounded-xl text-sm font-semibold hover:bg-blue-900"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
