import React, { useState, useEffect } from 'react';
import { Visit } from '../../types/posbakum';
import { 
  signInWithGoogleSheets, 
  signOutGoogle, 
  getGoogleAccessToken, 
  createSpreadsheetWithVisits, 
  appendToExistingSpreadsheet,
  fetchSpreadsheetDetails,
  generateSheetsTsv,
  downloadSpreadsheetXlsx,
  downloadSheetsCsv,
  CreatedSpreadsheetResult
} from '../../services/googleSheetsService';
import { logActivity } from '../../services/storageService';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle, 
  FolderPlus, 
  LogOut, 
  Sparkles, 
  Search, 
  ShieldCheck, 
  Copy, 
  Check, 
  Download, 
  Globe, 
  Zap,
  Info,
  Layers,
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
  // Method Switcher: 'no_account' (instant sheets download/make) vs 'with_account' (Google Drive API)
  const [activeMethod, setActiveMethod] = useState<'no_account' | 'with_account'>('no_account');

  // Custom File Name for Direct Download & Making
  const todayStr = new Date().toISOString().substring(0, 10);
  const [fileNameInput, setFileNameInput] = useState(`Rekap_GoogleSheets_Posbakum_${todayStr}`);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);
  const [isDownloadingXlsx, setIsDownloadingXlsx] = useState(false);
  const [isDownloadingSheets, setIsDownloadingSheets] = useState(false);

  // Google Account state for Drive API
  const [googleUser, setGoogleUser] = useState<{ displayName?: string | null; email?: string | null; photoURL?: string | null } | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<boolean>(false);
  
  // No-account states
  const [copiedData, setCopiedData] = useState<boolean>(false);

  // Sync Mode for With-Account: 'create_new' | 'append_existing'
  const [syncMode, setSyncMode] = useState<'create_new' | 'append_existing'>('create_new');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState(`Rekap Buku Tamu Pos Bantuan Hukum (POSBAKUM) - ${new Date().toLocaleDateString('id-ID')}`);
  
  // Existing spreadsheet state
  const [existingSheetInput, setExistingSheetInput] = useState('');
  const [isCheckingSheet, setIsCheckingSheet] = useState(false);
  const [sheetDetails, setSheetDetails] = useState<{ title: string; sheetNames: string[] } | null>(null);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('Sheet1');

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [confirmActionType, setConfirmActionType] = useState<'create' | 'append'>('create');

  // Results State
  const [lastExportResult, setLastExportResult] = useState<CreatedSpreadsheetResult | { spreadsheetUrl: string; updatedRows: number } | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Check auth state on mount
  useEffect(() => {
    const token = getGoogleAccessToken();
    if (token) {
      setIsConnected(true);
    }
  }, []);

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
            `Berkas "${cleanName}.xlsx" (${targetVisits.length} data kunjungan) berhasil dibuat dan diunduh! Siap dibuka langsung di Google Sheets atau Excel tanpa perlu akun Google.`
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
        description: `Bikin & Download Spreadsheet XLSX (${targetVisits.length} data) tanpa login`,
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
        description: `Download berkas XLSX & Buka Google Sheets (${targetVisits.length} baris)`,
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

  // --- With-Account Google OAuth Actions ---

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setUnauthorizedDomain(null);
    try {
      const result = await signInWithGoogleSheets();
      if (result) {
        setGoogleUser({
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        });
        setIsConnected(true);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      const code = err?.code || '';
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        msg.includes('popup-closed-by-user') ||
        msg.includes('cancelled-popup-request')
      ) {
        return;
      }
      if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'bukutamuposbakumpabanjarmasin.vercel.app';
        setUnauthorizedDomain(domain);
        return;
      }
      console.warn('Google Sign In Warning:', msg);
      setErrorMsg(msg || 'Gagal menghubungkan ke akun Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    await signOutGoogle();
    setGoogleUser(null);
    setIsConnected(false);
    setSheetDetails(null);
    setLastExportResult(null);
  };

  const handleCopyDomain = async () => {
    if (unauthorizedDomain && navigator.clipboard) {
      await navigator.clipboard.writeText(unauthorizedDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const handleCheckExistingSheet = async () => {
    const sId = extractSpreadsheetId(existingSheetInput);
    if (!sId) {
      setErrorMsg('Masukkan URL atau ID Google Spreadsheet yang valid.');
      return;
    }

    setIsCheckingSheet(true);
    setErrorMsg(null);
    try {
      const details = await fetchSpreadsheetDetails(sId);
      setSheetDetails(details);
      if (details.sheetNames.length > 0) {
        setSelectedSheetName(details.sheetNames[0]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memuat detail Spreadsheet.');
      setSheetDetails(null);
    } finally {
      setIsCheckingSheet(false);
    }
  };

  const triggerExportConfirmation = (type: 'create' | 'append') => {
    if (filteredVisits.length === 0) {
      setErrorMsg('Tidak ada data kunjungan yang dipilih untuk diekspor.');
      return;
    }
    setErrorMsg(null);
    setConfirmActionType(type);
    setShowConfirmModal(true);
  };

  const executeConfirmedExport = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessNotice(null);

    try {
      if (confirmActionType === 'create') {
        const result = await createSpreadsheetWithVisits(spreadsheetTitle, filteredVisits);
        setLastExportResult(result);
        setSuccessNotice(`Spreadsheet "${result.title}" berhasil dibuat di Google Drive dengan ${result.rowCount} baris data.`);
        
        logActivity({
          userId: googleUser?.email || 'officer',
          userName: googleUser?.displayName || 'Petugas Posbakum',
          userRole: 'Petugas Posbakum',
          action: 'EXPORT_GOOGLE_SHEETS',
          description: `Membuat Spreadsheet Google baru (${result.rowCount} baris): ${result.title}`,
          badgeColor: 'emerald',
        });
      } else {
        const sId = extractSpreadsheetId(existingSheetInput);
        const result = await appendToExistingSpreadsheet(sId, filteredVisits, selectedSheetName);
        setLastExportResult(result);
        setSuccessNotice(`Berhasil menambahkan ${result.updatedRows} baris ke lembar "${selectedSheetName}".`);

        logActivity({
          userId: googleUser?.email || 'officer',
          userName: googleUser?.displayName || 'Petugas Posbakum',
          userRole: 'Petugas Posbakum',
          action: 'EXPORT_GOOGLE_SHEETS',
          description: `Menambahkan ${result.updatedRows} baris data ke Google Spreadsheet ID: ${sId}`,
          badgeColor: 'emerald',
        });
      }
    } catch (err: any) {
      console.error('Export Google Sheets Error:', err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memproses ekspor ke Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-emerald-900/5 via-white to-slate-50 rounded-2xl p-4 sm:p-5 border-2 border-emerald-700/20 shadow-xs space-y-4 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-700 text-white rounded-xl shadow-xs shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Ekspor & Bikin Berkas Google Sheets</span>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-0.5 tracking-tight">
              Ekspor & Bikin Google Sheets (Bisa Tanpa Login Akun Google)
            </h3>
            <p className="text-[11px] text-slate-500">
              Anda dapat langsung bikin dan mengunduh berkas Spreadsheet (.xlsx) siap buka di Google Sheets tanpa login, atau sinkronisasi otomatis ke Google Drive.
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

      {/* Main Choice Switcher: No-Account vs With-Account */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 bg-slate-200/80 rounded-xl">
        <button
          type="button"
          onClick={() => {
            setActiveMethod('no_account');
            setErrorMsg(null);
            setUnauthorizedDomain(null);
          }}
          className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeMethod === 'no_account'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <div className="text-left leading-tight">
            <div>Bikin & Download (Tanpa Login Akun Google)</div>
            <div className={`text-[10px] font-normal ${activeMethod === 'no_account' ? 'text-emerald-100' : 'text-slate-500'}`}>
              Instan • Berkas .xlsx & .csv Siap Buka di Google Sheets
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveMethod('with_account');
            setErrorMsg(null);
          }}
          className={`px-3.5 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeMethod === 'with_account'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/60'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-300" />
          <div className="text-left leading-tight">
            <div>Sinkronisasi Otomatis Google Drive</div>
            <div className={`text-[10px] font-normal ${activeMethod === 'with_account' ? 'text-emerald-100' : 'text-slate-500'}`}>
              Dengan Akun Google • Buat/Update di Drive Pribadi
            </div>
          </div>
        </button>
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

      {/* ========================================================================= */}
      {/* METHOD 1: BIKIN & DOWNLOAD TANPA LOGIN AKUN GOOGLE (XLSX, CSV, SHEETS)   */}
      {/* ========================================================================= */}
      {activeMethod === 'no_account' && (
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
                    Format asli Spreadsheet Excel & Google Sheets. Sudah dilengkapi header resmi warna hijau, freeze row, dan lebar kolom otomatis. Langsung siap dipakai tanpa login.
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
      )}

      {/* ========================================================================= */}
      {/* METHOD 2: DENGAN AKUN GOOGLE (GOOGLE DRIVE API OAUTH)                    */}
      {/* ========================================================================= */}
      {activeMethod === 'with_account' && (
        <div className="space-y-4">
          {/* Unauthorized Domain Special Guidance Box */}
          {unauthorizedDomain && (
            <div className="bg-amber-50 border-2 border-amber-400/70 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                    Domain Belum Terdaftar di Firebase Authorized Domains
                  </h4>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Domain aplikasi Anda saat ini adalah <strong className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-amber-950">{unauthorizedDomain}</strong>. Firebase Authentication membutuhkan domain ini didaftarkan agar jendela login Google diizinkan.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {/* Instant switch to no-account */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveMethod('no_account');
                    setUnauthorizedDomain(null);
                  }}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Gunakan Bikin & Download Tanpa Akun Saja (1-Klik Berhasil)</span>
                </button>

                {/* Copy domain button */}
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="px-3 py-2 bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  {copiedDomain ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Domain Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-700" />
                      <span>Salin Domain ({unauthorizedDomain})</span>
                    </>
                  )}
                </button>

                {/* Retry login button */}
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isLoading}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <span>{isLoading ? 'Menghubungkan...' : 'Coba Hubungkan Akun Lagi'}</span>
                </button>
              </div>

              {/* Step-by-step how to add to Firebase Console */}
              <div className="p-3 bg-white rounded-lg border border-amber-200 text-[11px] text-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cara Mendaftarkan Domain di Firebase Console (Hanya 1 Menit):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 text-[10.5px]">
                  <li>Buka <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-2.5 h-2.5" /></a> lalu pilih proyek Anda.</li>
                  <li>Buka menu <strong>Authentication</strong> pada bilah sebelah kiri, lalu pilih tab <strong>Settings</strong>.</li>
                  <li>Gulir ke bagian <strong>Authorized domains</strong>, klik tombol <strong>Add domain</strong>.</li>
                  <li>Tempel nama domain: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">{unauthorizedDomain}</code> (atau <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">vercel.app</code>) lalu klik <strong>Add</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Connected User Header / Connect Button */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800">Status Autentikasi Google Drive</div>
              <div className="text-[11px] text-slate-500">
                {isConnected 
                  ? `Terhubung sebagai ${googleUser?.email || 'Akun Google Terotorisasi'}`
                  : 'Hubungkan akun Google Anda untuk membuat atau memperbarui spreadsheet di Google Drive secara otomatis.'}
              </div>
            </div>

            <div>
              {isConnected ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="text-left">
                    <div className="text-[10px] text-slate-500 font-medium">Akun Aktif:</div>
                    <div className="text-xs font-bold text-emerald-900 truncate max-w-[170px]">
                      {googleUser?.email || 'Akun Google'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectGoogle}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition ml-1"
                    title="Putuskan Hubungan Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-[0.99] disabled:opacity-60"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{isLoading ? 'Menghubungkan...' : 'Hubungkan Akun Google'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Success Notice for Drive API Export */}
          {successNotice && lastExportResult && (
            <div className="bg-emerald-50 border-2 border-emerald-500/30 text-emerald-950 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-xs">{successNotice}</span>
                </div>
                <a
                  href={lastExportResult.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition"
                >
                  <span>Buka di Google Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-[11px] text-emerald-900/80 font-mono break-all pl-6">
                Link Berkas: {lastExportResult.spreadsheetUrl}
              </div>
            </div>
          )}

          {/* Sub-modes when connected */}
          {isConnected && (
            <div className="space-y-3.5">
              {/* Mode Tabs */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setSyncMode('create_new')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    syncMode === 'create_new'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Buat Spreadsheet Baru di Google Drive</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSyncMode('append_existing')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    syncMode === 'append_existing'
                      ? 'bg-white text-emerald-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderPlus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tambahkan ke Spreadsheet yang Ada</span>
                </button>
              </div>

              {/* Mode: Create New Spreadsheet */}
              {syncMode === 'create_new' && (
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Judul Berkas Spreadsheet Baru:
                    </label>
                    <input
                      type="text"
                      value={spreadsheetTitle}
                      onChange={(e) => setSpreadsheetTitle(e.target.value)}
                      placeholder="Contoh: Rekap Kunjungan Posbakum Agustus 2026"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="text-slate-600 text-[11px]">
                      Akan mengekspor <span className="font-bold text-emerald-800">{filteredVisits.length}</span> baris data kunjungan terpilih dengan format header hijau resmi, freeze header row, dan auto-lebar kolom.
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerExportConfirmation('create')}
                      disabled={isLoading || filteredVisits.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition shrink-0 disabled:opacity-50"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{isLoading ? 'Membuat Spreadsheet...' : 'Buat Spreadsheet di Google Drive'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Mode: Append to Existing Spreadsheet */}
              {syncMode === 'append_existing' && (
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Masukkan URL atau ID Google Spreadsheet:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={existingSheetInput}
                        onChange={(e) => setExistingSheetInput(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/1a2b3c4d.../edit atau ID Spreadsheet"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-semibold text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleCheckExistingSheet}
                        disabled={isCheckingSheet || !existingSheetInput.trim()}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isCheckingSheet ? 'Memeriksa...' : 'Cek Berkas'}</span>
                      </button>
                    </div>
                  </div>

                  {sheetDetails && (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{sheetDetails.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {sheetDetails.sheetNames.length} Lembar Tab
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-600">
                          Pilih Lembar Tab Target:
                        </label>
                        <select
                          value={selectedSheetName}
                          onChange={(e) => setSelectedSheetName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                        >
                          {sheetDetails.sheetNames.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="text-slate-600 text-[11px]">
                      Menambahkan <span className="font-bold text-emerald-800">{filteredVisits.length}</span> baris kunjungan ke bagian bawah spreadsheet tujuan.
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerExportConfirmation('append')}
                      disabled={isLoading || !sheetDetails || filteredVisits.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-xs transition shrink-0 disabled:opacity-50"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>{isLoading ? 'Menyinkronkan...' : 'Tambahkan Baris ke Spreadsheet'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Google Workspace API Operations */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Konfirmasi Operasi Google Sheets
                </h4>
                <p className="text-xs text-slate-500">
                  {confirmActionType === 'create'
                    ? `Apakah Anda yakin ingin membuat berkas spreadsheet baru berjudul "${spreadsheetTitle}" di Google Drive Anda dan menulis ${filteredVisits.length} baris data kunjungan?`
                    : `Apakah Anda yakin ingin menambahkan ${filteredVisits.length} baris data kunjungan ke spreadsheet "${sheetDetails?.title}" pada lembar "${selectedSheetName}"?`}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] space-y-1 text-slate-600">
              <div className="font-semibold text-slate-700">Rincian Tindakan:</div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                <li>Jumlah Baris: <span className="font-bold text-slate-800">{filteredVisits.length} Record</span></li>
                <li>Akun Pengguna: <span className="font-mono text-emerald-800">{googleUser?.email || 'Akun Google'}</span></li>
                <li>Layanan: Google Sheets & Google Drive API</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeConfirmedExport}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Ya, Lanjutkan Ekspor</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
