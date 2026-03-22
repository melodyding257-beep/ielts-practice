import { createContext, useContext, useState } from 'react';

const ExamContext = createContext(null);

export function ExamProvider({ children }) {
  const [examData, setExamData] = useState(null);    // parsed IELTS data
  const [answers, setAnswers] = useState({});         // { questionNumber: answer }
  const [mode, setMode] = useState('practice');       // 'practice' | 'exam'
  const [startTime, setStartTime] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [fileName, setFileName] = useState('');

  const startSession = (data, selectedMode, name) => {
    setExamData(data);
    setAnswers({});
    setMode(selectedMode);
    setStartTime(Date.now());
    setSubmitted(false);
    setFileName(name);
  };

  const setAnswer = (qNum, answer) => {
    setAnswers(prev => ({ ...prev, [qNum]: answer }));
  };

  const submitExam = () => {
    setSubmitted(true);
  };

  const reset = () => {
    setExamData(null);
    setAnswers({});
    setMode('practice');
    setStartTime(null);
    setSubmitted(false);
    setFileName('');
  };

  // Calculate score (only works if answer keys are present)
  const calculateScore = () => {
    if (!examData) return { score: 0, total: 0, correct: [], wrong: [] };
    let score = 0;
    let total = 0;
    const correct = [];
    const wrong = [];

    examData.questionSets.forEach(set => {
      set.questions.forEach(q => {
        if (q.answer) {
          total++;
          const userAns = (answers[q.number] || '').toString().trim().toLowerCase();
          const correctAns = q.answer.toString().trim().toLowerCase();
          if (userAns === correctAns) {
            score++;
            correct.push(q.number);
          } else {
            wrong.push({ number: q.number, userAnswer: answers[q.number], correctAnswer: q.answer });
          }
        }
      });
    });

    return { score, total, correct, wrong };
  };

  return (
    <ExamContext.Provider value={{
      examData, answers, mode, startTime, submitted, fileName,
      startSession, setAnswer, submitExam, reset, calculateScore,
    }}>
      {children}
    </ExamContext.Provider>
  );
}

export const useExam = () => useContext(ExamContext);
