import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle, FileText } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { useExam } from '../context/ExamContext';

export default function Home() {
  const navigate = useNavigate();
  const { startSession } = useExam();
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [selectedMode, setSelectedMode] = useState('practice');

  const handleParsed = (data, name) => {
    setParsed(data);
    setFileName(name);
  };

  const handleStart = () => {
    if (!parsed) return;
    startSession(parsed, selectedMode, fileName);
    navigate('/practice');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      {/* Header */}
      <header className="px-6 py-4 flex items-center gap-3 border-b border-white/10">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
          <BookOpen size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-none">IELTS Reading Practice</h1>
          <p className="text-blue-200 text-xs">Computer-Based Practice Platform</p>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">
            Upload Your IELTS Paper
          </h2>
          <p className="text-blue-200 max-w-md text-sm leading-relaxed">
            Upload a PDF, Word document, or image of an IELTS reading paper.
            Practice in exam conditions with our computer-based interface.
          </p>
        </div>

        {/* Upload card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
          <FileUpload onParsed={handleParsed} />

          {parsed && (
            <div className="mt-6">
              {/* File info */}
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mb-5">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-800 truncate">{fileName}</p>
                  <p className="text-xs text-green-600">
                    {parsed.passages?.length || 0} passage(s) · {parsed.totalQuestions || 0} questions detected
                  </p>
                </div>
              </div>

              {/* Mode selection */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-gray-700 mb-2">Select Mode</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedMode('practice')}
                    className={`p-4 rounded-xl border-2 text-left transition-all
                      ${selectedMode === 'practice' ? 'border-blue-700 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <BookOpen size={20} className={selectedMode === 'practice' ? 'text-blue-700' : 'text-gray-400'} />
                    <p className={`font-semibold text-sm mt-2 ${selectedMode === 'practice' ? 'text-blue-700' : 'text-gray-700'}`}>
                      Practice
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">No time limit, check answers anytime</p>
                  </button>
                  <button
                    onClick={() => setSelectedMode('exam')}
                    className={`p-4 rounded-xl border-2 text-left transition-all
                      ${selectedMode === 'exam' ? 'border-blue-700 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                  >
                    <Clock size={20} className={selectedMode === 'exam' ? 'text-blue-700' : 'text-gray-400'} />
                    <p className={`font-semibold text-sm mt-2 ${selectedMode === 'exam' ? 'text-blue-700' : 'text-gray-700'}`}>
                      Exam
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">60 min timer, submit for score</p>
                  </button>
                </div>
              </div>

              {/* Start button */}
              <button
                onClick={handleStart}
                className="w-full bg-blue-800 hover:bg-blue-900 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Start {selectedMode === 'exam' ? 'Exam' : 'Practice'}
              </button>
            </div>
          )}
        </div>

        {/* Feature hints */}
        <div className="grid grid-cols-3 gap-4 mt-10 max-w-lg w-full">
          {[
            { icon: FileText, label: 'PDF · DOCX · Image', desc: 'All formats supported' },
            { icon: BookOpen, label: 'All Question Types', desc: 'T/F/NG, MCQ, Fill blank' },
            { icon: Clock, label: 'Exam Mode', desc: '60-min timed practice' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="text-center">
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-white text-xs font-semibold">{label}</p>
              <p className="text-blue-300 text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
