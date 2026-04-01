import { useState, useEffect } from 'react';

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function Timer({ duration, running, onTimeout }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration, running]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [running]);

  const fraction = timeLeft / duration;
  const offset = CIRCUMFERENCE * (1 - fraction);
  const color = timeLeft <= 3 ? 'var(--color-wrong)' : 'var(--color-primary)';

  const isWarning = running && timeLeft <= 3 && timeLeft > 0;

  return (
    <div className={isWarning ? 'pulse-warning' : ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={RADIUS}
          fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }}
        />
        <text x="40" y="45" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>
          {Math.ceil(timeLeft)}
        </text>
      </svg>
    </div>
  );
}
