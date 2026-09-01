import React, { useState } from 'react';
import { Visit } from '../../types/posbakum';
import { CourtEmblem } from '../common/CourtEmblem';
import { 
  CheckCircle, 
  Printer, 
  RotateCcw, 
  Share2, 
  Calendar, 
  Clock, 
  Check, 
  ShieldCheck,
  Home 
} from 'lucide-react';

interface SuccessReceiptProps {
  visit: Visit;
  onReset: () => void;
  onBackToPortal?: () => void;
}

export const SuccessReceipt: React.FC<SuccessReceiptProps> = ({
  visit,
  onReset,
  onBackToPortal,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(visit.visitNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-4 flex flex-col items-center justify-center font-sans text-xs">
      <div className="w-full max-w-md space-y-3">
        {/* Printable Card Container */}
        <div 
          id="printable-slip"
          className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 text-center space-y-3 relative overflow-hidden"
        >
          {/* Court Header */}
          <div className="flex flex-col items-center border-b border-slate-100 pb-3">
            <CourtEmblem size="sm" showSubtitle={true} className="justify-center text-center" />
          </div>

          {/* Success Check Badge */}
          <div className="flex flex-col items-center space-y-1">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center ring-4 ring-emerald-50">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase">
              DATA BERHASIL DISIMPAN
            </h2>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Terima kasih telah mengisi Buku Tamu Pos Bantuan Hukum (POSBAKUM).
            </p>
          </div>

          {/* Highlighted Visit Number Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-2xs relative">
            <div className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
              NOMOR KUNJUNGAN ANDA
            </div>
            
            <div className="my-0.5 text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900">
              {visit.visitNumber}
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {visit.dateDisplay}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {visit.timeDisplay}
              </span>
            </div>

            {/* Quick Copy Number button */}
            <button
              type="button"
              onClick={handleCopyNumber}
              className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-800 shadow-2xs transition"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  Nomor Tersalin!
                </>
              ) : (
                <>
                  <Share2 className="w-3 h-3 text-slate-500" />
                  Salin Nomor Kunjungan
                </>
              )}
            </button>
          </div>

          {/* Visitor Brief Dossier */}
          <div className="bg-slate-50 rounded-xl p-3 text-left border border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Nama Penggugat / Pemohon / Tergugat / Termohon</span>
              <span className="font-bold text-slate-900 text-right">{visit.name}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Jenis Perkara</span>
              <span className="font-bold text-emerald-800 text-right">
                {visit.caseType} {visit.caseTypeOther ? `(${visit.caseTypeOther})` : ''}
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Kategori</span>
              <span className="font-semibold text-slate-700 text-right">{visit.caseCategory}</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Nomor WhatsApp</span>
              <span className="font-mono font-bold text-slate-800 text-right">{visit.whatsapp}</span>
            </div>

            {/* Selfie & Signature Verification Mini Thumbnails */}
            <div className="grid grid-cols-2 gap-2 pt-1.5">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] font-semibold text-slate-500 mb-0.5">Foto Selfie</div>
                <div className="w-12 h-12 mx-auto rounded overflow-hidden border border-slate-100 bg-slate-100">
                  <img src={visit.selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                <div className="text-[10px] font-semibold text-slate-500 mb-0.5">Tanda Tangan</div>
                <div className="w-12 h-12 mx-auto rounded overflow-hidden border border-slate-100 bg-white flex items-center justify-center">
                  <img src={visit.signatureUrl} alt="Tanda Tangan" className="w-full h-full object-contain p-0.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>CETAK / SIMPAN BUKTI</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ISI BUKU TAMU BARU</span>
            </button>

            {onBackToPortal && (
              <button
                type="button"
                onClick={onBackToPortal}
                className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-1.5 transition"
              >
                <Home className="w-3.5 h-3.5 text-slate-500" />
                <span>KEMBALI KE MENU AWAL</span>
              </button>
            )}
          </div>

          {/* Instructions for Applicant */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-900 text-left text-[11px] space-y-0.5">
            <div className="font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Petunjuk Pengunjung:
            </div>
            <p className="text-[10px] text-amber-800 leading-normal">
              Tunjukkan Nomor Kunjungan ini kepada Petugas Posbakum atau ambil nomor antrian layanan di loket PTSP Pengadilan Agama Banjarmasin Kelas 1A.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
