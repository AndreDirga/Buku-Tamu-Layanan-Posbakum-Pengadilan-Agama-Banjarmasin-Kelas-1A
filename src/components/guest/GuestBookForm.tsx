import React, { useState, useEffect } from 'react';
import { CourtEmblem } from '../common/CourtEmblem';
import { LiveClock } from '../common/LiveClock';
import { CameraSelfie } from './CameraSelfie';
import { SignaturePad } from './SignaturePad';
import { CASE_CATEGORIES, OCCUPATIONS_LIST, Visit } from '../../types/posbakum';
import { saveVisit } from '../../services/storageService';
import { 
  User, 
  MapPin, 
  Mail, 
  Phone, 
  Briefcase, 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Loader2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface GuestBookFormProps {
  onSuccess: (savedVisit: Visit) => void;
  onBackToPortal?: () => void;
  qrTokenParam?: string;
}

export const GuestBookForm: React.FC<GuestBookFormProps> = ({
  onSuccess,
  onBackToPortal,
  qrTokenParam,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [ktpAddress, setKtpAddress] = useState('');
  const [domicileAddress, setDomicileAddress] = useState('');
  const [domicileSameAsKtp, setDomicileSameAsKtp] = useState(true);
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [occupation, setOccupation] = useState('');
  const [occupationOther, setOccupationOther] = useState('');
  const [caseCategoryId, setCaseCategoryId] = useState('');
  const [caseType, setCaseType] = useState('');
  const [caseTypeOther, setCaseTypeOther] = useState('');
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync Domicile Address when checkbox is checked
  useEffect(() => {
    if (domicileSameAsKtp) {
      setDomicileAddress(ktpAddress);
    }
  }, [ktpAddress, domicileSameAsKtp]);

  // Selected Category Object
  const selectedCategory = CASE_CATEGORIES.find((c) => c.id === caseCategoryId);

  // Normalize WhatsApp Number (e.g. 08123... or +628123... -> 08123...)
  const handleWhatsappChange = (val: string) => {
    let clean = val.replace(/[^\d+]/g, '');
    if (clean.startsWith('+62')) {
      clean = '0' + clean.slice(3);
    } else if (clean.startsWith('62')) {
      clean = '0' + clean.slice(2);
    }
    setWhatsapp(clean);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCaseCategoryId(e.target.value);
    setCaseType('');
    setCaseTypeOther('');
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setErrorMessage('Nama Penggugat / Pemohon wajib diisi.');
      return false;
    }
    if (!ktpAddress.trim()) {
      setErrorMessage('Alamat Sesuai KTP wajib diisi.');
      return false;
    }
    if (!domicileSameAsKtp && !domicileAddress.trim()) {
      setErrorMessage('Alamat Domisili wajib diisi.');
      return false;
    }
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMessage('Format Email tidak valid (contoh: nama@email.com).');
      return false;
    }
    if (!whatsapp.trim() || whatsapp.length < 9) {
      setErrorMessage('Nomor WhatsApp wajib diisi dengan benar (minimal 10 digit).');
      return false;
    }
    if (!occupation) {
      setErrorMessage('Pekerjaan wajib dipilih.');
      return false;
    }
    if (occupation === 'Lainnya' && !occupationOther.trim()) {
      setErrorMessage('Mohon sebutkan pekerjaan Anda.');
      return false;
    }
    if (!caseCategoryId) {
      setErrorMessage('Kategori Perkara wajib dipilih.');
      return false;
    }
    if (!caseType) {
      setErrorMessage('Jenis Perkara wajib dipilih.');
      return false;
    }
    if (caseType === 'Lainnya' && !caseTypeOther.trim()) {
      setErrorMessage('Mohon sebutkan jenis perkara/layanan lainnya.');
      return false;
    }
    if (!selfieUrl) {
      setErrorMessage('Foto selfie pengunjung wajib diambil.');
      return false;
    }
    if (!signatureUrl) {
      setErrorMessage('Tanda tangan digital wajib disimpan.');
      return false;
    }
    if (!agreeTerms) {
      setErrorMessage('Mohon centang pernyataan persetujuan kebenaran data.');
      return false;
    }

    setErrorMessage(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await new Promise((res) => setTimeout(res, 600));

      const finalDomicile = domicileSameAsKtp ? ktpAddress : domicileAddress;
      const categoryName = selectedCategory ? selectedCategory.name : caseCategoryId;

      const saved = await saveVisit({
        name: name.trim(),
        ktpAddress: ktpAddress.trim(),
        domicileAddress: finalDomicile.trim(),
        domicileSameAsKtp,
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        occupation,
        occupationOther: occupation === 'Lainnya' ? occupationOther.trim() : undefined,
        caseCategory: categoryName,
        caseType,
        caseTypeOther: caseType === 'Lainnya' ? caseTypeOther.trim() : undefined,
        selfieUrl: selfieUrl!,
        selfieFileName: '',
        signatureUrl: signatureUrl!,
        signatureFileName: '',
        qrToken: qrTokenParam || 'DIRECT-WEB',
        status: 'Menunggu',
        visitedAt: new Date().toISOString(),
        dateDisplay: '',
        timeDisplay: '',
      });

      onSuccess(saved);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Terjadi kendala saat menyimpan data. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-12 pt-3 px-3 sm:px-4 font-sans text-xs">
      <div className="max-w-xl mx-auto space-y-3">
        {/* Top Court Navigation Bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-600 px-0.5">
          <span className="flex items-center gap-1 font-semibold text-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Layanan Resmi Posbakum PA Banjarmasin Kelas 1A
          </span>
          {onBackToPortal && (
            <button
              type="button"
              onClick={onBackToPortal}
              className="flex items-center gap-1 text-slate-700 hover:text-slate-900 transition px-2 py-0.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 font-medium"
            >
              <ArrowLeft className="w-3 h-3 text-slate-500" />
              <span>Menu Awal</span>
            </button>
          )}
        </div>

        {/* Institutional Header Card - High Density */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <div className="flex flex-col items-center text-center space-y-2">
            <CourtEmblem size="lg" showText={false} className="justify-center" />
            
            <div>
              <div className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 text-[10px] font-extrabold uppercase tracking-wider border border-emerald-200 mb-0.5">
                PENGADILAN AGAMA BANJARMASIN KELAS 1A
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                BUKU TAMU LAYANAN POSBAKUM
              </h2>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                Lengkapi formulir untuk konsultasi hukum & bantuan pembuatan dokumen perkara gratis.
              </p>
            </div>

            {/* Server Real-time Timestamp Banner */}
            <div className="w-full pt-1">
              <LiveClock variant="card" />
            </div>

            {qrTokenParam && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-semibold text-amber-800">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Terhubung via Meja Layanan ({qrTokenParam})
              </div>
            )}
          </div>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-start gap-2 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-rose-900">Perhatian</div>
              <div className="text-[11px] text-rose-700">{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Main Guest Book Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Section 1: Identitas Pemohon */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                <div className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span>1. Data Identitas Pemohon</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">* Wajib diisi</span>
            </div>

            {/* Nama */}
            <div className="space-y-1">
              <label htmlFor="name-input" className="block text-[11px] font-semibold text-slate-700">
                Nama Penggugat / Pemohon <span className="text-rose-600">*</span>
              </label>
              <input
                id="name-input"
                type="text"
                required
                placeholder="Contoh: Ahmad Fauzi Rahman"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs font-medium transition placeholder:text-slate-400"
              />
              <p className="text-[10px] text-slate-400">
                Tulis nama lengkap sesuai Kartu Tanda Penduduk (KTP).
              </p>
            </div>

            {/* Alamat KTP */}
            <div className="space-y-1">
              <label htmlFor="ktp-address" className="block text-[11px] font-semibold text-slate-700">
                Alamat Sesuai KTP <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="ktp-address"
                required
                rows={2}
                placeholder="Jl. Ahmad Yani Km. 4,5 No. 12, Kel. Kebun Bunga, Banjarmasin"
                value={ktpAddress}
                onChange={(e) => setKtpAddress(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs transition placeholder:text-slate-400"
              />
            </div>

            {/* Checkbox Alamat Domisili */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={domicileSameAsKtp}
                  onChange={(e) => setDomicileSameAsKtp(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5 transition cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">
                    Alamat domisili saat ini sesuai dengan KTP
                  </span>
                </div>
              </label>

              {/* Alamat Domisili (If different) */}
              {!domicileSameAsKtp && (
                <div className="pt-1.5 border-t border-slate-200 space-y-1 animate-fadeIn">
                  <label htmlFor="domicile-address" className="block text-[11px] font-semibold text-slate-700">
                    Alamat Domisili Saat Ini <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    id="domicile-address"
                    required={!domicileSameAsKtp}
                    rows={2}
                    placeholder="Tuliskan alamat tempat tinggal saat ini"
                    value={domicileAddress}
                    onChange={(e) => setDomicileAddress(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs transition"
                  />
                </div>
              )}
            </div>

            {/* Kontak & Pekerjaan (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* WhatsApp */}
              <div className="space-y-1">
                <label htmlFor="whatsapp-input" className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  Nomor WhatsApp <span className="text-rose-600">*</span>
                </label>
                <input
                  id="whatsapp-input"
                  type="tel"
                  required
                  placeholder="081234567890"
                  value={whatsapp}
                  onChange={(e) => handleWhatsappChange(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs font-medium transition placeholder:text-slate-400"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label htmlFor="email-input" className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-emerald-600" />
                  Alamat Email <span className="text-rose-600">*</span>
                </label>
                <input
                  id="email-input"
                  type="email"
                  required
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs transition placeholder:text-slate-400"
                />
              </div>

              {/* Pekerjaan */}
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="occupation-select" className="block text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-emerald-600" />
                  Pekerjaan <span className="text-rose-600">*</span>
                </label>
                <select
                  id="occupation-select"
                  required
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs transition bg-white"
                >
                  <option value="">-- Pilih Pekerjaan --</option>
                  {OCCUPATIONS_LIST.map((occ) => (
                    <option key={occ} value={occ}>
                      {occ}
                    </option>
                  ))}
                </select>

                {occupation === 'Lainnya' && (
                  <div className="pt-1.5 space-y-1">
                    <label htmlFor="occupation-other" className="block text-[10px] font-semibold text-slate-700">
                      Sebutkan Pekerjaan Anda: <span className="text-rose-600">*</span>
                    </label>
                    <input
                      id="occupation-other"
                      type="text"
                      required
                      placeholder="Tuliskan profesi/pekerjaan Anda..."
                      value={occupationOther}
                      onChange={(e) => setOccupationOther(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Jenis Perkara (Cascading Dropdown) */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs">
                <div className="w-6 h-6 rounded-lg bg-emerald-600/10 text-emerald-700 flex items-center justify-center">
                  <Scale className="w-3.5 h-3.5" />
                </div>
                <span>2. Kategori & Jenis Perkara</span>
              </div>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                Dropdown Bertingkat
              </span>
            </div>

            {/* Step 1: Kategori */}
            <div className="space-y-1">
              <label htmlFor="category-select" className="block text-[11px] font-semibold text-slate-700">
                Pilih Kategori Perkara <span className="text-rose-600">*</span>
              </label>
              <select
                id="category-select"
                required
                value={caseCategoryId}
                onChange={handleCategoryChange}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs font-semibold transition bg-white"
              >
                <option value="">-- [ 1. Pilih Kategori Perkara ] --</option>
                {CASE_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Jenis Perkara */}
            <div className="space-y-1">
              <label htmlFor="case-type-select" className="block text-[11px] font-semibold text-slate-700">
                Pilih Jenis Perkara / Permohonan <span className="text-rose-600">*</span>
              </label>
              <select
                id="case-type-select"
                required
                disabled={!caseCategoryId}
                value={caseType}
                onChange={(e) => setCaseType(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-lg border text-xs font-medium transition bg-white ${
                  caseCategoryId
                    ? 'border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900'
                    : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <option value="">
                  {caseCategoryId
                    ? '-- [ 2. Pilih Jenis Perkara Spesifik ] --'
                    : '-- Harap pilih kategori di atas terlebih dahulu --'}
                </option>
                {selectedCategory?.types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* If Jenis Perkara is Lainnya */}
            {caseType === 'Lainnya' && (
              <div className="pt-1.5 space-y-1 animate-fadeIn">
                <label htmlFor="case-type-other" className="block text-[10px] font-semibold text-slate-700">
                  Sebutkan Jenis Layanan / Perkara Lainnya: <span className="text-rose-600">*</span>
                </label>
                <input
                  id="case-type-other"
                  type="text"
                  required
                  placeholder="Contoh: Konsultasi permohonan sita jaminan..."
                  value={caseTypeOther}
                  onChange={(e) => setCaseTypeOther(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-slate-900 text-xs"
                />
              </div>
            )}
          </div>

          {/* Section 3: Selfie Kamera HP */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <CameraSelfie
              photoDataUrl={selfieUrl}
              onPhotoCaptured={(url) => setSelfieUrl(url)}
              onPhotoCleared={() => setSelfieUrl(null)}
            />
          </div>

          {/* Section 4: Tanda Tangan Digital */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
            <SignaturePad
              signatureDataUrl={signatureUrl}
              onSignatureSaved={(url) => setSignatureUrl(url)}
              onSignatureCleared={() => setSignatureUrl(null)}
            />
          </div>

          {/* Section 5: Persetujuan & Submit */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-md border border-slate-800 space-y-3">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 border-white/40 mt-0.5 cursor-pointer"
              />
              <span className="text-[11px] font-medium text-slate-300 leading-relaxed">
                Saya menyatakan bahwa data yang diisi adalah benar, akurat, dan dapat digunakan untuk keperluan pencatatan administrasi Posbakum Pengadilan Agama Banjarmasin Kelas 1A.
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan data kunjungan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SIMPAN BUKU TAMU</span>
                </>
              )}
            </button>

            <div className="text-center text-[10px] text-slate-400">
              Data terlindungi oleh sistem administrasi Pengadilan Agama Banjarmasin.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
