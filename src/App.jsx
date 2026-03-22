import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ExamProvider } from './context/ExamContext';
import Home from './pages/Home';
import Practice from './pages/Practice';
import Results from './pages/Results';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <ExamProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/results" element={<Results />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </ExamProvider>
    </BrowserRouter>
  );
}
