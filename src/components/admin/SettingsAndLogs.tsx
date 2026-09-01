import React, { useState, useEffect } from 'react';
import { ActivityLog, CASE_CATEGORIES } from '../../types/posbakum';
import { getStoredLogs, clearAllVisits, logActivity } from '../../services/storageService';
import { 
  Settings, 
  History, 
  ShieldCheck, 
  Database, 
  RefreshCcw, 
  Trash2,
  Server, 
  CheckCircle2, 
  Scale, 
  Layers,
  Sparkles
} from 'lucide-react';

interface SettingsAndLogsProps {
  onDataReset: () => void;
}

export const SettingsAndLogs: React.FC<SettingsAndLogsProps> = ({ onDataReset }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [resetDone, setResetDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'categories' | 'system'>('logs');

  useEffect(() => {
    setLogs(getStoredLogs());
  }, []);

  const handleResetData = async () => {
    if (window.confirm('Apakah Anda yakin ingin MENGHAPUS SEMUA data kunjungan & mereset statistik ke 0? Data akan dikosongkan secara total tanpa membuat data template/dummy.')) {
      await clearAllVisits('Administrator');
      setLogs(getStoredLogs());
      setResetDone(true);
      onDataReset();
      setTimeout(() => setResetDone(false), 3000);
    }
  };

  return (
    <div className="space-y-3.5 text-xs font-sans">
      {/* Title - High Density */}
      <div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
          <Settings className="w-5 h-5 text-emerald-700" />
          <span>PENGATURAN & AUDIT LOG SISTEM</span>
        </h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Monitoring rekam jejak aktivitas petugas, struktur kategori perkara, dan pemeliharaan data
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'logs'
              ? 'bg-white border-t-2 border-emerald-600 text-emerald-950 shadow-2xs border-x border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5 text-emerald-700" />
          <span>Audit Log ({logs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'categories'
              ? 'bg-white border-t-2 border-emerald-600 text-emerald-950 shadow-2xs border-x border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-emerald-700" />
          <span>Katalog Jenis Perkara</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 ${
            activeTab === 'system'
              ? 'bg-white border-t-2 border-emerald-600 text-emerald-950 shadow-2xs border-x border-slate-200'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-emerald-700" />
          <span>Info Sistem & Demo</span>
        </button>
      </div>

      {/* Tab 1: Audit Activity Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Rekam Jejak Audit Petugas & Sistem</h3>
              <p className="text-[10px] text-slate-400">Catatan otomatis waktu, nomor antrian, dan perubahan data</p>
            </div>
            <button
              type="button"
              onClick={() => setLogs(getStoredLogs())}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <RefreshCcw className="w-3 h-3" />
              <span>Segarkan Log</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px] uppercase sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-2.5 py-1.5">Waktu</th>
                  <th className="px-2.5 py-1.5">Pengguna</th>
                  <th className="px-2.5 py-1.5">Aksi</th>
                  <th className="px-2.5 py-1.5">Deskripsi Aktivitas</th>
                  <th className="px-2.5 py-1.5">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-2.5 py-1.5 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-800">
                      <div className="font-bold text-slate-900">{log.userName}</div>
                      <div className="text-[9px] text-slate-400">{log.userRole}</div>
                    </td>
                    <td className="px-2.5 py-1.5">
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-700 text-[11px]">{log.description}</td>
                    <td className="px-2.5 py-1.5 font-mono text-slate-400 text-[10px]">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Case Categories Directory */}
      {activeTab === 'categories' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CASE_CATEGORIES.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h4 className="font-bold text-xs text-emerald-950">{cat.name}</h4>
                  <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded">
                    {cat.types.length} Jenis
                  </span>
                </div>

                <ul className="space-y-1 text-[11px] text-slate-700">
                  {cat.types.map((type, idx) => (
                    <li key={type} className="flex items-start gap-1.5">
                      <span className="text-emerald-600 font-bold font-mono text-[9px] mt-0.5">
                        {idx + 1}.
                      </span>
                      <span>{type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: System Info & Database Reset */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200 space-y-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-rose-700" />
              <span>Pemeliharaan Basis Data & Reset Total</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Gunakan tombol di bawah ini untuk menghapus seluruh data kunjungan dan mereset statistik ke 0 secara permanen.
            </p>
          </div>

          <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-bold text-xs text-rose-950">Kosongkan / Reset Seluruh Data Kunjungan</div>
              <div className="text-[10px] text-slate-600">
                Menghapus semua riwayat kunjungan dari Firestore & LocalStorage (Data = 0, tidak membuat template lagi).
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetData}
              className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-xs"
            >
              {resetDone ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Semua Data Telah Dihapus!</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua Data Kunjungan</span>
                </>
              )}
            </button>
          </div>

          {/* System Specs Badge */}
          <div className="border-t border-slate-100 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 bg-slate-50 rounded-lg">
              <div className="text-slate-400 text-[9px] uppercase font-bold">Aplikasi</div>
              <div className="font-bold text-slate-800 text-[11px]">Buku Tamu Posbakum</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg">
              <div className="text-slate-400 text-[9px] uppercase font-bold">Instansi</div>
              <div className="font-bold text-slate-800 text-[11px]">PA Banjarmasin Kelas 1A</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg">
              <div className="text-slate-400 text-[9px] uppercase font-bold">Format Nomor</div>
              <div className="font-mono font-bold text-emerald-800 text-[11px]">KJG-YYYYMMDD-NNNN</div>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg">
              <div className="text-slate-400 text-[9px] uppercase font-bold">Versi Sistem</div>
              <div className="font-bold text-slate-800 text-[11px]">v1.0 (High Density)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
