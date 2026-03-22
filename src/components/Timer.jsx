import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Timer({ durationMinutes = 60, onTimeUp, paused = false }) {
  const [secondsLeft, setSecondsLeft] = useState(durationMinutes * 60);

  useEffect(() => {
    if (paused) return;
    if (secondsLeft <= 0) {
      onTimeUp && onTimeUp();
      return;
    }
    const id = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft, paused, onTimeUp]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isWarning = secondsLeft <= 300; // last 5 min
  const isCritical = secondsLeft <= 60; // last 1 min

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-semibold text-base
      ${isCritical ? 'bg-red-100 text-red-700 timer-warning' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-800'}`}>
      <Clock size={16} />
      <span>{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</span>
    </div>
  );
}
