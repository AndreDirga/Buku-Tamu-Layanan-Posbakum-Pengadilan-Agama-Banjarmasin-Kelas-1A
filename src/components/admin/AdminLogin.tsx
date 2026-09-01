import React, { useState } from 'react';
import { CourtEmblem } from '../common/CourtEmblem';
import { OfficerUser } from '../../types/posbakum';
import { INITIAL_OFFICER, logActivity, setAuthenticatedOfficer } from '../../services/storageService';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  LogIn, 
  AlertCircle, 
  ArrowLeft 
} from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: (officer: OfficerUser) => void;
  onBackToGuest: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToGuest,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      // Validate credentials
      const trimmedUser = username.trim().toLowerCase();
      if (
        (trimmedUser === 'posbakumbjm' && password === 'PosbakumBJM2026') ||
        (trimmedUser === 'admin.pabjm' && password === 'PosbakumBJM2026') ||
        (trimmedUser === 'admin' && password === 'PosbakumBJM2026')
      ) {
        const officer: OfficerUser = {
          ...INITIAL_OFFICER,
          username: 'posbakumbjm',
          name: 'Admin',
          role: 'Petugas Posbakum',
          lastLoginAt: new Date().toISOString(),
        };

        setAuthenticatedOfficer(officer);
        logActivity({
          userId: officer.id,
          userName: officer.name,
          userRole: officer.role,
          action: 'LOGIN',
          description: `Petugas ${officer.name} (${officer.username}) berhasil login ke sistem`,
          badgeColor: 'emerald',
        });

        onLoginSuccess(officer);
      } else {
        setError('Username atau password salah. Silakan periksa kembali.');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-3 font-sans text-xs">
      <div className="w-full max-w-sm space-y-3">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBackToGuest}
          className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white transition px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Menu Awal</span>
        </button>

        {/* Login Card - High Density */}
        <div className="bg-white rounded-2xl p-5 shadow-xl border border-slate-200 space-y-4 relative overflow-hidden">
          {/* Top Emblem & Header */}
          <div className="flex flex-col items-center text-center space-y-1.5 pb-2 border-b border-slate-100">
            <CourtEmblem size="lg" showText={false} className="justify-center" />
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mb-1">
                Portal Petugas Posbakum
              </div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                POS BANTUAN HUKUM (POSBAKUM)
              </h2>
              <p className="text-[11px] text-slate-500">
                Masuk untuk mengelola data kunjungan & laporan Posbakum
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-start gap-2 text-[11px] text-rose-800">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            {/* Username */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Username Petugas
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="posbakumbjm"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs font-medium transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-8 pr-8 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs font-medium transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {isLoading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>LOGIN PETUGAS</span>
                </>
              )}
            </button>
          </form>

          {/* Security Badges */}
          <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 pt-0.5">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Enkripsi Internal
            </span>
            <span>•</span>
            <span>Audit Log Aktif</span>
          </div>
        </div>
      </div>
    </div>
  );
};
