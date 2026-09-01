import React, { useState, useEffect } from 'react';
import { Visit } from '../../types/posbakum';
import { 
  signInWithGoogleSheets, 
  signOutGoogle, 
  getGoogleAccessToken, 
  createSpreadsheetWithVisits, 
  appendToExistingSpreadsheet,
  fetchSpreadsheetDetails,
  CreatedSpreadsheetResult
} from '../../services/googleSheetsService';
import { logActivity } from '../../services/storageService';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  PlusCircle, 
  FolderPlus, 
  LogOut, 
  Sparkles,
  Search,
  ShieldCheck,
  HelpCircle,
  Clock,
  Layers
} from 'lucide-react';

interface GoogleSheetsSyncProps {
  filteredVisits: Visit[];
  allVisitsCount: number;
}

export const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({ 
  filteredVisits,
  allVisitsCount
}) => {
  const [googleUser, setGoogleUser] = useState<{ displayName?: string | null; email?: string | null; photoURL?: string | null } | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Sync Mode: 'create_new' | 'append_existing'
  const [syncMode, setSyncMode] = useState<'create_new' | 'append_existing'>('create_new');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState(`Rekap Buku Tamu Posbakum PA Banjarmasin - ${new Date().toLocaleDateString('id-ID')}`);
  
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

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMsg(null);
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
      console.error('Google Sign In Error:', err);
      setErrorMsg(err.message || 'Gagal menghubungkan ke akun Google.');
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

  const extractSpreadsheetId = (input: string): string => {
    const trimmed = input.trim();
    // Check if it's a URL
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
        setSuccessNotice(`Spreadsheet "${result.title}" berhasil dibuat dengan ${result.rowCount} baris data.`);
        
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
              <span>Integrasi Resmi Google Workspace</span>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-0.5 tracking-tight">
              Ekspor & Sinkronisasi Google Sheets
            </h3>
            <p className="text-[11px] text-slate-500">
              Kirim rekapitulasi data buku tamu Posbakum langsung ke lembar kerja Google Spreadsheet di Google Drive Anda.
            </p>
          </div>
        </div>

        {/* Auth Status / Action Button */}
        <div>
          {isConnected ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-left">
                <div className="text-[10px] text-slate-500 font-medium">Terhubung sebagai:</div>
                <div className="text-xs font-bold text-emerald-900 truncate max-w-[150px]">
                  {googleUser?.email || 'Akun Google Terotorisasi'}
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
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition active:scale-[0.99] disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoading ? 'Menghubungkan...' : 'Hubungkan Akun Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMsg}</div>
        </div>
      )}

      {/* Success Result Box */}
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

      {/* Main Options Panel (Active once connected, or show connect prompt) */}
      {!isConnected ? (
        <div className="p-5 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center space-y-2.5">
          <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-xs font-bold text-slate-800">
            Hubungkan Akun Google untuk Mengaktifkan Ekspor Spreadsheet
          </h4>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Dengan menghubungkan akun Google Anda, aplikasi dapat membuat spreadsheet baru secara otomatis dengan penataan kolom siap pakai serta styling resmi Pengadilan Agama Banjarmasin.
          </p>
          <button
            type="button"
            onClick={handleConnectGoogle}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Login & Hubungkan Google Workspace</span>
          </button>
        </div>
      ) : (
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
              <span>Buat Spreadsheet Baru</span>
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

      {/* Mandatory User Confirmation Dialog for Workspace API Operations */}
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
