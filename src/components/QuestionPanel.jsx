import { useState } from 'react';
import { useExam } from '../context/ExamContext';

function MatchingParagraph({ question, answer, onAnswer, showResult }) {
  const opts = question.options || ['A','B','C','D','E','F','G'];
  const isRight = showResult && question.answer && answer?.toUpperCase() === question.answer?.toUpperCase();
  const isWrong = showResult && question.answer && answer && !isRight;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {opts.map(opt => {
          const selected = answer?.toUpperCase() === opt;
          const isCorrectOpt = showResult && question.answer?.toUpperCase() === opt;
          return (
            <button key={opt} onClick={() => !showResult && onAnswer(opt)}
              className={`w-9 h-9 rounded border-2 text-sm font-bold transition-all
                ${selected && !showResult ? 'bg-blue-800 border-blue-800 text-white' : ''}
                ${!selected ? 'border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-700 bg-white' : ''}
                ${isCorrectOpt && showResult ? 'bg-green-600 border-green-600 text-white' : ''}
                ${selected && isWrong ? 'bg-red-500 border-red-500 text-white' : ''}
                ${selected && isRight ? 'bg-green-600 border-green-600 text-white' : ''}`}>
              {opt}
            </button>
          );
        })}
      </div>
      {showResult && question.answer && (
        <p className="mt-1.5 text-xs font-medium text-green-700">正确答案：{question.answer}</p>
      )}
    </div>
  );
}

