export interface Visit {
  id: string;
  visitNumber: string; // e.g. KJG-20260831-0001
  visitedAt: string; // ISO date string
  dateDisplay: string; // e.g. "31 Agustus 2026"
  timeDisplay: string; // e.g. "10:35 WITA"
  name: string; // Nama Penggugat/Pemohon/Tergugat/Termohon
  ktpAddress: string;
  domicileAddress: string;
  domicileSameAsKtp: boolean;
  email: string;
  whatsapp: string;
  occupation: string;
  occupationOther?: string;
  caseCategory: string;
  caseType: string;
  caseTypeOther?: string;
  selfieUrl: string; // Base64 data URL
  selfieFileName: string; // e.g. KJG-20260831-0001-selfie.jpg
  signatureUrl: string; // Base64 PNG data URL
  signatureFileName: string; // e.g. KJG-20260831-0001-signature.png
  qrToken?: string;
  deskLocation?: string;
  officerName?: string;
  status: 'Menunggu' | 'Sedang Dilayani' | 'Selesai';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CaseCategory {
  id: string;
  code: string;
  name: string;
  types: string[];
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  description: string;
  ipAddress: string;
  badgeColor?: 'emerald' | 'blue' | 'amber' | 'purple' | 'red';
}

export interface QrToken {
  id: string;
  name: string;
  location: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  scanCount: number;
}

export interface OfficerUser {
  id: string;
  name: string;
  username: string;
  role: 'Administrator' | 'Petugas Posbakum' | 'Advokat Piket' | 'Supervisor';
  nip?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export const OCCUPATIONS_LIST = [
  'PNS',
  'PPPK',
  'TNI',
  'Polri',
  'Pegawai Swasta',
  'Wiraswasta',
  'Petani',
  'Nelayan',
  'Buruh',
  'Ibu Rumah Tangga',
  'Pelajar/Mahasiswa',
  'Tidak Bekerja',
  'Lainnya',
] as const;

export const CASE_CATEGORIES: CaseCategory[] = [
  {
    id: 'perkawinan',
    code: 'A',
    name: 'A. Perkara Perkawinan & Perceraian',
    types: [
      'Cerai Gugat',
      'Cerai Talak',
      'Gugatan Itsbat Nikah (GIN)',
      'Itsbat Nikah',
      'Wali Adhol',
      'Dispensasi Kawin',
      'Perbaikan Akta Nikah',
      'Perbaikan Akta Cerai',
      'Perubahan Permohonan/Gugatan Cerai Pasca Mediasi',
    ],
  },
  {
    id: 'anak',
    code: 'B',
    name: 'B. Perkara Anak & Perwalian',
    types: [
      'Perwalian Anak',
      'Perwalian Selain Orang Tua',
      'Pencabutan Kekuasaan Orang Tua',
      'Asal Usul Anak',
      'Hak Asuh Anak',
      'Nafkah Anak',
    ],
  },
  {
    id: 'waris',
    code: 'C',
    name: 'C. Perkara Waris & Harta',
    types: [
      'Gugatan Waris',
      'Harta Bersama',
      'Mafqud',
      'Penetapan Ahli Waris',
    ],
  },
  {
    id: 'tahapan',
    code: 'D',
    name: 'D. Tahapan/Jawaban dalam Perkara',
    types: [
      'Jawaban Termohon',
      'Replik/Duplik',
      'Kesimpulan Penggugat/Pemohon/Termohon',
      'Verzet',
    ],
  },
  {
    id: 'lainnya',
    code: 'E',
    name: 'E. Layanan Lainnya',
    types: [
      'Konsultasi Hukum Posbakum',
      'Pembuatan Draf Gugatan/Permohonan',
      'Informasi Syarat Perkara & Prodeo',
      'Lainnya',
    ],
  },
];
