import React, { useState } from 'react';
import { CASE_CATEGORIES } from '../../types/posbakum';
import { 
  clearAllVisits, 
  clearVisitsByPeriod, 
  clearVisitsByCase, 
  logActivity 
} from '../../services/storageService';
import { 
  RotateCcw, 
  AlertTriangle, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Scale,
  Clock,
  Sparkles
} from 'lucide-react';

interface ResetStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  totalVisitsCount: number;
  officerName?: string;
}

export const ResetStatsModal: React.FC<ResetStatsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  totalVisitsCount,
  officerName = 'Admin',
}) => {
  const [resetType, setResetType] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'case'>('all');
  const [selectedCaseCategory, setSelectedCaseCategory] = useState(CASE_CATEGORIES[0].name);
  const [selectedMonth, setSelectedMonth] = useState('08');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExecuteReset = async () => {
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      if (resetType === 'all') {
        const count = await clearAllVisits(officerName);
        setSuccessMessage(`Berhasil menghapus semua data kunjungan. ${count} data telah dikosongkan secara permanen (Total Kunjungan & Seluruh Statistik = 0, tanpa data template).`);
      } else if (resetType === 'today') {
        const count = await clearVisitsByPeriod('today', undefined, officerName);
        setSuccessMessage(`Statistik Hari Ini berhasil direset (${count} kunjungan hari ini dihapus permanen).`);
      } else if (resetType === 'week') {
        const count = await clearVisitsByPeriod('week', undefined, officerName);
        setSuccessMessage(`Statistik Mingguan (7 hari terakhir) berhasil direset (${count} kunjungan dihapus permanen).`);
      } else if (resetType === 'month') {
        const monthStr = `${selectedYear}-${selectedMonth}`;
        const count = await clearVisitsByPeriod('month', monthStr, officerName);
        setSuccessMessage(`Statistik Bulan ${selectedMonth}/${selectedYear} berhasil direset (${count} kunjungan dihapus permanen).`);
      } else if (resetType === 'year') {
        const count = await clearVisitsByPeriod('year', selectedYear, officerName);
        setSuccessMessage(`Statistik Tahun ${selectedYear} berhasil direset (${count} kunjungan dihapus permanen).`);
      } else if (resetType === 'case') {
        const count = await clearVisitsByCase(selectedCaseCategory, officerName);
        setSuccessMessage(`Statistik kategori perkara "${selectedCaseCategory}" berhasil direset (${count} kunjungan dihapus permanen).`);
      }

      onSuccess();
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
        setSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-100">
                RESET MANUAL STATISTIK & DATA KUNJUNGAN
              </h3>
              <p className="text-[10px] text-slate-400">
                POS BANTUAN HUKUM (POSBAKUM) • Otoritas Petugas / Admin
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {successMessage ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-xs">Reset Berhasil Dieksekusi</div>
                <div className="text-[11px] mt-0.5">{successMessage}</div>
              </div>
            </div>
          ) : (
            <>
              {/* Alert Warning */}
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <span className="font-bold">Perhatian:</span> Tindakan reset ini akan menghapus data kunjungan terkait secara permanen dari basis data Cloud Firestore dan memperbarui grafik analitik secara real-time.
                </div>
              </div>

              {/* Current Status */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-medium text-slate-600">Total Kunjungan Saat Ini:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {totalVisitsCount} data kunjungan
                </span>
              </div>

              {/* Options */}
              <div className="space-y-2">
                <label className="font-bold text-slate-800 block text-xs">
                  Pilih Lingkup Reset:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option 1: All */}
                  <button
                    type="button"
                    onClick={() => setResetType('all')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      resetType === 'all'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-950 ring-1 ring-rose-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Semua (Mulai dari 0)</span>
                      </span>
                      {resetType === 'all' && <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Kosongkan total & seluruh grafik statistik
                    </span>
                  </button>

                  {/* Option 2: Today */}
                  <button
                    type="button"
                    onClick={() => setResetType('today')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      resetType === 'today'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Periode Hari Ini</span>
                      </span>
                      {resetType === 'today' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Reset hitungan & kunjungan hari ini
                    </span>
                  </button>

                  {/* Option 3: Weekly */}
                  <button
                    type="button"
                    onClick={() => setResetType('week')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      resetType === 'week'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Periode Mingguan</span>
                      </span>
                      {resetType === 'week' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Reset tren 7 hari pekan berjalan
                    </span>
                  </button>

                  {/* Option 4: Monthly */}
                  <button
                    type="button"
                    onClick={() => setResetType('month')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      resetType === 'month'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Periode Bulanan</span>
                      </span>
                      {resetType === 'month' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Reset data bulan tertentu
                    </span>
                  </button>

                  {/* Option 5: Yearly */}
                  <button
                    type="button"
                    onClick={() => setResetType('year')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      resetType === 'year'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Periode Tahunan</span>
                      </span>
                      {resetType === 'year' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Reset data tahun buku tertentu
                    </span>
                  </button>

                  {/* Option 6: Case Type */}
                  <button
                    type="button"
                    onClick={() => setResetType('case')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      resetType === 'case'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-400'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Menurut Jenis Perkara</span>
                      </span>
                      {resetType === 'case' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Hapus data kategori perkara khusus
                    </span>
                  </button>
                </div>
              </div>

              {/* Sub-parameters based on selection */}
              {resetType === 'month' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <span className="font-bold text-slate-700">Pilih Bulan & Tahun:</span>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value="08">Agustus (08)</option>
                    <option value="07">Juli (07)</option>
                    <option value="06">Juni (06)</option>
                    <option value="05">Mei (05)</option>
                    <option value="04">April (04)</option>
                    <option value="03">Maret (03)</option>
                    <option value="02">Februari (02)</option>
                    <option value="01">Januari (01)</option>
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
              )}

              {resetType === 'year' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                  <span className="font-bold text-slate-700">Pilih Tahun:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
              )}

              {resetType === 'case' && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-700 block">Pilih Kategori Perkara:</span>
                  <select
                    value={selectedCaseCategory}
                    onChange={(e) => setSelectedCaseCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    {CASE_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecuteReset}
            disabled={isProcessing}
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-xs transition ${
              resetType === 'all'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses Reset...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Konfirmasi Reset Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
