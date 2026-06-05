'use client';

import { useEffect, useState } from 'react';

function getTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

export default function Countdown({ date }: { date: string }) {
  const [time, setTime] = useState<ReturnType<typeof getTimeLeft> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTime(getTimeLeft(new Date(date)));
    const timer = setInterval(() => setTime(getTimeLeft(new Date(date))), 1000);
    return () => clearInterval(timer);
  }, [date]);

  const units = [
    { label: 'Days', value: time?.days },
    { label: 'Hours', value: time?.hours },
    { label: 'Minutes', value: time?.minutes },
    { label: 'Seconds', value: time?.seconds },
  ];

  return (
    <div className="flex gap-4 justify-center flex-wrap">
      {units.map(({ label, value }) => (
        <div key={label} className="text-center min-w-[64px]">
          <div className="text-3xl md:text-4xl font-serif text-[var(--accent)]">
            {time == null ? '--' : String(value).padStart(2, '0')}
          </div>
          <div className="text-xs text-[var(--muted)] uppercase tracking-widest mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}
