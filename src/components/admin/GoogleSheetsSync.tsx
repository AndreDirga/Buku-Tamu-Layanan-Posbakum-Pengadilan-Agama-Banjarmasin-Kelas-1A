import React, { useState } from 'react';
import { Visit } from '../../types/posbakum';
import { 
  generateSheetsTsv,
  downloadSpreadsheetXlsx,
  downloadSheetsCsv,
} from '../../services/googleSheetsService';
import { logActivity } from '../../services/storageService';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Zap,
  Info,
  FileCheck,
  Loader2
} from 'lucide-react';

interface GoogleSheetsSyncProps {
  filteredVisits: Visit[];
  allVisits?: Visit[];
  allVisitsCount: number;
  onResetFilter?: () => void;
}

export const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({ 
  filteredVisits,
  allVisits,
  allVisitsCount,
  onResetFilter,
}) => {
  // Custom File Name for Direct Download & Making
  const todayStr = new Date().toISOString().substring(0, 10);
  const [fileNameInput, setFileNameInput] = useState(`Rekap_GoogleSheets_Posbakum_${todayStr}`);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [isDownloadingXlsx, setIsDownloadingXlsx] = useState(false);
  const [isDownloadingSheets, setIsDownloadingSheets] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedData, setCopiedData] = useState<boolean>(false);

  // --- No-Account Direct Actions: Bikin & Download Tanpa Login Akun Google ---

  const handleDownloadXlsxDirect = () => {
    try {
      setIsDownloadingXlsx(true);
      setErrorMsg(null);

      // Determine records to export: use filtered visits, or fallback to all visits, or empty template
      const targetVisits = filteredVisits.length > 0 
        ? filteredVisits 
        : (allVisits && allVisits.length > 0 ? allVisits : []);

      const cleanName = fileNameInput.trim() || `Rekap_GoogleSheets_Posbakum_${todayStr}`;
      downloadSpreadsheetXlsx(targetVisits, cleanName);

      if (targetVisits.length > 0) {
        if (filteredVisits.length === 0 && allVisits && allVisits.length > 0) {
          setDownloadSuccessMsg(
            `Filter tanggal saat ini tidak menemukan data, sehingga sistem otomatis mengekspor seluruh ${targetVisits.length} data kunjungan ke berkas "${cleanName}.xlsx". Siap dibuka di Google Sheets atau Excel tanpa login akun Google!`
          );
        } else {
          setDownloadSuccessMsg(
            `Berkas "${cleanName}.xlsx" (${targetVisits.length} data kunjungan) berhasil dibuat dan diunduh! Siap dibuka langsung di Google Sheets atau Excel tanpa perlu login akun Google.`
          );
        }
      } else {
        setDownloadSuccessMsg(
          `Berkas Template Resmi "${cleanName}.xlsx" berhasil diunduh dengan struktur kolom lengkap Posbakum! (Belum ada kunjungan tersimpan di sistem).`
        );
      }

      logActivity({
        userId: 'officer',
        userName: 'Petugas Posbakum',
        userRole: 'Petugas Posbakum',
        action: 'EXPORT_GOOGLE_SHEETS',
        description: `Bikin & Download Spreadsheet XLSX (${targetVisits.length} data) tanpa login akun google`,
        badgeColor: 'emerald',
      });
    } catch (err: any) {
      console.error('Error generating spreadsheet:', err);
      setErrorMsg('Gagal membuat berkas spreadsheet: ' + (err.message || 'Silakan coba lagi.'));
    } finally {
      setTimeout(() => setIsDownloadingXlsx(false), 800);
    }
  };

  const handleDownloadAndOpenSheets = async () => {
    try {
      setIsDownloadingSheets(true);
      setErrorMsg(null);

      const targetVisits = filteredVisits.length > 0 
        ? filteredVisits 
        : (allVisits && allVisits.length > 0 ? allVisits : []);

      const cleanName = fileNameInput.trim() || `Rekap_GoogleSheets_Posbakum_${todayStr}`;
      
      // 1. Download the real .xlsx file
      downloadSpreadsheetXlsx(targetVisits, cleanName);

      // 2. Also copy TSV to clipboard for instant Ctrl+V
      const tsvData = generateSheetsTsv(targetVisits);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(tsvData);
          setCopiedData(true);
          setTimeout(() => setCopiedData(false), 5000);
        } catch (clipErr) {
          console.warn('Clipboard write failed:', clipErr);
        }
      }

      // 3. Open sheets.new
      window.open('https://sheets.new', '_blank');

      setDownloadSuccessMsg(
        `Berkas "${cleanName}.xlsx" (${targetVisits.length} baris) telah diunduh dan tab Google Sheets baru telah dibuka. Anda bisa mengunggah berkas tersebut ke Google Sheets, atau cukup klik sel A1 lalu tekan Ctrl + V.`
      );

      logActivity({
        userId: 'officer',
        userName: 'Petugas Posbakum',
        userRole: 'Petugas Posbakum',
        action: 'EXPORT_GOOGLE_SHEETS',
        description: `Download berkas XLSX & Buka Google Sheets (${targetVisits.length} baris) tanpa login akun google`,
        badgeColor: 'emerald',
      });
    } catch (err: any) {
      console.error('Error in download & open:', err);
      window.open('https://sheets.new', '_blank');
    } finally {
      setTimeout(() => setIsDownloadingSheets(false), 800);
    }
  };

  const handleDownloadCsvDirect = () => {
    try {
      const targetVisits = filteredVisits.length > 0 
        ? filteredVisits 
        : (allVisits && allVisits.length > 0 ? allVisits : []);

      const cleanName = fileNameInput.trim() || `Rekap_GoogleSheets_Posbakum_${todayStr}`;
      downloadSheetsCsv(targetVisits, cleanName);
      setDownloadSuccessMsg(`Berkas "${cleanName}.csv" (${targetVisits.length} data) berhasil diunduh dengan encoding UTF-8 resmi.`);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg('Gagal mengunduh berkas CSV: ' + (err.message || ''));
    }
  };

  const handleCopyTsvOnly = async () => {
    try {
      const targetVisits = filteredVisits.length > 0 
        ? filteredVisits 
        : (allVisits && allVisits.length > 0 ? allVisits : []);

      const tsvData = generateSheetsTsv(targetVisits);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsvData);
        setCopiedData(true);
        setTimeout(() => setCopiedData(false), 4000);
        setDownloadSuccessMsg(`Data ${targetVisits.length} kunjungan telah disalin ke papan klip! Buka lembar kerja Google Sheets lalu tekan Ctrl + V.`);
      } else {
        setErrorMsg('Papan klip tidak didukung pada peramban ini.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal menyalin data: ' + (err.message || ''));
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Context Info */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-300 shadow-xs">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-extrabold border border-emerald-200">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Bikin & Download Langsung (Tanpa Login Akun Google)</span>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-0.5 tracking-tight">
              Bikin & Download Berkas Google Sheets
            </h3>
            <p className="text-[11px] text-slate-500">
              Buat dan unduh berkas Spreadsheet (.xlsx & .csv) siap buka di Google Sheets secara instan tanpa perlu login akun Google.
            </p>
          </div>
        </div>

        {/* Selected Data Badge */}
        <div className="text-right shrink-0 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/80">
          <div className="text-[10px] text-slate-500 font-semibold uppercase">Data Terpilih</div>
          <div className="text-xs font-black text-emerald-800">
            {filteredVisits.length > 0 
              ? `${filteredVisits.length} dari ${allVisitsCount} Record` 
              : `0 Terfilter (${allVisitsCount} Total)`}
          </div>
          {filteredVisits.length === 0 && onResetFilter && allVisitsCount > 0 && (
            <button
              type="button"
              onClick={onResetFilter}
              className="text-[10px] text-emerald-700 font-bold underline hover:text-emerald-900 block mt-0.5"
            >
              Reset ke Semua Data
            </button>
          )}
        </div>
      </div>

      {/* General Error Notice */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-semibold text-rose-900">{errorMsg}</div>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-700 p-0.5 font-bold"
            title="Tutup pesan"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="space-y-4">
        {/* Success Banner */}
        {downloadSuccessMsg && (
          <div className="bg-emerald-50 border-2 border-emerald-500/40 text-emerald-950 p-3.5 rounded-xl space-y-2 animate-in fade-in">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-xs text-emerald-900">
                    {downloadSuccessMsg}
                  </div>
                  <div className="text-[11px] text-emerald-800 leading-relaxed">
                    💡 <strong>Tips Membuka di Google Sheets:</strong> Buka <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="font-bold underline text-emerald-900 hover:text-emerald-950">sheets.new</a>, pilih <strong>File &gt; Buka (Open) &gt; Upload</strong>, lalu seret berkas <strong>.xlsx</strong> yang baru diunduh. Semua data dan kolom otomatis rapi!
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDownloadSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold p-1"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Main Action Box */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
          {/* File Name Configurator */}
          <div className="space-y-1.5 pb-3 border-b border-slate-100">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Nama Berkas Spreadsheet yang Ingin Dibuat:</span>
              <span className="text-[11px] font-normal text-slate-500">
                Format akan otomatis disesuaikan (.xlsx / .csv)
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={fileNameInput}
                onChange={(e) => setFileNameInput(e.target.value)}
                placeholder="Contoh: Rekap_GoogleSheets_Posbakum_Agustus2026"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          {/* Filter Notice Banner if 0 filtered */}
          {filteredVisits.length === 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  {allVisitsCount > 0 ? (
                    <span>
                      Filter tanggal saat ini tidak menemukan data kunjungan. Menekan tombol unduh di bawah akan <strong>otomatis mengekspor seluruh {allVisitsCount} data kunjungan</strong> yang ada di sistem, atau Anda dapat mereset filter.
                    </span>
                  ) : (
                    <span>
                      Belum ada data kunjungan yang tercatat di sistem. Menekan tombol unduh di bawah akan mengunduh <strong>Template Lembar Kerja Resmi Posbakum (.xlsx)</strong> lengkap dengan 17 kolom dan format header hijau.
                    </span>
                  )}
                </div>
              </div>
              {allVisitsCount > 0 && onResetFilter && (
                <button
                  type="button"
                  onClick={onResetFilter}
                  className="px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-950 font-bold rounded-lg shrink-0 transition"
                >
                  Reset Filter
                </button>
              )}
            </div>
          )}

          {/* Main Action Buttons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Button 1: Download XLSX */}
            <div className="p-4 rounded-xl border-2 border-emerald-600/30 bg-emerald-50/40 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Bikin & Unduh Berkas Spreadsheet (.xlsx)</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Format asli Spreadsheet Excel & Google Sheets. Sudah dilengkapi header resmi warna hijau, freeze row, dan lebar kolom otomatis. Langsung siap dipakai tanpa login akun Google.
                </p>
              </div>
              <button
                type="button"
                id="btn-download-xlsx"
                onClick={handleDownloadXlsxDirect}
                disabled={isDownloadingXlsx}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-70"
              >
                {isDownloadingXlsx ? (
                  <>
                    <Loader2 className="w-4 h-4 text-emerald-200 animate-spin" />
                    <span>Sedang Mengunduh Berkas...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>Unduh Spreadsheet (.xlsx)</span>
                  </>
                )}
              </button>
            </div>

            {/* Button 2: Download & Open in Google Sheets Web */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Unduh & Langsung Buka di Google Sheets Web</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Mengunduh berkas Spreadsheet sekaligus membuka tab Google Sheets baru (<code className="font-mono text-emerald-800">sheets.new</code>). Data juga otomatis disalin untuk ditempel (Ctrl+V).
                </p>
              </div>
              <button
                type="button"
                id="btn-download-open-sheets"
                onClick={handleDownloadAndOpenSheets}
                disabled={isDownloadingSheets}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-70"
              >
                {isDownloadingSheets ? (
                  <>
                    <Loader2 className="w-4 h-4 text-emerald-300 animate-spin" />
                    <span>Membuka Google Sheets...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    <span>Download & Buka Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Secondary Utility Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCopyTsvOnly}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              {copiedData ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Data Tabel Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Data Format Tabel (Paste ke Google Sheets)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadCsvDirect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Unduh Berkas CSV Format Google Sheets (.csv)</span>
            </button>
          </div>

          {/* 3 Step Visual Guide: How to use with Google Sheets */}
          <div className="pt-2">
            <div className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cara Membuka Berkas di Google Sheets (Tanpa Perlu Login di Aplikasi Ini):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                  <span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Unduh Berkas</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Klik tombol <strong>Unduh Spreadsheet (.xlsx)</strong> di atas untuk menyimpan berkas di komputer atau HP Anda.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                  <span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Buka Google Sheets</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Buka <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline">sheets.new</a> atau Google Drive Anda seperti biasa.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                  <span className="w-4 h-4 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Upload atau Drag File</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  Pilih menu <strong>File &gt; Buka &gt; Upload</strong> dan pilih berkas Anda. Seluruh kolom dan data langsung tertata rapi!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
