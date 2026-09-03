import React, { useState, useMemo } from 'react';
import { Visit, CASE_CATEGORIES } from '../../types/posbakum';
import { logActivity } from '../../services/storageService';
import { GoogleSheetsSync } from './GoogleSheetsSync';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

interface ExportDataViewProps {
  visits: Visit[];
}

export const ExportDataView: React.FC<ExportDataViewProps> = ({ visits }) => {
  // Default to empty strings so all visits are included by default without date restrictions
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCaseType, setSelectedCaseType] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [activeExportTab, setActiveExportTab] = useState<'sheets' | 'csv'>('sheets');

  // Helper date presets
  const handleSetPreset = (type: 'all' | 'today' | 'this_month' | 'this_year') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    if (type === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'this_month') {
      const firstDay = `${y}-${m}-01`;
      const lastDayNum = new Date(y, now.getMonth() + 1, 0).getDate();
      const lastDay = `${y}-${m}-${String(lastDayNum).padStart(2, '0')}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (type === 'this_year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    }
  };

  // Flatten case types
  const allCaseTypes = useMemo(() => {
    const list: string[] = [];
    CASE_CATEGORIES.forEach((cat) => {
      cat.types.forEach((t) => {
        if (!list.includes(t)) list.push(t);
      });
    });
    return list;
  }, []);

  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (selectedCaseType !== 'ALL' && v.caseType !== selectedCaseType) {
        return false;
      }
      if (startDate) {
        const visitDate = v.visitedAt.substring(0, 10);
        if (visitDate < startDate) return false;
      }
      if (endDate) {
        const visitDate = v.visitedAt.substring(0, 10);
        if (visitDate > endDate) return false;
      }
      return true;
    });
  }, [visits, startDate, endDate, selectedCaseType]);

  const generateAndDownloadCsv = () => {
    setIsExporting(true);

    const headers = [
      'Nomor Kunjungan',
      'Tanggal',
      'Waktu',
      'Nama Penggugat / Pemohon / Tergugat / Termohon',
      'Alamat KTP',
      'Alamat Domisili',
      'Email',
      'WhatsApp',
      'Pekerjaan',
      'Kategori Perkara',
      'Jenis Perkara',
      'Status Layanan',
      'Petugas',
      'Nama File Selfie',
      'Nama File Tanda Tangan',
    ];

    const escapeCsv = (str: string | undefined | null) => {
      if (!str) return '""';
      const cleanStr = String(str).replace(/"/g, '""');
      return `"${cleanStr}"`;
    };

    const targetList = filteredVisits.length > 0 ? filteredVisits : visits;

    const rows = targetList.map((v) => [
      escapeCsv(v.visitNumber),
      escapeCsv(v.dateDisplay),
      escapeCsv(v.timeDisplay),
      escapeCsv(v.name),
      escapeCsv(v.ktpAddress),
      escapeCsv(v.domicileAddress),
      escapeCsv(v.email),
      escapeCsv(v.whatsapp),
      escapeCsv(v.occupation + (v.occupationOther ? ` (${v.occupationOther})` : '')),
      escapeCsv(v.caseCategory),
      escapeCsv(v.caseType + (v.caseTypeOther ? ` (${v.caseTypeOther})` : '')),
      escapeCsv(v.status),
      escapeCsv(v.officerName || 'Admin'),
      escapeCsv(v.selfieFileName || `${v.visitNumber}-selfie.jpg`),
      escapeCsv(v.signatureFileName || `${v.visitNumber}-signature.png`),
    ]);

    const csvContent = [
      '\uFEFF' + headers.join(','), // UTF-8 BOM for Excel compatibility
      ...rows.map((r) => r.join(',')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const timestamp = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Buku_Tamu_Posbakum_${timestamp}.csv`);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    }, 60000);

    // Audit log
    logActivity({
      userId: 'officer',
      userName: 'Petugas Posbakum',
      userRole: 'Petugas',
      action: 'EXPORT_CSV',
      description: `Mengekspor ${targetList.length} data kunjungan ke format CSV`,
      badgeColor: 'purple',
    });

    setIsExporting(false);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Title - High Density */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <span>EXPORT & SINKRONISASI BUKU TAMU</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Ekspor rekapitulasi data buku tamu Posbakum ke Google Sheets langsung atau unduh berkas CSV.
          </p>
        </div>

        {/* Export Target Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveExportTab('sheets')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeExportTab === 'sheets'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Sheets (Cloud)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveExportTab('csv')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              activeExportTab === 'csv'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Berkas CSV (.csv)</span>
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-3">
        {/* Preset filter chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            <span>Filter Cepat:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSetPreset('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                startDate === '' && endDate === ''
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Data ({visits.length})
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('today')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('this_month')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset('this_year')}
              className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
            >
              Tahun Ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Dari Tanggal */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>Dari Tanggal:</span>
              {startDate && (
                <button
                  type="button"
                  onClick={() => setStartDate('')}
                  className="text-[10px] text-rose-600 hover:underline font-normal"
                >
                  Hapus
                </button>
              )}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-800"
            />
          </div>

          {/* Sampai Tanggal */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>Sampai Tanggal:</span>
              {endDate && (
                <button
                  type="button"
                  onClick={() => setEndDate('')}
                  className="text-[10px] text-rose-600 hover:underline font-normal"
                >
                  Hapus
                </button>
              )}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-800"
            />
          </div>

          {/* Jenis Perkara */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700">
              Jenis Perkara:
            </label>
            <select
              value={selectedCaseType}
              onChange={(e) => setSelectedCaseType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-800 bg-white"
            >
              <option value="ALL">-- Semua Jenis Perkara --</option>
              {allCaseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-slate-100 text-[11px] gap-2">
          <div className="font-medium text-slate-600 flex items-center gap-1.5">
            <span>
              Ditemukan <span className="font-bold text-emerald-800 font-mono">{filteredVisits.length}</span> dari{' '}
              <span className="font-bold text-slate-700 font-mono">{visits.length}</span> total kunjungan.
            </span>
            {filteredVisits.length === 0 && visits.length > 0 && (
              <button
                type="button"
                onClick={() => handleSetPreset('all')}
                className="text-emerald-700 font-bold underline hover:text-emerald-900 ml-1"
              >
                Reset Filter (Gunakan Semua {visits.length} Data)
              </button>
            )}
          </div>

          {activeExportTab === 'csv' && (
            <button
              type="button"
              onClick={generateAndDownloadCsv}
              disabled={isExporting}
              className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {exportSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>File CSV Berhasil Diunduh!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>UNDUH CSV SEKARANG</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Conditional Google Sheets Integration Panel */}
      {activeExportTab === 'sheets' && (
        <GoogleSheetsSync
          filteredVisits={filteredVisits}
          allVisits={visits}
          allVisitsCount={visits.length}
          onResetFilter={() => handleSetPreset('all')}
        />
      )}

      {/* Security & Standard Note */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 text-emerald-950 text-xs leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold text-[11px]">Standar Keamanan Berkas:</div>
          <p className="text-emerald-900/80 text-[11px]">
            Untuk menjaga privasi dan performa lembar kerja, berkas foto selfie dan tanda tangan direferensikan melalui penamaan file unik terenkripsi internal (contoh: <code className="bg-emerald-100 px-1 py-0.5 rounded text-emerald-950 font-mono text-[10px]">KJG-20260831-0001-selfie.jpg</code>) yang dapat diverifikasi melalui dashboard audit petugas.
          </p>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-2.5">
        <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
          Pratinjau Data yang Akan Diekspor ({filteredVisits.length} Record)
        </h3>

        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase sticky top-0 border-b border-slate-200">
              <tr>
                <th className="px-2.5 py-1.5">No. Antrian</th>
                <th className="px-2.5 py-1.5">Tanggal</th>
                <th className="px-2.5 py-1.5">Nama</th>
                <th className="px-2.5 py-1.5">WhatsApp</th>
                <th className="px-2.5 py-1.5">Jenis Perkara</th>
                <th className="px-2.5 py-1.5">Status</th>
                <th className="px-2.5 py-1.5">File Selfie</th>
                <th className="px-2.5 py-1.5">File Tanda Tangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-400 text-xs">
                    Tidak ada data kunjungan pada filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-2.5 py-1.5 font-mono font-bold text-slate-900">{v.visitNumber}</td>
                    <td className="px-2.5 py-1.5 text-slate-600 font-mono text-[11px]">{v.dateDisplay}</td>
                    <td className="px-2.5 py-1.5 font-semibold text-slate-800">{v.name}</td>
                    <td className="px-2.5 py-1.5 font-mono text-emerald-800 text-[11px]">{v.whatsapp}</td>
                    <td className="px-2.5 py-1.5 text-slate-700">{v.caseType}</td>
                    <td className="px-2.5 py-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        v.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                        v.status === 'Sedang Dilayani' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-slate-400 text-[10px]">{v.selfieFileName || `${v.visitNumber}-selfie.jpg`}</td>
                    <td className="px-2.5 py-1.5 font-mono text-slate-400 text-[10px]">{v.signatureFileName || `${v.visitNumber}-signature.png`}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
