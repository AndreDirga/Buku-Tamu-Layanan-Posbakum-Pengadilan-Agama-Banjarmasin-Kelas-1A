import React, { useState, useEffect, useRef } from 'react';
import { Visit } from '../../types/posbakum';
import { 
  Bell, 
  CheckCircle2, 
  User, 
  MapPin, 
  Scale, 
  Clock, 
  Phone, 
  ExternalLink, 
  X, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { 
  playNotificationChime, 
  getNotificationSoundEnabled, 
  setNotificationSoundEnabled 
} from '../../services/notificationService';

interface NewVisitNotificationPopupProps {
  currentNotification: Visit | null;
  queueCount: number;
  onDismiss: () => void;
  onViewDetail: (visit: Visit) => void;
  onNavigateToVisits?: () => void;
}

export const NewVisitNotificationPopup: React.FC<NewVisitNotificationPopupProps> = ({
  currentNotification,
  queueCount,
  onDismiss,
  onViewDetail,
  onNavigateToVisits,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(getNotificationSoundEnabled());
  const [progressPercent, setProgressPercent] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  const AUTO_DISMISS_SECONDS = 12;

  // Sound and countdown timer whenever currentNotification changes
  useEffect(() => {
    if (!currentNotification) {
      setProgressPercent(100);
      return;
    }

    // Play chime when notification arrives
    playNotificationChime();

    // Reset progress
    setProgressPercent(100);
    const startTime = Date.now();
    const durationMs = AUTO_DISMISS_SECONDS * 1000;

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);

    progressIntervalRef.current = setInterval(() => {
      if (!isHovered) {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
        setProgressPercent(remaining);
        if (remaining <= 0) {
          clearInterval(progressIntervalRef.current);
          onDismiss();
        }
      }
    }, 100);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentNotification, isHovered, onDismiss]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setNotificationSoundEnabled(next);
    if (next) {
      playNotificationChime();
    }
  };

  if (!currentNotification) return null;

  return (
    <div 
      className="fixed top-16 right-3 sm:right-6 z-50 max-w-[420px] w-[calc(100vw-24px)] pointer-events-auto select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 overflow-hidden ring-4 ring-emerald-500/20 transform transition-all duration-300 animate-in fade-in slide-in-from-top-4">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
            </span>
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Bell className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              <span>PEMBERITAHUAN TAMU BARU</span>
            </div>
            {queueCount > 1 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-400/40 text-[10px] font-mono font-bold text-emerald-200">
                +{queueCount - 1} antrean
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-600/50 transition"
              title={soundEnabled ? 'Suara notifikasi aktif (klik untuk membisukan)' : 'Suara notifikasi senyap (klik untuk mengaktifkan)'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-300" />}
            </button>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-600/50 transition ml-1"
              title="Tutup Notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar (Auto-Dismiss indicator) */}
        <div className="h-1 w-full bg-slate-100">
          <div 
            className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Card Body */}
        <div className="p-3.5 sm:p-4 space-y-3">
          {/* Main Visitor Profile Row */}
          <div className="flex items-start gap-3">
            {/* Selfie / Avatar */}
            <div className="shrink-0">
              {currentNotification.selfieUrl ? (
                <div className="relative">
                  <img
                    src={currentNotification.selfieUrl}
                    alt={currentNotification.name}
                    referrerPolicy="no-referrer"
                    className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl object-cover border-2 border-emerald-600 shadow-sm"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : (
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl bg-emerald-100 text-emerald-800 border-2 border-emerald-300 flex items-center justify-center font-bold text-base shadow-xs">
                  {currentNotification.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Visitor Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {currentNotification.visitNumber}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{currentNotification.timeDisplay || 'Baru Saja'}</span>
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-900 truncate mt-1">
                {currentNotification.name}
              </h4>

              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium mt-0.5">
                <Scale className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">
                  {currentNotification.caseCategory} • <strong className="text-slate-900">{currentNotification.caseType}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 text-[11px] space-y-1 text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {currentNotification.domicileAddress || currentNotification.ktpAddress || 'Alamat tercatat di berkas'}
              </span>
            </div>
            {currentNotification.whatsapp && (
              <div className="flex items-center gap-1.5 truncate">
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="font-mono font-medium text-slate-800">
                  {currentNotification.whatsapp}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold pt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Data telah berhasil terekam di database admin POSBAKUM</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onViewDetail(currentNotification);
                onDismiss();
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Buka Detail Lengkap</span>
            </button>

            {onNavigateToVisits && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToVisits();
                  onDismiss();
                }}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Daftar Kunjungan
              </button>
            )}

            <button
              type="button"
              onClick={onDismiss}
              className="px-2.5 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition text-xs font-semibold"
              title="Tutup notifikasi"
            >
              Tutup
            </button>
          </div>
        </div>

        {/* Hover Pause Hint */}
        <div className="bg-slate-50 border-t border-slate-100 px-3 py-1 text-[10px] text-slate-400 text-center">
          {isHovered ? 'Timer ditahan (sedang disorot)' : 'Akan tertutup otomatis dalam beberapa detik'}
        </div>
      </div>
    </div>
  );
};
