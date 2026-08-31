import React, { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';

interface LiveClockProps {
  variant?: 'badge' | 'card' | 'inline';
}

export const LiveClock: React.FC<LiveClockProps> = ({ variant = 'badge' }) => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayName = dayNames[time.getDay()];
  const monthName = monthNames[time.getMonth()];
  const dateFormatted = `${dayName}, ${time.getDate()} ${monthName} ${time.getFullYear()}`;
  
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  const timeFormatted = `${hours}:${minutes}:${seconds} WITA`;

  if (variant === 'card') {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-emerald-800/80 uppercase tracking-wide">
              Tanggal Kunjungan
            </div>
            <div className="text-sm font-bold text-slate-800">{dateFormatted}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs">
          <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span className="font-mono text-xs font-bold text-emerald-900">{timeFormatted}</span>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
        <span className="flex items-center gap-1 font-semibold text-emerald-800">
          <Calendar className="w-3.5 h-3.5" />
          {dateFormatted}
        </span>
        <span className="text-slate-300">•</span>
        <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          {timeFormatted}
        </span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-100/70 border border-emerald-200/90 text-emerald-900 text-xs font-medium">
      <span className="flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5 text-emerald-700" />
        {dateFormatted}
      </span>
      <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
      <span className="flex items-center gap-1 font-mono font-bold text-emerald-800">
        <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
        {timeFormatted}
      </span>
    </div>
  );
};