function TFNGQuestion({ question, answer, onAnswer, showResult }) {
  const opts = question.options || ['TRUE', 'FALSE', 'NOT GIVEN'];
  return (
    <div className="space-y-1.5 mt-3">
      {opts.map(opt => {
        const selected = answer === opt;
        const correct = showResult && question.answer && opt.toUpperCase() === question.answer.toUpperCase();
        const wrong = showResult && selected && !correct;
        return (
          <button key={opt} onClick={() => !showResult && onAnswer(opt)}
            className={`ielts-option ${selected && !showResult ? 'ielts-option-selected' : ''} ${correct ? 'ielts-option-correct' : ''} ${wrong ? 'ielts-option-wrong' : ''} ${selected && !correct && !wrong ? 'ielts-option-selected' : ''}`}>
            <span className={`option-circle ${selected ? 'option-circle-active' : ''} ${correct ? 'option-circle-correct' : ''} ${wrong ? 'option-circle-wrong' : ''}`}>{opt[0]}</span>
            <span className="text-sm">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function MCQuestion({ question, answer, onAnswer, showResult }) {
  const opts = question.options || [];
  if (!opts.length) return <FillBlank question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />;
  return (
    <div className="space-y-1.5 mt-3">
      {opts.map((opt, i) => {
        const lbl = typeof opt === 'object' ? opt.label : String.fromCharCode(65 + i);
        const txt = typeof opt === 'object' ? opt.text : opt;
        const selected = answer === lbl;
        const correct = showResult && question.answer && lbl === question.answer;
        const wrong = showResult && selected && !correct;
        return (
          <button key={lbl} onClick={() => !showResult && onAnswer(lbl)}
            className={`ielts-option ${selected && !showResult ? 'ielts-option-selected' : ''} ${correct ? 'ielts-option-correct' : ''} ${wrong ? 'ielts-option-wrong' : ''} ${selected && !correct && !wrong ? 'ielts-option-selected' : ''}`}>
            <span className={`option-circle rounded ${selected ? 'option-circle-active' : ''} ${correct ? 'option-circle-correct' : ''} ${wrong ? 'option-circle-wrong' : ''}`}>{lbl}</span>
            <span className="text-sm leading-snug">{txt}</span>
          </button>
        );
      })}
    </div>
  );
}

function FillBlank({ question, answer, onAnswer, showResult }) {
  const isRight = showResult && question.answer && answer?.toLowerCase().trim() === question.answer?.toLowerCase().trim();
  const isWrong = showResult && question.answer && answer && !isRight;
  return (
    <div className="mt-3">
      <input type="text" value={answer || ''} onChange={e => !showResult && onAnswer(e.target.value)}
        placeholder="输入答案..."
        className={`w-full border rounded-md px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white
          ${isRight ? 'border-green-500 bg-green-50 text-green-800' : ''}
          ${isWrong ? 'border-red-400 bg-red-50 text-red-800' : ''}
          ${!isRight && !isWrong ? 'border-gray-300' : ''}`} />
      {isWrong && <p className="mt-1 text-xs font-medium text-green-700">正确答案：{question.answer}</p>}
      {showResult && !question.answer && answer && (
        <p className="mt-1 text-xs text-gray-500 italic">（无标准答案，已记录你的回答）</p>
      )}
    </div>
  );
}

function QuestionItem({ question, answer, onAnswer, showResult, isCurrent, onClick }) {
  const has = answer !== undefined && answer !== '';
  return (
    <div onClick={onClick} className={`ielts-question-item ${has ? 'answered' : ''} ${isCurrent ? 'current' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`q-num-badge flex-shrink-0 ${has ? 'q-num-answered' : 'q-num-empty'}`}>{question.number}</span>
        <p className="text-[13.5px] text-gray-800 leading-snug flex-1 pt-0.5">{question.text}</p>
      </div>
      {isCurrent && (
        <div className="ml-9">
          {(question.type === 'TRUE_FALSE_NOT_GIVEN' || question.type === 'YES_NO_NOT_GIVEN') &&
            <TFNGQuestion question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />}
          {question.type === 'MULTIPLE_CHOICE' &&
            <MCQuestion question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />}
          {question.type === 'MATCHING_PARAGRAPHS' &&
            <MatchingParagraph question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />}
          {(question.type === 'MATCHING' || question.type === 'MATCHING_HEADINGS' ||
            question.type === 'SHORT_ANSWER' || question.type === 'SENTENCE_COMPLETION' ||
            question.type === 'SUMMARY_COMPLETION') &&
            <FillBlank question={question} answer={answer} onAnswer={onAnswer} showResult={showResult} />}
        </div>
      )}
    </div>
  );
}

export default function QuestionPanel({ showResult = false }) {
  const { examData, answers, setAnswer } = useExam();
  const [currentQ, setCurrentQ] = useState(null);
  if (!examData?.questionSets) return null;

  const allQ = examData.questionSets.flatMap(s => s.questions);
  const firstQ = allQ[0]?.number;
  const active = currentQ ?? firstQ;
  const answered = allQ.filter(q => answers[q.number] !== undefined && answers[q.number] !== '').length;

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-4 py-2.5 border-b border-gray-200 bg-[#f7f8fa]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">题目导航</span>
          <span className="text-[11px] text-gray-400">{answered}/{allQ.length} 已作答</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {allQ.map(q => {
            const has = answers[q.number] !== undefined && answers[q.number] !== '';
            return (
              <button key={q.number} onClick={() => setCurrentQ(q.number)}
                className={`q-nav-btn ${has ? 'q-nav-answered' : ''} ${active === q.number ? 'q-nav-current' : ''}`}>
                {q.number}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {examData.questionSets.map((set, si) => (
          <div key={si} className="mb-5">
            <div className="mb-3 p-3 bg-[#eef3fb] border-l-4 border-[#003B71] rounded-r-lg">
              <p className="text-[11px] font-bold text-[#003B71] uppercase tracking-wider mb-1">
                Questions {set.questionRange}
              </p>
              <p className="text-[12.5px] text-gray-700 leading-relaxed">{set.instruction}</p>
            </div>
            {set.questions.map(q => (
              <QuestionItem key={q.number} question={q}
                answer={answers[q.number]}
                onAnswer={val => setAnswer(q.number, val)}
                showResult={showResult}
                isCurrent={active === q.number}
                onClick={() => setCurrentQ(q.number)} />
            ))}
          </div>
        ))}
        {allQ.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">未检测到结构化题目</p>
          </div>
        )}
      </div>
    </div>
  );
}
