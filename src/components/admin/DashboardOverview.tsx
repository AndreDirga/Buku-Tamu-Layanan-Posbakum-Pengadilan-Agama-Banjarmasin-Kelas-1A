import React, { useMemo, useState } from 'react';
import { Visit } from '../../types/posbakum';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Award, 
  Clock, 
  FileSpreadsheet, 
  QrCode, 
  ArrowUpRight, 
  Scale, 
  BarChart3, 
  PieChart as PieIcon,
  RotateCcw
} from 'lucide-react';
import { ResetStatsModal } from './ResetStatsModal';

interface DashboardOverviewProps {
  visits: Visit[];
  onViewDetail: (visit: Visit) => void;
  onNavigateToVisits: () => void;
  onNavigateToStats: () => void;
  onNavigateToExport: () => void;
  onNavigateToQr: () => void;
  onDataReset?: () => void;
  officerName?: string;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  visits,
  onViewDetail,
  onNavigateToVisits,
  onNavigateToStats,
  onNavigateToExport,
  onNavigateToQr,
  onDataReset,
  officerName = 'Admin',
}) => {
  const [showResetModal, setShowResetModal] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentDay = String(now.getDate()).padStart(2, '0');
  const todayYMD = `${currentYear}-${currentMonth}-${currentDay}`;
  const thisMonthYM = `${currentYear}-${currentMonth}`;

  // 100% Dynamic KPI Calculations from Real Visits
  const stats = useMemo(() => {
    const total = visits.length;
    const todayCount = visits.filter((v) => v.visitedAt && v.visitedAt.startsWith(todayYMD)).length;
    const monthCount = visits.filter((v) => v.visitedAt && v.visitedAt.startsWith(thisMonthYM)).length;
    const yearCount = visits.filter((v) => v.visitedAt && v.visitedAt.startsWith(String(currentYear))).length;

    // Case types breakdown
    const caseMap: Record<string, number> = {};
    visits.forEach((v) => {
      if (v.caseType) {
        caseMap[v.caseType] = (caseMap[v.caseType] || 0) + 1;
      }
    });

    const sortedCases = Object.entries(caseMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total,
      todayCount,
      monthCount,
      yearCount,
      sortedCases,
    };
  }, [visits, todayYMD, thisMonthYM, currentYear]);

  // Weekly Trend Bars calculated dynamically for current week (Senin - Minggu)
  const weeklyData = useMemo(() => {
    const daysConfig = [
      { name: 'Senin', short: 'Sen', dayIndex: 1 },
      { name: 'Selasa', short: 'Sel', dayIndex: 2 },
      { name: 'Rabu', short: 'Rab', dayIndex: 3 },
      { name: 'Kamis', short: 'Kam', dayIndex: 4 },
      { name: 'Jumat', short: 'Jum', dayIndex: 5 },
      { name: 'Sabtu', short: 'Sab', dayIndex: 6 },
      { name: 'Minggu', short: 'Min', dayIndex: 0 },
    ];

    // Find start of current week (Monday)
    const curr = new Date();
    const currentDayOfWeek = curr.getDay(); // 0 is Sun, 1 is Mon
    const distanceToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    return daysConfig.map((d) => {
      const targetDate = new Date(monday);
      const offset = d.dayIndex === 0 ? 6 : d.dayIndex - 1;
      targetDate.setDate(monday.getDate() + offset);
      
      const y = targetDate.getFullYear();
      const m = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dt = String(targetDate.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${dt}`;

      const count = visits.filter((v) => v.visitedAt && v.visitedAt.startsWith(dateKey)).length;
      const isToday = dateKey === todayYMD;

      return {
        day: d.name,
        short: d.short,
        dateKey,
        count,
        isToday,
        label: `${count} Tamu`,
      };
    });
  }, [visits, todayYMD]);

  const maxWeekly = Math.max(...weeklyData.map((d) => d.count), 1);
  const recentVisits = visits.slice(0, 6);

  return (
    <div className="space-y-3.5 text-xs font-sans">
      {/* Top Banner - High Density */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              Pusat Kendali Petugas
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Wilayah Hukum PTA Banjarmasin
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
            Dashboard Layanan Pos Bantuan Hukum (POSBAKUM)
          </h2>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <p className="text-xs text-slate-400">
              Monitoring registrasi buku tamu digital, status permohonan, dan rekapitulasi perkara secara real-time.
            </p>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px] font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Pop-up Notifikasi Tamu Aktif</span>
            </span>
          </div>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-bold rounded-xl border border-rose-800/80 flex items-center gap-1.5 transition shadow-xs"
            title="Reset total kunjungan, tren & statistik"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Statistik</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToQr}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>QR Standee Meja</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToExport}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards - High Density */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Total Kunjungan */}
        <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">TOTAL KUNJUNGAN</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {stats.total.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Akumulasi terdaftar</span>
          </div>
        </div>

        {/* Hari Ini */}
        <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">HARI INI</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {stats.todayCount.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] font-semibold text-blue-700 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${stats.todayCount > 0 ? 'bg-blue-500 animate-ping' : 'bg-slate-300'}`} />
            <span>{stats.todayCount > 0 ? 'Kunjungan hari ini' : 'Belum ada kunjungan'}</span>
          </div>
        </div>

        {/* Bulan Ini */}
        <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">BULAN INI</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {stats.monthCount.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] font-semibold text-amber-700 flex items-center gap-1">
            <span>Bulan Berjalan ({currentMonth}/{currentYear})</span>
          </div>
        </div>

        {/* Tahun Ini */}
        <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-1.5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">TAHUN INI</span>
            <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
            {stats.yearCount.toLocaleString('id-ID')}
          </div>
          <div className="text-[10px] font-semibold text-purple-700 flex items-center gap-1">
            <span>Tahun Berjalan {currentYear}</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid - High Density (12 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Chart 1: Grafik Tren Kunjungan Harian (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl p-4 shadow-xs border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Tren Kunjungan Harian (Pekan Berjalan)</span>
              </h3>
              <p className="text-[11px] text-slate-400">Volume tamu Posbakum per hari kerja</p>
            </div>
            <button
              type="button"
              onClick={onNavigateToStats}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
            >
              <span>Statistik Lengkap</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-2">
            <div className="flex items-end justify-between gap-2 h-36 border-b border-slate-100 pb-2">
              {weeklyData.map((item) => {
                const heightPercent = maxWeekly > 0 ? Math.round((item.count / maxWeekly) * 100) : 0;
                return (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <span className="text-[9px] font-bold font-mono text-slate-500 opacity-0 group-hover:opacity-100 transition">
                      {item.count}
                    </span>
                    <div
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                      className={`w-full max-w-[28px] rounded-t transition-all duration-300 ${
                        item.isToday
                          ? 'bg-emerald-600 ring-2 ring-emerald-300/60 shadow-2xs'
                          : item.count > 0
                          ? 'bg-slate-200 group-hover:bg-emerald-500'
                          : 'bg-slate-100'
                      }`}
                    />
                    <span className={`text-[10px] font-bold ${item.isToday ? 'text-emerald-800 font-extrabold' : 'text-slate-500'}`}>
                      {item.short}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5">
              <span>Jam operasional: Senin – Kamis 08:00 - 16:30 WITA | Jumat 08:00 - 17:00 WITA</span>
              <span className="font-semibold text-emerald-800">Senin - Jumat</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Distribusi Jenis Perkara (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl p-4 shadow-xs border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span>Distribusi Top Perkara</span>
              </h3>
              <p className="text-[11px] text-slate-400">Peringkat permohonan bantuan hukum</p>
            </div>
          </div>

          <div className="space-y-2 pt-0.5">
            {stats.sortedCases.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada perkara tercatat (Data telah direset ke 0)
              </div>
            ) : (
              stats.sortedCases.slice(0, 5).map((item, idx) => {
                const maxCount = stats.sortedCases[0].count;
                const percent = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
                const colorClasses = [
                  'bg-emerald-600',
                  'bg-teal-600',
                  'bg-blue-600',
                  'bg-amber-600',
                  'bg-purple-600',
                ][idx % 5];

                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 truncate pr-2">{item.name}</span>
                      <span className="font-mono font-bold text-slate-900 shrink-0">{item.count}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percent}%` }}
                        className={`h-full rounded-full ${colorClasses} transition-all duration-500`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Visits Table - High Density */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>Registrasi Buku Tamu Terkini</span>
            </h3>
            <p className="text-[11px] text-slate-400">Data kunjungan masuk dari ruang tunggu & loket PTSP</p>
          </div>
          <button
            type="button"
            onClick={onNavigateToVisits}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
          >
            <span>Semua Data ({visits.length})</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          {visits.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Belum ada data kunjungan yang terdaftar.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                  <th className="px-2.5 py-2">No. Antrian</th>
                  <th className="px-2.5 py-2">Waktu</th>
                  <th className="px-2.5 py-2">Nama Penggugat / Pemohon / Tergugat / Termohon</th>
                  <th className="px-2.5 py-2">WhatsApp</th>
                  <th className="px-2.5 py-2">Jenis Perkara</th>
                  <th className="px-2.5 py-2 text-center">Status</th>
                  <th className="px-2.5 py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentVisits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-slate-50 transition">
                    <td className="px-2.5 py-1.5 font-mono font-bold text-slate-900">
                      {visit.visitNumber}
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-600 font-mono text-[11px]">
                      {visit.timeDisplay}
                    </td>
                    <td className="px-2.5 py-1.5 font-semibold text-slate-800">
                      {visit.name}
                    </td>
                    <td className="px-2.5 py-1.5 font-mono text-emerald-800 text-[11px]">
                      {visit.whatsapp}
                    </td>
                    <td className="px-2.5 py-1.5 text-slate-700 font-medium truncate max-w-[180px]">
                      {visit.caseType}
                    </td>
                    <td className="px-2.5 py-1.5 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          visit.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : visit.status === 'Sedang Dilayani'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {visit.status}
                      </span>
                    </td>
                    <td className="px-2.5 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => onViewDetail(visit)}
                        className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold text-[11px] transition border border-emerald-200"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reset Stats Modal */}
      <ResetStatsModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onSuccess={() => {
          if (onDataReset) onDataReset();
        }}
        totalVisitsCount={visits.length}
        officerName={officerName}
      />
    </div>
  );
};
