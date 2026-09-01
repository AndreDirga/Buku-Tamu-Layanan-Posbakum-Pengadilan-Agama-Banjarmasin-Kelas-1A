import React, { useState, useMemo } from 'react';
import { Visit, CASE_CATEGORIES } from '../../types/posbakum';
import { 
  Search, 
  RotateCcw, 
  Eye, 
  Trash2,
  AlertTriangle,
  CheckSquare,
  Square,
  FileSpreadsheet, 
  ChevronRight,
  X,
  CheckCircle2,
  Calendar,
  Phone,
  Scale
} from 'lucide-react';

interface VisitsListProps {
  visits: Visit[];
  onViewDetail: (visit: Visit) => void;
  onNavigateToExport: () => void;
  onDeleteVisit: (visitId: string) => void;
  onDeleteMultipleVisits?: (visitIds: string[]) => void;
}

export const VisitsList: React.FC<VisitsListProps> = ({
  visits,
  onViewDetail,
  onNavigateToExport,
  onDeleteVisit,
  onDeleteMultipleVisits,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCaseType, setSelectedCaseType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modals for confirmation
  const [deleteTarget, setDeleteTarget] = useState<Visit | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Flatten all case types for dropdown
  const allCaseTypes = useMemo(() => {
    const list: string[] = [];
    CASE_CATEGORIES.forEach((cat) => {
      cat.types.forEach((t) => {
        if (!list.includes(t)) list.push(t);
      });
    });
    return list;
  }, []);

  // Filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      // Search query (name, visitNumber, whatsapp, email, caseType)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          v.name.toLowerCase().includes(query) ||
          v.visitNumber.toLowerCase().includes(query) ||
          v.whatsapp.toLowerCase().includes(query) ||
          v.email.toLowerCase().includes(query) ||
          v.caseType.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // Case type filter
      if (selectedCaseType !== 'ALL' && v.caseType !== selectedCaseType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && v.status !== selectedStatus) {
        return false;
      }

      // Date Range filter
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
  }, [visits, searchQuery, selectedCaseType, selectedStatus, startDate, endDate]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setSelectedCaseType('ALL');
    setSelectedStatus('ALL');
  };

  // Toggle single item selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle select all visible
  const handleSelectAllVisible = () => {
    const visibleIds = filteredVisits.map((v) => v.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const isAllVisibleSelected =
    filteredVisits.length > 0 &&
    filteredVisits.every((v) => selectedIds.includes(v.id));

  // Confirm Single Delete
  const handleConfirmSingleDelete = () => {
    if (!deleteTarget) return;
    const num = deleteTarget.visitNumber;
    onDeleteVisit(deleteTarget.id);
    setSelectedIds((prev) => prev.filter((id) => id !== deleteTarget.id));
    setDeleteTarget(null);
    setActionSuccessMsg(`Data kunjungan ${num} berhasil dihapus.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Confirm Bulk Delete
  const handleConfirmBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (onDeleteMultipleVisits) {
      onDeleteMultipleVisits(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteVisit(id));
    }
    const count = selectedIds.length;
    setSelectedIds([]);
    setShowBulkDeleteModal(false);
    setActionSuccessMsg(`${count} riwayat kunjungan terpilih berhasil dihapus.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const getStatusBadge = (status: Visit['status']) => {
    switch (status) {
      case 'Selesai':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Selesai
          </span>
        );
      case 'Sedang Dilayani':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Sedang Dilayani
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Menunggu
          </span>
        );
    }
  };

  return (
    <div className="space-y-3.5 text-xs font-sans">
      {/* Toast / Notification banner */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3 py-2 rounded-xl flex items-center justify-between text-xs font-medium animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>DATA KUNJUNGAN BUKU TAMU</span>
            <span className="text-[11px] font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300/60">
              {filteredVisits.length} Terpilih
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Database buku tamu Pos Bantuan Hukum PA Banjarmasin Kelas 1A
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk Delete Button when items selected */}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 animate-fadeIn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Terpilih ({selectedIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNavigateToExport}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export & Google Sheets</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar - High Density Inline */}
      <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200 space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              placeholder="Cari nama, No. Antrian, WA, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs font-medium transition"
            />
          </div>

          {/* Date Range: Start */}
          <div className="md:col-span-2">
            <input
              type="date"
              title="Dari Tanggal"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-700 transition"
            />
          </div>

          {/* Date Range: End */}
          <div className="md:col-span-2">
            <input
              type="date"
              title="Sampai Tanggal"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-700 transition"
            />
          </div>

          {/* Case Type Dropdown */}
          <div className="md:col-span-3">
            <select
              value={selectedCaseType}
              onChange={(e) => setSelectedCaseType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-xs text-slate-800 bg-white"
            >
              <option value="ALL">-- Semua Jenis Perkara --</option>
              {allCaseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="md:col-span-1 flex items-center">
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset Filter"
              className="w-full py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="md:hidden">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Data Table (High Density) */}
      <div className="hidden md:block bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-center w-8">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    title={isAllVisibleSelected ? 'Batalkan pilihan semua' : 'Pilih semua di halaman ini'}
                    className="text-slate-500 hover:text-emerald-700 transition"
                  >
                    {isAllVisibleSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th className="px-2 py-2 text-center w-8">No</th>
                <th className="px-3 py-2">No. Antrian</th>
                <th className="px-3 py-2">Tanggal & Waktu</th>
                <th className="px-3 py-2">Nama Penggugat / Pemohon</th>
                <th className="px-3 py-2">WhatsApp</th>
                <th className="px-3 py-2">Jenis Perkara</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data kunjungan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit, index) => {
                  const isChecked = selectedIds.includes(visit.id);
                  return (
                    <tr
                      key={visit.id}
                      className={`hover:bg-slate-50 transition group ${
                        isChecked ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(visit.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="px-3 py-1.5 font-mono font-bold text-slate-900">
                        {visit.visitNumber}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">
                        <div className="font-medium">{visit.dateDisplay}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{visit.timeDisplay}</div>
                      </td>
                      <td className="px-3 py-1.5 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <img
                            src={visit.selfieUrl}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                          <span>{visit.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 font-mono text-emerald-800 font-medium text-[11px]">
                        {visit.whatsapp}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="font-semibold text-slate-800 block">
                          {visit.caseType}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                          {visit.caseCategory}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {getStatusBadge(visit.status)}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onViewDetail(visit)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-bold text-[11px] transition border border-emerald-200"
                            title="Lihat detail berkas & tanda tangan"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(visit)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 rounded font-bold text-[11px] transition border border-rose-200"
                            title="Hapus riwayat kunjungan ini"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card List (Visible on Mobile) */}
      <div className="md:hidden space-y-2.5">
        {/* Mobile Select All helper */}
        {filteredVisits.length > 0 && (
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="flex items-center gap-2 text-slate-700 font-semibold"
            >
              {isAllVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-emerald-700" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>Pilih Semua ({filteredVisits.length})</span>
            </button>
            {selectedIds.length > 0 && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {selectedIds.length} dipilih
              </span>
            )}
          </div>
        )}

        {filteredVisits.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-slate-400 border border-slate-200 text-xs">
            Tidak ada data kunjungan yang sesuai dengan filter.
          </div>
        ) : (
          filteredVisits.map((visit) => {
            const isChecked = selectedIds.includes(visit.id);
            return (
              <div
                key={visit.id}
                className={`bg-white rounded-xl p-3 shadow-xs border transition space-y-2 ${
                  isChecked ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSelect(visit.id)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                    />
                    <img
                      src={visit.selfieUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{visit.name}</div>
                      <div className="font-mono text-[11px] font-bold text-emerald-800">
                        {visit.visitNumber}
                      </div>
                    </div>
                  </div>
                  <div>{getStatusBadge(visit.status)}</div>
                </div>

                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Penggugat/Pemohon:</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[180px]">{visit.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Jenis Perkara:</span>
                    <span className="font-semibold text-slate-800">{visit.caseType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Waktu:</span>
                    <span className="font-medium text-slate-600">
                      {visit.dateDisplay} ({visit.timeDisplay})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">WhatsApp:</span>
                    <span className="font-mono font-medium text-emerald-700">{visit.whatsapp}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onViewDetail(visit)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <span>Lihat Detail</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(visit)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold border border-rose-200 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 text-xs font-sans animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-950">
                  Konfirmasi Hapus Data Kunjungan
                </h3>
                <p className="text-[11px] text-rose-800/80 mt-0.5">
                  Tindakan ini akan menghapus riwayat buku tamu secara permanen dari sistem.
                </p>
              </div>
            </div>

            <div className="p-4 space-y-2.5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nomor Kunjungan:</span>
                  <span className="font-mono font-bold text-slate-900">{deleteTarget.visitNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nama Penggugat / Pemohon:</span>
                  <span className="font-bold text-slate-800">{deleteTarget.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jenis Perkara:</span>
                  <span className="font-semibold text-emerald-800">{deleteTarget.caseType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Waktu Kunjungan:</span>
                  <span className="text-slate-700">{deleteTarget.dateDisplay} ({deleteTarget.timeDisplay})</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Apakah Anda yakin ingin menghapus data kunjungan ini? Tindakan penghapusan akan dicatat pada Log Aktivitas Petugas.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSingleDelete}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 text-xs font-sans animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-rose-950">
                  Konfirmasi Hapus Massal ({selectedIds.length} Data)
                </h3>
                <p className="text-[11px] text-rose-800/80 mt-0.5">
                  Anda akan menghapus <span className="font-bold">{selectedIds.length} data kunjungan</span> terpilih.
                </p>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Semua berkas riwayat kunjungan yang dipilih beserta foto selfie dan tanda tangan terkait akan dihapus dari daftar. Pastikan Anda telah melakukan ekspor data jika diperlukan arsip cadangan.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-3 py-1.5 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus {selectedIds.length} Data Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
