import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { CourtEmblem } from '../common/CourtEmblem';
import { QrToken } from '../../types/posbakum';
import { 
  getStoredQrTokens, 
  addQrToken, 
  toggleQrTokenStatus, 
  logActivity 
} from '../../services/storageService';
import { POSBAKUM_OFFICIAL_QR_IMAGE, POSBAKUM_OFFICIAL_QR_URL } from '../../assets/qrCodeData';
import { 
  QrCode as QrIcon, 
  Printer, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Check, 
  Layers,
  Download,
  ShieldCheck
} from 'lucide-react';

interface QrCodeManagerProps {
  onOpenGuestWithToken: (token?: string) => void;
}

export const QrCodeManager: React.FC<QrCodeManagerProps> = ({ onOpenGuestWithToken }) => {
  const [tokens, setTokens] = useState<QrToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<QrToken | null>(null);
  const [useOfficialQr, setUseOfficialQr] = useState<boolean>(true);
  const [dynamicQrUrl, setDynamicQrUrl] = useState<string>('');
  const [newDeskName, setNewDeskName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loaded = getStoredQrTokens();
    setTokens(loaded);
    if (loaded.length > 0) {
      setSelectedToken(loaded[0]);
    }
  }, []);

  // Base URL for dynamic QR
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : POSBAKUM_OFFICIAL_QR_URL;

  // Active target URL
  const targetUrl = useOfficialQr 
    ? POSBAKUM_OFFICIAL_QR_URL 
    : `${currentOrigin}?t=${selectedToken ? selectedToken.token : 'POSBAKUM-MEJA-1'}&mode=tamu`;

  // Active displayed QR image (use official uploaded QR image when in official mode)
  const currentQrImage = useOfficialQr ? POSBAKUM_OFFICIAL_QR_IMAGE : (dynamicQrUrl || POSBAKUM_OFFICIAL_QR_IMAGE);

  // Generate dynamic QR Code when switching to custom desk token
  useEffect(() => {
    if (!useOfficialQr) {
      QRCode.toDataURL(targetUrl, {
        width: 600,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'Q',
      })
        .then((url) => {
          setDynamicQrUrl(url);
        })
        .catch((err) => {
          console.error('Error generating dynamic QR:', err);
        });
    }
  }, [targetUrl, useOfficialQr]);

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeskName.trim() || !newLocation.trim()) return;

    const created = await addQrToken(newDeskName.trim(), newLocation.trim());
    const updated = getStoredQrTokens();
    setTokens(updated);
    setSelectedToken(created);
    setUseOfficialQr(false);
    setNewDeskName('');
    setNewLocation('');
    setShowAddForm(false);

    logActivity({
      userId: 'officer',
      userName: 'Petugas Posbakum',
      userRole: 'Petugas',
      action: 'TAMBAH_QR',
      description: `Membuat token QR meja baru: ${created.name} (${created.token})`,
      badgeColor: 'emerald',
    });
  };

  const handleToggleStatus = async (id: string) => {
    await toggleQrTokenStatus(id);
    const updated = getStoredQrTokens();
    setTokens(updated);
    if (selectedToken && selectedToken.id === id) {
      const fresh = updated.find((t) => t.id === id);
      if (fresh) setSelectedToken(fresh);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    const link = document.createElement('a');
    link.href = currentQrImage;
    link.download = `qrcode-posbakum-pa-banjarmasin-${useOfficialQr ? 'resmi' : selectedToken?.token || 'meja'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintStandee = () => {
    window.print();
  };

  return (
    <div className="space-y-3.5 text-xs font-sans">
      {/* Header - High Density */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
            <QrIcon className="w-5 h-5 text-emerald-700" />
            <span>QR CODE BUKU TAMU PETUGAS</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Kelola & cetak kode QR resmi untuk ditempel pada meja konsultasi dan loket PTSP
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadQr}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Gambar QR (.PNG)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintStandee}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Standee Meja</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Column: QR Code Standee Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Printable Poster / Desk Standee Preview */}
          <div 
            id="printable-qr-standee"
            className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border-2 border-emerald-500/40 text-center space-y-4 relative overflow-hidden"
          >
            {/* Top Border Accent */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-800 via-emerald-600 to-amber-500" />

            {/* Emblem and Court Header */}
            <div className="flex flex-col items-center pt-1">
              <CourtEmblem size="lg" showText={false} className="justify-center text-center" />
              <div className="mt-1.5 text-[10px] font-extrabold tracking-wider uppercase text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                BUKU TAMU DIGITAL POSBAKUM
              </div>
              <h3 className="text-base font-black text-slate-900 mt-1">
                PENGADILAN AGAMA BANJARMASIN KELAS 1A
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {useOfficialQr 
                  ? 'Loket Pelayanan Terpadu Satu Pintu (PTSP) & Meja Posbakum' 
                  : (selectedToken ? selectedToken.name : 'Meja Layanan Pos Bantuan Hukum')}
              </p>
            </div>

            {/* Big QR Code Display */}
            <div className="relative inline-block p-4 bg-white rounded-2xl border-2 border-emerald-800/20 shadow-xs">
              <img
                src={currentQrImage}
                alt="QR Code Buku Tamu Posbakum"
                className="w-48 h-48 sm:w-60 sm:h-60 object-contain mx-auto transition-transform hover:scale-105 duration-200"
              />
              <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-700" />
                <span>QR Code Resmi Terverifikasi</span>
              </div>
            </div>

            {/* Instruction Text */}
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900">
                Arahkan Kamera HP untuk Mengisi Buku Tamu
              </h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Buka aplikasi kamera atau QR Scanner di HP Anda dan arahkan ke kode QR di atas untuk membuka formulir pendaftaran Posbakum.
              </p>
            </div>

            {/* QR Metadata Footer */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-left text-xs">
              <div className="truncate pr-2">
                <div className="text-[9px] font-bold uppercase text-slate-400">Target URL Buku Tamu:</div>
                <div className="font-mono text-emerald-800 truncate font-semibold text-[11px]">
                  {targetUrl}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition"
                  title="Salin URL"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenGuestWithToken(useOfficialQr ? undefined : selectedToken?.token)}
                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-emerald-800 transition"
                  title="Buka Form Pengunjung"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Desk Tokens Manager & Config (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Official QR Mode Selector */}
          <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-2.5">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <QrIcon className="w-3.5 h-3.5 text-emerald-700" />
              <span>Pilihan Kode QR</span>
            </div>
            
            <div 
              onClick={() => setUseOfficialQr(true)}
              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                useOfficialQr 
                  ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20' 
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-0.5">
                <div className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                  <span>QR Code Utama / Standar</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[9px] font-bold">
                    Aktif
                  </span>
                </div>
                <div className="text-[10px] text-slate-600">
                  Menggunakan file kode QR resmi utama aplikasi
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-emerald-600 flex items-center justify-center">
                {useOfficialQr && <div className="w-2 h-2 bg-emerald-600 rounded-full" />}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Daftar Meja / Lokasi Khusus</span>
                </h3>
                <p className="text-[11px] text-slate-400">Pilih meja untuk QR khusus per lokasi</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah Meja</span>
              </button>
            </div>

            {/* Add New Desk Form */}
            {showAddForm && (
              <form onSubmit={handleCreateToken} className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-emerald-950">Tambah Lokasi Meja QR</div>
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Nama Meja (Contoh: Meja Layanan 3)"
                    value={newDeskName}
                    onChange={(e) => setNewDeskName(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-white rounded-lg border border-slate-300"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    required
                    placeholder="Lokasi (Contoh: Ruang Mediasi Posbakum)"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs bg-white rounded-lg border border-slate-300"
                  />
                </div>
                <div className="flex justify-end gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800"
                  >
                    Simpan QR
                  </button>
                </div>
              </form>
            )}

            {/* Tokens List */}
            <div className="space-y-2">
              {tokens.map((tokenItem) => {
                const isSelected = !useOfficialQr && selectedToken?.id === tokenItem.id;
                return (
                  <div
                    key={tokenItem.id}
                    onClick={() => {
                      setSelectedToken(tokenItem);
                      setUseOfficialQr(false);
                    }}
                    className={`p-2.5 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-500/30'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{tokenItem.name}</span>
                        {tokenItem.isActive ? (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-bold">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">{tokenItem.location}</div>
                      <div className="font-mono text-[10px] text-emerald-800 font-semibold">
                        Token: {tokenItem.token}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(tokenItem.id);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700"
                      title={tokenItem.isActive ? 'Nonaktifkan QR ini' : 'Aktifkan QR ini'}
                    >
                      {tokenItem.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 space-y-1">
            <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Keunggulan Kode QR Resmi
            </div>
            <p className="text-[10px] leading-relaxed text-slate-500">
              Kode QR ini dapat dicetak langsung atau diunduh format resolusi tinggi (PNG/SVG) untuk ditempel pada meja konsultasi dan loket PTSP agar masyarakat dapat memindai buku tamu dengan cepat.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

