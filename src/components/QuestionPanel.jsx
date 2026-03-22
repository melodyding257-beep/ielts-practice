import { useState } from 'react';
import { useExam } from '../context/ExamContext';

function TFNGQuestion({ question, answer, onAnswer, showResult }) {
  const opts = question.options || ['TRUE', 'FALSE', 'NOT GIVEN'];
  return (
    <div className="space-y-2">
      {opts.map(opt => {
        const isSelected = answer === opt;
        const isCorrect = showResult && question.answer && opt === question.answer;
        const isWrong = showResult && isSelected && question.answer && opt !== question.answer;
        return (
          <button
            key={opt}
            onClick={() => !showResult && onAnswer(opt)}
            className={`option-btn ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''}`}
          >
            <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0
              ${isSelected ? 'border-blue-800 bg-blue-800 text-white' : 'border-gray-300'}`}>
              {opt[0]}
            </span>
            <span>{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function MCQuestion({ question, answer, onAnswer, showResult }) {
  const opts = question.options || [];
  if (opts.length === 0) return <FillBlank question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />;
  return (
    <div className="space-y-2">
      {opts.map((opt, i) => {
        const optLabel = typeof opt === 'object' ? opt.label : String.fromCharCode(65 + i);
        const optText = typeof opt === 'object' ? opt.text : opt;
        const isSelected = answer === optLabel;
        const isCorrect = showResult && question.answer && optLabel === question.answer;
        const isWrong = showResult && isSelected && question.answer && optLabel !== question.answer;
        return (
          <button
            key={optLabel}
            onClick={() => !showResult && onAnswer(optLabel)}
            className={`option-btn ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''}`}
          >
            <span className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold flex-shrink-0
              ${isSelected ? 'border-blue-800 bg-blue-800 text-white' : 'border-gray-300'}`}>
              {optLabel}
            </span>
            <span className="text-sm">{optText}</span>
          </button>
        );
      })}
    </div>
  );
}

function FillBlank({ question, answer, onAnswer, showResult }) {
  return (
    <div>
      <input
        type="text"
        value={answer || ''}
        onChange={e => !showResult && onAnswer(e.target.value)}
        placeholder="Type your answer..."
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
          ${showResult && question.answer
            ? (answer?.toLowerCase() === question.answer?.toLowerCase()
              ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50')
            : 'border-gray-300'}`}
      />
      {showResult && question.answer && (
        <div className="mt-1 text-xs text-green-700 font-medium">
          Correct answer: {question.answer}
        </div>
      )}
    </div>
  );
}

function QuestionItem({ question, answer, onAnswer, showResult, isCurrent, onClick }) {
  const hasAnswer = answer !== undefined && answer !== '';

  return (
    <div
      className={`question-item cursor-pointer ${hasAnswer ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-2">
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
          ${hasAnswer ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}>
          {question.number}
        </span>
        <p className="text-sm text-gray-800 font-medium leading-snug flex-1">{question.text}</p>
      </div>

      {isCurrent && (
        <div className="mt-3 ml-10">
          {(question.type === 'TRUE_FALSE_NOT_GIVEN' || question.type === 'YES_NO_NOT_GIVEN') && (
            <TFNGQuestion question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />
          )}
          {question.type === 'MULTIPLE_CHOICE' && (
            <MCQuestion question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />
          )}
          {(question.type === 'SENTENCE_COMPLETION' || question.type === 'SUMMARY_COMPLETION' || question.type === 'SHORT_ANSWER') && (
            <FillBlank question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />
          )}
          {(question.type === 'MATCHING' || question.type === 'MATCHING_HEADINGS') && (
            <FillBlank question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />
          )}
        </div>
      )}
    </div>
  );
}

export default function QuestionPanel({ showResult = false }) {
  const { examData, answers, setAnswer } = useExam();
  const [currentQ, setCurrentQ] = useState(1);

  if (!examData || !examData.questionSets) return null;

  const allQuestions = examData.questionSets.flatMap(s => s.questions);
  const answeredCount = allQuestions.filter(q => answers[q.number] !== undefined && answers[q.number] !== '').length;

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {answeredCount} / {allQuestions.length} answered
        </span>
        <div className="flex gap-1 flex-wrap justify-end max-w-xs">
          {allQuestions.map(q => {
            const isAnswered = answers[q.number] !== undefined && answers[q.number] !== '';
            return (
              <button
                key={q.number}
                onClick={() => setCurrentQ(q.number)}
                className={`nav-btn ${isAnswered ? 'answered' : ''} ${currentQ === q.number ? 'current' : ''}`}
              >
                {q.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions list */}
      <div className="flex-1 overflow-y-auto p-3">
        {examData.questionSets.map((set, si) => (
          <div key={si} className="mb-4">
            {/* Section header */}
            <div className="mb-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
                Questions {set.questionRange}
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{set.instruction}</p>
            </div>

            {/* Questions */}
            {set.questions.map(q => (
              <QuestionItem
                key={q.number}
                question={q}
                answer={answers[q.number]}
                onAnswer={val => setAnswer(q.number, val)}
                showResult={showResult}
                isCurrent={currentQ === q.number}
                onClick={() => setCurrentQ(q.number)}
              />
            ))}
          </div>
        ))}

        {allQuestions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">No structured questions detected.</p>
            <p className="text-xs mt-1">Questions may need manual identification from the passage.</p>
          </div>
        )}
      </div>
    </div>
  );
}
