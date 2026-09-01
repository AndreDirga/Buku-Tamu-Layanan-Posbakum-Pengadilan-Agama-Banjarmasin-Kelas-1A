import React from 'react';
import { CourtEmblem } from '../common/CourtEmblem';
import { LiveClock } from '../common/LiveClock';
import { 
  Users, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  FileText, 
  Scale, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Info
} from 'lucide-react';

interface RoleSelectionPortalProps {
  onSelectGuest: () => void;
  onSelectOfficer: () => void;
}

export const RoleSelectionPortal: React.FC<RoleSelectionPortalProps> = ({
  onSelectGuest,
  onSelectOfficer,
}) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-6 px-3 sm:px-6 font-sans text-xs">
      {/* Top Container */}
      <div className="max-w-3xl w-full mx-auto space-y-4">
        {/* Main Institutional Header Card */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 text-center space-y-3">
          <div className="flex flex-col items-center space-y-2">
            <CourtEmblem size="xl" showText={false} className="justify-center" />
            
            <div className="pt-1">
              <div className="text-[10px] sm:text-[11px] font-bold tracking-widest text-emerald-800 uppercase mb-0.5">
                MAHKAMAH AGUNG REPUBLIK INDONESIA
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                PENGADILAN AGAMA BANJARMASIN KELAS 1A
              </h2>
              <div className="inline-block px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-200 my-1">
                POS BANTUAN HUKUM (POSBAKUM)
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                SISTEM BUKU TAMU DIGITAL
              </h1>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-0.5">
                Silakan pilih peran Anda untuk melanjutkan ke layanan sistem buku tamu & pendaftaran perkara.
              </p>
            </div>

            <div className="w-full max-w-sm pt-1">
              <LiveClock variant="card" />
            </div>
          </div>
        </div>

        {/* Role Selection Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* 1. Tamu / Pengunjung Card */}
          <div 
            onClick={onSelectGuest}
            className="group bg-white rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md border-2 border-transparent hover:border-emerald-500 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-xl pointer-events-none group-hover:bg-emerald-100 transition" />

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Akses Langsung
                </span>
              </div>

              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-emerald-800 transition flex items-center gap-1.5">
                  <span>Tamu / Pengunjung</span>
                </h2>
                <div className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                  Masyarakat Pencari Keadilan
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Pengisian buku tamu mandiri untuk layanan konsultasi hukum gratis, pembuatan dokumen gugatan, permohonan, atau informasi perkara Posbakum.
                </p>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-100 text-[10px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Tanpa Perlu Login Akun</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Dilengkapi Foto Selfie & Tanda Tangan</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Bukti Slip Nomor Kunjungan Digital</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onSelectGuest}
              className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition mt-2"
            >
              <span>MASUK SEBAGAI TAMU</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* 2. Petugas / Administrator Card */}
          <div 
            onClick={onSelectOfficer}
            className="group bg-white rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md border-2 border-transparent hover:border-slate-800 cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-full blur-xl pointer-events-none group-hover:bg-slate-200 transition" />

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 text-slate-600" />
                  Perlu Login Petugas
                </span>
              </div>

              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-slate-800 transition flex items-center gap-1.5">
                  <span>Petugas / Admin</span>
                </h2>
                <div className="text-[11px] font-semibold text-slate-700 mt-0.5">
                  Aparatur & Petugas Posbakum
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Akses khusus petugas Posbakum dan staf Pengadilan untuk memproses data buku tamu, update status layanan, rekap laporan Excel/PDF, dan QR Code.
                </p>
              </div>

              <div className="space-y-1 pt-1 border-t border-slate-100 text-[10px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span>Autentikasi Username & Password</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span>Dashboard Statistik & Rekapitulasi</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                  <span>Cetak Laporan & Ekspor Berkas</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onSelectOfficer}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-1.5 transition mt-2"
            >
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>LOGIN PETUGAS</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Operational Notice Banner */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-slate-700">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-emerald-950 text-[11px]">
              Informasi Layanan Pos Bantuan Hukum (POSBAKUM)
            </div>
            <div className="text-[10px] text-slate-600 leading-relaxed">
              Layanan Pos Bantuan Hukum di Pengadilan Agama Banjarmasin diberikan secara <strong>Cuma-cuma (Gratis / Rp 0,-)</strong> bagi masyarakat tidak mampu sesuai Perma No. 1 Tahun 2014. Jam layanan operasional: Senin – Kamis: 08.00 – 16.30 WITA, Jumat: 08.00 – 17.00 WITA.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto border-t border-slate-200 pt-4 mt-6 text-center text-[11px] text-slate-500 space-y-0.5">
        <div className="font-bold text-slate-700">
          PENGADILAN AGAMA BANJARMASIN KELAS 1A
        </div>
        <div className="text-[10px] text-slate-400">
          Jl. Gatot Subroto No. 8, Banjarmasin 70235, Kalimantan Selatan
        </div>
      </footer>
    </div>
  );
};
