import React, { useState } from 'react';
import { Visit } from '../../types/posbakum';
import { CourtEmblem } from '../common/CourtEmblem';
import { updateVisitStatus, logActivity, deleteVisit } from '../../services/storageService';
import { 
  X, 
  Printer, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  Briefcase, 
  Scale, 
  CheckCircle2, 
  Clock3, 
  CheckCheck, 
  Maximize2, 
  FileText, 
  Share2, 
  Save,
  MessageSquare,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface VisitDetailModalProps {
  visit: Visit;
  onClose: () => void;
  onVisitUpdated: (updated: Visit) => void;
  onDeleteVisit?: (visitId: string) => void;
}

export const VisitDetailModal: React.FC<VisitDetailModalProps> = ({
  visit,
  onClose,
  onVisitUpdated,
  onDeleteVisit,
}) => {
  const [status, setStatus] = useState<Visit['status']>(visit.status);
  const [notes, setNotes] = useState(visit.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveStatus = async () => {
    setIsSaving(true);
    try {
      const updated = await updateVisitStatus(visit.id, status, notes, 'Admin');
      if (updated) {
        onVisitUpdated(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (onDeleteVisit) {
      onDeleteVisit(visit.id);
    } else {
      await deleteVisit(visit.id, 'Admin');
    }
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-xs font-sans">
      {/* Zoom Modal for Photo */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-md max-h-[80vh] overflow-hidden rounded-xl border border-white/20">
            <img src={zoomedImage} alt="Zoomed" className="w-full h-full object-contain" />
          </div>
          <p className="text-white text-[11px] mt-2 font-medium">Klik di mana saja untuk menutup</p>
        </div>
      )}

      {/* Main Modal Box - High Density */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                Detail Buku Tamu Posbakum
              </div>
              <h3 className="text-sm font-black text-slate-900 font-mono">
                {visit.visitNumber}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition"
              title="Cetak Lembar Kunjungan"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-3.5">
          {/* Quick Status Bar */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>{visit.dateDisplay}</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{visit.timeDisplay}</span>
              </div>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-700">Status:</span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Visit['status'])}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition ${
                  status === 'Selesai'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : status === 'Sedang Dilayani'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                <option value="Menunggu">Menunggu</option>
                <option value="Sedang Dilayani">Sedang Dilayani</option>
                <option value="Selesai">Selesai</option>
              </select>
            </div>
          </div>

          {/* Grid Layout: Identity & Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Column 1: Identity & Address */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 border-b border-slate-100 pb-1">
                <User className="w-3 h-3 text-emerald-600" />
                Identitas Penggugat / Pemohon
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Nama Penggugat / Pemohon</div>
                  <div className="font-bold text-slate-900 text-sm">{visit.name}</div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Nomor WhatsApp</div>
                  <div className="font-mono font-bold text-emerald-800 flex items-center gap-1 text-[11px]">
                    <Phone className="w-3 h-3" />
                    {visit.whatsapp}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Email</div>
                  <div className="text-slate-700 flex items-center gap-1 text-[11px]">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {visit.email}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Pekerjaan</div>
                  <div className="font-medium text-slate-800 flex items-center gap-1 text-[11px]">
                    <Briefcase className="w-3 h-3 text-slate-400" />
                    {visit.occupation} {visit.occupationOther ? `(${visit.occupationOther})` : ''}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Alamat KTP</div>
                  <div className="text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] leading-relaxed">
                    {visit.ktpAddress}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Alamat Domisili</div>
                  <div className="text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] leading-relaxed">
                    {visit.domicileAddress}
                    {visit.domicileSameAsKtp && (
                      <span className="block text-[9px] text-emerald-700 font-semibold mt-0.5">
                        ✓ Sesuai KTP
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Perkara & Media (Selfie + Signature) */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 border-b border-slate-100 pb-1">
                <Scale className="w-3 h-3 text-emerald-600" />
                Perkara & Berkas Digital
              </h4>

              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-1 text-xs">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Kategori</span>
                  <span className="font-semibold text-slate-800 text-[11px]">{visit.caseCategory}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Jenis Perkara</span>
                  <span className="font-black text-xs text-emerald-900">
                    {visit.caseType} {visit.caseTypeOther ? `(${visit.caseTypeOther})` : ''}
                  </span>
                </div>
              </div>

              {/* Photos Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Selfie */}
                <div className="bg-slate-50 rounded-xl p-2 border border-slate-200 space-y-1 text-center">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                    <span>Foto Selfie</span>
                    <button
                      type="button"
                      onClick={() => setZoomedImage(visit.selfieUrl)}
                      className="text-slate-400 hover:text-slate-700"
                      title="Perbesar"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div 
                    onClick={() => setZoomedImage(visit.selfieUrl)}
                    className="relative w-full aspect-square rounded-lg overflow-hidden bg-slate-900 border border-slate-300 cursor-pointer group"
                  >
                    <img
                      src={visit.selfieUrl}
                      alt="Selfie"
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 truncate">
                    {visit.selfieFileName}
                  </div>
                </div>

                {/* Signature */}
                <div className="bg-slate-50 rounded-xl p-2 border border-slate-200 space-y-1 text-center">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                    <span>Tanda Tangan</span>
                    <button
                      type="button"
                      onClick={() => setZoomedImage(visit.signatureUrl)}
                      className="text-slate-400 hover:text-slate-700"
                      title="Perbesar"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div 
                    onClick={() => setZoomedImage(visit.signatureUrl)}
                    className="relative w-full aspect-square rounded-lg overflow-hidden bg-white border border-slate-300 flex items-center justify-center p-1.5 cursor-pointer group"
                  >
                    <img
                      src={visit.signatureUrl}
                      alt="Tanda Tangan"
                      className="w-full h-full object-contain group-hover:scale-105 transition"
                    />
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 truncate">
                    {visit.signatureFileName}
                  </div>
                </div>
              </div>

              {/* Officer Notes Area */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-700 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                  Catatan Tindak Lanjut Petugas
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Draf gugatan telah diserahkan..."
                  className="w-full p-2 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-800 text-[11px] transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Slip Cetak</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-900 rounded-lg text-xs font-bold flex items-center gap-1 transition"
              title="Hapus data riwayat kunjungan ini"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Data</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-800 rounded-lg text-xs font-medium"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleSaveStatus}
              disabled={isSaving}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
            >
              {saveSuccess ? (
                <>
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Tersimpan!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 text-xs font-sans animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-950">
                  Hapus Data Kunjungan?
                </h3>
                <p className="text-[11px] text-rose-800/80 mt-0.5">
                  Nomor: <span className="font-mono font-bold">{visit.visitNumber}</span>
                </p>
              </div>
            </div>

            <div className="p-4 space-y-2 text-slate-600">
              <p className="text-[11px] leading-relaxed">
                Apakah Anda yakin ingin menghapus data atas nama <strong className="text-slate-900">{visit.name}</strong> ({visit.caseType})?
              </p>
              <p className="text-[10px] text-slate-400">
                Data yang dihapus tidak dapat dipulihkan.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
