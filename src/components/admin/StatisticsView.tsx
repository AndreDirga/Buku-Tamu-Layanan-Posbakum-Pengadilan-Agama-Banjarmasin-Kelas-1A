import React, { useState, useMemo } from 'react';
import { Visit, CASE_CATEGORIES } from '../../types/posbakum';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  Calendar, 
  TrendingUp, 
  Award, 
  Filter, 
  FileText, 
  Printer, 
  RotateCcw,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { ResetStatsModal } from './ResetStatsModal';

interface StatisticsViewProps {
  visits: Visit[];
  onDataReset?: () => void;
  officerName?: string;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ 
  visits, 
  onDataReset,
  officerName = 'Admin' 
}) => {
  const [periodType, setPeriodType] = useState<'hari' | 'minggu' | 'bulan' | 'tahun'>('bulan');
  const [selectedMonth, setSelectedMonth] = useState('08');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [showResetModal, setShowResetModal] = useState(false);

  // Month names in Indonesian
  const monthNames = [
    { code: '01', short: 'Jan', full: 'Januari' },
    { code: '02', short: 'Feb', full: 'Februari' },
    { code: '03', short: 'Mar', full: 'Maret' },
    { code: '04', short: 'Apr', full: 'April' },
    { code: '05', short: 'Mei', full: 'Mei' },
    { code: '06', short: 'Jun', full: 'Juni' },
    { code: '07', short: 'Jul', full: 'Juli' },
    { code: '08', short: 'Agu', full: 'Agustus' },
    { code: '09', short: 'Sep', full: 'September' },
    { code: '10', short: 'Okt', full: 'Oktober' },
    { code: '11', short: 'Nov', full: 'November' },
    { code: '12', short: 'Des', full: 'Desember' },
  ];

  const monthYearKey = `${selectedYear}-${selectedMonth}`;

  // Filtered visits for selected period
  const monthVisits = useMemo(() => {
    return visits.filter((v) => v.visitedAt && v.visitedAt.startsWith(monthYearKey));
  }, [visits, monthYearKey]);

  const yearVisits = useMemo(() => {
    return visits.filter((v) => v.visitedAt && v.visitedAt.startsWith(selectedYear));
  }, [visits, selectedYear]);

  // 1. Dynamic Daily Stats for Selected Month (Grouped by 5-day intervals)
  const dailyStats = useMemo(() => {
    const intervals = [
      { label: 'Tgl 1-5', min: 1, max: 5 },
      { label: 'Tgl 6-10', min: 6, max: 10 },
      { label: 'Tgl 11-15', min: 11, max: 15 },
      { label: 'Tgl 16-20', min: 16, max: 20 },
      { label: 'Tgl 21-25', min: 21, max: 25 },
      { label: 'Tgl 26-31', min: 26, max: 31 },
    ];

    return intervals.map((inv) => {
      const count = monthVisits.filter((v) => {
        const dateObj = new Date(v.visitedAt);
        const day = dateObj.getDate();
        return day >= inv.min && day <= inv.max;
      }).length;

      return {
        label: inv.label,
        count,
      };
    });
  }, [monthVisits]);

  // 2. Dynamic Weekly Stats for Selected Month
  const weeklyStats = useMemo(() => {
    const weeks = [
      { label: 'Minggu 1 (Tgl 1-7)', min: 1, max: 7 },
      { label: 'Minggu 2 (Tgl 8-14)', min: 8, max: 14 },
      { label: 'Minggu 3 (Tgl 15-21)', min: 15, max: 21 },
      { label: 'Minggu 4+ (Tgl 22-Akhir)', min: 22, max: 31 },
    ];

    return weeks.map((w, idx) => {
      const count = monthVisits.filter((v) => {
        const day = new Date(v.visitedAt).getDate();
        return day >= w.min && day <= w.max;
      }).length;

      return {
        label: w.label,
        count,
      };
    });
  }, [monthVisits]);

  // 3. Dynamic Monthly Stats for Selected Year (12 Months)
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const currY = now.getFullYear();
    const currM = String(now.getMonth() + 1).padStart(2, '0');

    return monthNames.map((m) => {
      const prefix = `${selectedYear}-${m.code}`;
      const count = visits.filter((v) => v.visitedAt && v.visitedAt.startsWith(prefix)).length;
      const isCurrent = String(currY) === selectedYear && currM === m.code;

      return {
        month: m.short,
        fullName: m.full,
        code: m.code,
        count,
        isCurrent,
      };
    });
  }, [visits, selectedYear]);

  // 4. Dynamic Yearly Stats
  const yearlyStats = useMemo(() => {
    const years = ['2024', '2025', '2026', '2027'];
    return years.map((y) => {
      const count = visits.filter((v) => v.visitedAt && v.visitedAt.startsWith(y)).length;
      return {
        year: y,
        count,
        isCurrent: y === '2026',
      };
    });
  }, [visits]);

  // 5. Dynamic Case Types Breakdown from visits
  const caseTypeBreakdown = useMemo(() => {
    // If year or month has visits, calculate based on selected year/month, or fallback to all visits
    const sourceVisits = monthVisits.length > 0 ? monthVisits : (yearVisits.length > 0 ? yearVisits : visits);
    const totalSource = sourceVisits.length;

    const map: Record<string, { count: number; category: string }> = {};
    sourceVisits.forEach((v) => {
      if (v.caseType) {
        if (!map[v.caseType]) {
          map[v.caseType] = { count: 0, category: v.caseCategory || 'Layanan Posbakum' };
        }
        map[v.caseType].count += 1;
      }
    });

    return Object.entries(map)
      .map(([name, item]) => ({
        name,
        category: item.category,
        count: item.count,
        percent: totalSource > 0 ? Math.round((item.count / totalSource) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [monthVisits, yearVisits, visits]);

  const handlePrint = () => {
    window.print();
  };

  const selectedMonthName = monthNames.find((m) => m.code === selectedMonth)?.full || 'Agustus';

  return (
    <div className="space-y-3.5 text-xs font-sans">
      {/* Header - High Density */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <BarChart3 className="w-5 h-5 text-emerald-700" />
            <span>STATISTIK & ANALITIK KUNJUNGAN</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Analisis volume kedatangan masyarakat, tren perkara, dan rekapitulasi bantuan hukum secara real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-2xs"
            title="Reset statistik & total kunjungan manual"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Reset Manual Statistik</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Period Selection Controls - High Density */}
      <div className="bg-white rounded-xl p-2.5 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
          {(['hari', 'minggu', 'bulan', 'tahun'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPeriodType(mode)}
              className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition ${
                periodType === mode
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mode === 'hari'
                ? 'Harian'
                : mode === 'minggu'
                ? 'Mingguan'
                : mode === 'bulan'
                ? 'Bulanan'
                : 'Tahunan'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 text-[11px]">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
            >
              {monthNames.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.full} {selectedYear}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-500 text-[11px]">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown - 12 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Column: Period Trend Breakdown (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl p-3.5 sm:p-4 shadow-xs border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  Rekapitulasi Kunjungan (Periode {periodType.toUpperCase()})
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {periodType === 'hari' || periodType === 'minggu' 
                  ? `Bulan ${selectedMonthName} ${selectedYear}`
                  : `Tahun ${selectedYear}`}
              </p>
            </div>
            <span className="font-mono text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Total: {periodType === 'tahun' ? yearVisits.length : monthVisits.length} Tamu
            </span>
          </div>

          {/* Conditional Visuals Based on Period Type */}
          {periodType === 'hari' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {dailyStats.map((item) => (
                <div key={item.label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="text-[10px] text-slate-500 font-semibold">{item.label}</div>
                  <div className="text-base font-black font-mono text-emerald-950 mt-0.5">{item.count}</div>
                  <div className="text-[10px] text-emerald-700 font-medium">Kunjungan</div>
                </div>
              ))}
            </div>
          )}

          {periodType === 'minggu' && (
            <div className="space-y-2">
              {weeklyStats.map((item) => (
                <div key={item.label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900">{item.label}</div>
                    <div className="text-[10px] text-slate-500">{selectedMonthName} {selectedYear}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-emerald-900">{item.count} Pemohon</div>
                    <div className="text-[10px] font-semibold text-slate-500">Terdaftar</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {periodType === 'bulan' && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {monthlyStats.map((item) => (
                <div
                  key={item.month}
                  className={`p-2 rounded-lg border transition ${
                    item.isCurrent
                      ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/40'
                      : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700">{item.fullName}</span>
                    {item.isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-base font-black font-mono text-slate-900 mt-0.5">
                    {item.count}
                  </div>
                  <span className="text-[9px] text-slate-400">Pemohon</span>
                </div>
              ))}
            </div>
          )}

          {periodType === 'tahun' && (
            <div className="space-y-2">
              {yearlyStats.map((item) => (
                <div key={item.year} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900">Tahun {item.year}</div>
                    <div className="text-[10px] text-slate-500">Akumulasi buku tamu digital</div>
                  </div>
                  <div className="text-base font-black font-mono text-emerald-900">{item.count.toLocaleString('id-ID')} Pemohon</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Case Types Detail Bar List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl p-3.5 sm:p-4 shadow-xs border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span>Distribusi Menurut Jenis Perkara</span>
              </h3>
              <p className="text-[11px] text-slate-400">Rincian permohonan hukum</p>
            </div>
            <span className="text-[10px] font-bold text-slate-500">
              {caseTypeBreakdown.length} Jenis
            </span>
          </div>

          <div className="space-y-2 pt-0.5 max-h-80 overflow-y-auto">
            {caseTypeBreakdown.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Belum ada perkara tercatat pada periode ini (Statistik = 0).
              </div>
            ) : (
              caseTypeBreakdown.map((item) => (
                <div key={item.name} className="space-y-0.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-semibold text-slate-800 truncate pr-2">
                      {item.name}
                    </span>
                    <div className="font-mono text-right shrink-0">
                      <span className="font-bold text-slate-900">{item.count}</span>
                      <span className="text-slate-400 text-[10px] ml-1">({item.percent}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(item.percent, 2)}%` }}
                      className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                    />
                  </div>
                </div>
              ))
            )}
          </div>
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
