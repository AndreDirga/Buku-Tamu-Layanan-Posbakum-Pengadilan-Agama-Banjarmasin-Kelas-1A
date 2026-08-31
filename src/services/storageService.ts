import { Visit, ActivityLog, QrToken, OfficerUser, CASE_CATEGORIES } from '../types/posbakum';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  writeBatch
} from 'firebase/firestore';

const STORAGE_KEY_VISITS = 'pabjm_posbakum_visits_v1';
const STORAGE_KEY_LOGS = 'pabjm_posbakum_logs_v1';
const STORAGE_KEY_QR = 'pabjm_posbakum_qr_v2';
const STORAGE_KEY_AUTH = 'pabjm_posbakum_auth_v2';

// Sample signature SVG converted to data URL for sample data
const SAMPLE_SIGNATURE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><path d="M 30 90 Q 70 20 110 80 T 170 60 Q 210 120 270 70" fill="none" stroke="%231e293b" stroke-width="3" stroke-linecap="round"/><path d="M 90 110 L 220 110" fill="none" stroke="%231e293b" stroke-width="2" stroke-linecap="round"/></svg>`;

const SAMPLE_SELFIE_SVG = (initials: string, bg: string = '%23059669') => 
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="${bg}"/><circle cx="100" cy="75" r="40" fill="%23ffffff" opacity="0.9"/><path d="M 35 175 C 35 130, 165 130, 165 175 Z" fill="%23ffffff" opacity="0.9"/><text x="100" y="85" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="${bg}" text-anchor="middle">${initials}</text></svg>`;

export const INITIAL_OFFICER: OfficerUser = {
  id: 'usr-001',
  name: 'Admin',
  username: 'posbakumbjm',
  role: 'Petugas Posbakum',
  nip: '19880512 201403 1 002',
  avatarUrl: '',
};

export const INITIAL_QR_TOKENS: QrToken[] = [
  {
    id: 'qr-01',
    name: 'Meja 1',
    location: 'Ruang Posbakum Meja 01',
    token: 'POSBAKUM-MEJA-1',
    isActive: true,
    createdAt: '2026-08-01 08:00:00',
    scanCount: 245,
  },
];

export const INITIAL_VISITS: Visit[] = [
  {
    id: 'vst-001',
    visitNumber: 'KJG-20260831-0001',
    visitedAt: '2026-08-31T08:35:00',
    dateDisplay: '31 Agustus 2026',
    timeDisplay: '08:35 WITA',
    name: 'Ahmad Fauzi Rahman',
    ktpAddress: 'Jl. Ahmad Yani Km. 4,5 No. 12, Kel. Kebun Bunga, Kec. Banjarmasin Timur',
    domicileAddress: 'Jl. Ahmad Yani Km. 4,5 No. 12, Kel. Kebun Bunga, Kec. Banjarmasin Timur',
    domicileSameAsKtp: true,
    email: 'ahmad.fauzi@gmail.com',
    whatsapp: '081250123456',
    occupation: 'Wiraswasta',
    caseCategory: 'A. Perkara Perkawinan & Perceraian',
    caseType: 'Cerai Gugat',
    selfieUrl: SAMPLE_SELFIE_SVG('AF', '%230284c7'),
    selfieFileName: 'KJG-20260831-0001-selfie.jpg',
    signatureUrl: SAMPLE_SIGNATURE_SVG,
    signatureFileName: 'KJG-20260831-0001-signature.png',
    deskLocation: 'Ruang Posbakum Meja 01',
    officerName: 'Admin',
    status: 'Selesai',
    notes: 'Konsultasi draf surat gugatan cerai dan lampiran bukti.',
    createdAt: '2026-08-31T08:35:00',
  },
  {
    id: 'vst-002',
    visitNumber: 'KJG-20260831-0002',
    visitedAt: '2026-08-31T09:15:00',
    dateDisplay: '31 Agustus 2026',
    timeDisplay: '09:15 WITA',
    name: 'Siti Nurhaliza binti Mansyur',
    ktpAddress: 'Jl. Belitung Darat Gg. Simpang Belina No. 8, Banjarmasin Barat',
    domicileAddress: 'Jl. Pangeran Hidayatullah Komplek Timur Perdana No. 14, Banjarmasin Utara',
    domicileSameAsKtp: false,
    email: 'siti.nurhaliza.bjm@yahoo.com',
    whatsapp: '085751998877',
    occupation: 'Ibu Rumah Tangga',
    caseCategory: 'A. Perkara Perkawinan & Perceraian',
    caseType: 'Gugatan Itsbat Nikah (GIN)',
    selfieUrl: SAMPLE_SELFIE_SVG('SN', '%23059669'),
    selfieFileName: 'KJG-20260831-0002-selfie.jpg',
    signatureUrl: SAMPLE_SIGNATURE_SVG,
    signatureFileName: 'KJG-20260831-0002-signature.png',
    deskLocation: 'Ruang Posbakum Meja 01',
    officerName: 'Admin',
    status: 'Sedang Dilayani',
    notes: 'Permohonan pengesahan nikah sirri tahun 2018.',
    createdAt: '2026-08-31T09:15:00',
  },
  {
    id: 'vst-003',
    visitNumber: 'KJG-20260831-0003',
    visitedAt: '2026-08-31T10:10:00',
    dateDisplay: '31 Agustus 2026',
    timeDisplay: '10:10 WITA',
    name: 'M. Ruslan Effendi',
    ktpAddress: 'Jl. Sultan Adam Komplek Taekwondo Permai Jalur 3 No. 45, Banjarmasin Utara',
    domicileAddress: 'Jl. Sultan Adam Komplek Taekwondo Permai Jalur 3 No. 45, Banjarmasin Utara',
    domicileSameAsKtp: true,
    email: 'ruslan.effendi99@gmail.com',
    whatsapp: '081348002233',
    occupation: 'PNS',
    caseCategory: 'C. Perkara Waris & Harta',
    caseType: 'Penetapan Ahli Waris',
    selfieUrl: SAMPLE_SELFIE_SVG('RE', '%237c3aed'),
    selfieFileName: 'KJG-20260831-0003-selfie.jpg',
    signatureUrl: SAMPLE_SIGNATURE_SVG,
    signatureFileName: 'KJG-20260831-0003-signature.png',
    deskLocation: 'Ruang Posbakum Meja 01',
    officerName: 'Admin',
    status: 'Menunggu',
    createdAt: '2026-08-31T10:10:00',
  },
  {
    id: 'vst-004',
    visitNumber: 'KJG-20260830-0012',
    visitedAt: '2026-08-30T11:20:00',
    dateDisplay: '30 Agustus 2026',
    timeDisplay: '11:20 WITA',
    name: 'Rahmawati Putri',
    ktpAddress: 'Jl. Veteran Gg. 5 No. 20, Kel. Sungai Bilu, Kec. Banjarmasin Timur',
    domicileAddress: 'Jl. Veteran Gg. 5 No. 20, Kel. Sungai Bilu, Kec. Banjarmasin Timur',
    domicileSameAsKtp: true,
    email: 'rahma.putri@gmail.com',
    whatsapp: '082155443322',
    occupation: 'Pegawai Swasta',
    caseCategory: 'B. Perkara Anak & Perwalian',
    caseType: 'Hak Asuh Anak',
    selfieUrl: SAMPLE_SELFIE_SVG('RP', '%23db2777'),
    selfieFileName: 'KJG-20260830-0012-selfie.jpg',
    signatureUrl: SAMPLE_SIGNATURE_SVG,
    signatureFileName: 'KJG-20260830-0012-signature.png',
    deskLocation: 'Ruang Posbakum Meja 01',
    status: 'Selesai',
    notes: 'Konsultasi hadhanah pasca putusan perceraian.',
    createdAt: '2026-08-30T11:20:00',
  }
];

const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-08-31 08:30:15',
    userId: 'usr-001',
    userName: 'Admin',
    userRole: 'Petugas Posbakum',
    action: 'LOGIN',
    description: 'Petugas berhasil login ke Portal Posbakum',
    ipAddress: '192.168.10.45',
    badgeColor: 'emerald',
  },
  {
    id: 'log-002',
    timestamp: '2026-08-31 08:35:10',
    userId: 'system',
    userName: 'Sistem Publik',
    userRole: 'Pengunjung',
    action: 'TAMBAH_KUNJUNGAN',
    description: 'Pengunjung mengisi buku tamu: KJG-20260831-0001 (Ahmad Fauzi Rahman)',
    ipAddress: '180.252.88.14',
    badgeColor: 'blue',
  }
];

// Helper to get local cache
export const getStoredVisits = (): Visit[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(INITIAL_VISITS));
      return INITIAL_VISITS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load visits from localStorage', err);
    return INITIAL_VISITS;
  }
};

// Real-time Firestore synchronization for Visits collection
export const subscribeToVisits = (callback: (visits: Visit[]) => void): (() => void) => {
  try {
    const visitsCol = collection(db, 'visits');
    const q = query(visitsCol, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Visit[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Visit);
          });
          // Update local cache
          localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(list));
          callback(list);
        } else {
          // If Firestore is empty, seed initial data to Firestore
          seedInitialVisitsToFirestore().then((seeded) => {
            if (seeded.length > 0) {
              callback(seeded);
            } else {
              callback(getStoredVisits());
            }
          });
        }
      },
      (error) => {
        console.warn('Firestore visits snapshot warning/fallback to cache:', error);
        callback(getStoredVisits());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Error setting up visits subscription:', err);
    callback(getStoredVisits());
    return () => {};
  }
};

// Seed initial visits to Firestore if collection is empty
const seedInitialVisitsToFirestore = async (): Promise<Visit[]> => {
  try {
    const cached = getStoredVisits();
    const toSeed = cached.length > 0 ? cached : INITIAL_VISITS;
    const batch = writeBatch(db);
    
    toSeed.forEach((v) => {
      const docRef = doc(db, 'visits', v.id);
      batch.set(docRef, v);
    });

    await batch.commit();
    return toSeed;
  } catch (e) {
    console.warn('Could not seed initial data to Firestore:', e);
    return [];
  }
};

// Save a new visit permanently to Cloud Firestore and local storage
export const saveVisit = async (
  newVisitData: Omit<Visit, 'id' | 'visitNumber' | 'createdAt' | 'status'> & { status?: Visit['status'] }
): Promise<Visit> => {
  const visits = getStoredVisits();
  const now = new Date();
  
  // Date format YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Find visits on same date to generate sequential NNNN
  const todayPrefix = `KJG-${dateStr}-`;
  const todaysVisits = visits.filter(v => v.visitNumber && v.visitNumber.startsWith(todayPrefix));
  const nextSeq = todaysVisits.length + 1;
  const visitNumber = `${todayPrefix}${String(nextSeq).padStart(4, '0')}`;

  // Formatted date & time in Indonesian
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayName = dayNames[now.getDay()];
  const monthName = monthNames[now.getMonth()];
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const dateDisplay = `${dayName}, ${now.getDate()} ${monthName} ${year}`;
  const timeDisplay = `${hours}:${minutes} WITA`;

  const visitRecord: Visit = {
    ...newVisitData,
    id: `vst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    visitNumber,
    visitedAt: now.toISOString(),
    dateDisplay,
    timeDisplay,
    selfieFileName: `${visitNumber}-selfie.jpg`,
    signatureFileName: `${visitNumber}-signature.png`,
    status: newVisitData.status || 'Menunggu',
    createdAt: now.toISOString(),
  };

  // 1. Update local cache immediately for zero latency
  const updated = [visitRecord, ...visits];
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(updated));

  // 2. Persist permanently to Cloud Firestore
  try {
    const docRef = doc(db, 'visits', visitRecord.id);
    await setDoc(docRef, visitRecord);
  } catch (err) {
    console.error('Error saving visit to Cloud Firestore:', err);
  }

  // 3. Log activity permanently
  logActivity({
    action: 'TAMBAH_KUNJUNGAN',
    description: `Buku tamu terdaftar permanen: ${visitNumber} (${visitRecord.name} - ${visitRecord.caseType})`,
    userRole: 'Pengunjung',
    userName: 'Sistem Publik',
    userId: 'public-guest',
    badgeColor: 'blue',
  });

  return visitRecord;
};

// Update visit status / notes by Authorized Admin/Officer
export const updateVisitStatus = async (
  visitId: string, 
  status: Visit['status'], 
  notes?: string,
  officerName?: string
): Promise<Visit | null> => {
  const visits = getStoredVisits();
  const index = visits.findIndex(v => v.id === visitId);
  if (index === -1) return null;

  const nowIso = new Date().toISOString();
  visits[index].status = status;
  if (notes !== undefined) {
    visits[index].notes = notes;
  }
  visits[index].updatedAt = nowIso;
  if (officerName) {
    visits[index].officerName = officerName;
  }

  // Local storage update
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visits));

  // Cloud Firestore permanent update
  try {
    const docRef = doc(db, 'visits', visitId);
    const payload: Partial<Visit> = {
      status,
      updatedAt: nowIso,
    };
    if (notes !== undefined) payload.notes = notes;
    if (officerName) payload.officerName = officerName;

    await updateDoc(docRef, payload);
  } catch (err) {
    console.error('Failed to update visit in Firestore:', err);
  }

  return visits[index];
};

// Delete single visit by Authorized Officer/Admin
export const deleteVisit = async (visitId: string, deletedByName?: string): Promise<boolean> => {
  const visits = getStoredVisits();
  const target = visits.find((v) => v.id === visitId);
  if (!target) return false;

  // Local cache update
  const updated = visits.filter((v) => v.id !== visitId);
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(updated));

  // Cloud Firestore permanent deletion
  try {
    const docRef = doc(db, 'visits', visitId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Failed to delete visit in Firestore:', err);
  }

  logActivity({
    userId: 'officer-admin',
    userName: deletedByName || 'Admin',
    userRole: 'Petugas Posbakum',
    action: 'HAPUS_KUNJUNGAN',
    description: `Menghapus data kunjungan: ${target.visitNumber} (${target.name} - ${target.caseType})`,
    badgeColor: 'red',
  });

  return true;
};

// Delete multiple visits by Authorized Officer/Admin
export const deleteMultipleVisits = async (visitIds: string[], deletedByName?: string): Promise<number> => {
  const visits = getStoredVisits();
  const countBefore = visits.length;
  const updated = visits.filter((v) => !visitIds.includes(v.id));
  const deletedCount = countBefore - updated.length;

  if (deletedCount > 0) {
    // Local cache update
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(updated));

    // Cloud Firestore batch delete
    try {
      const batch = writeBatch(db);
      visitIds.forEach((id) => {
        const docRef = doc(db, 'visits', id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to batch delete visits in Firestore:', err);
    }

    logActivity({
      userId: 'officer-admin',
      userName: deletedByName || 'Admin',
      userRole: 'Petugas Posbakum',
      action: 'HAPUS_KUNJUNGAN',
      description: `Menghapus ${deletedCount} riwayat kunjungan secara massal`,
      badgeColor: 'red',
    });
  }

  return deletedCount;
};

// Reset / Clear all visits data completely (Mulai dari 0)
export const clearAllVisits = async (deletedByName?: string): Promise<number> => {
  const visits = getStoredVisits();
  const totalCount = visits.length;

  // Clear local storage
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify([]));

  // Batch delete all in Cloud Firestore
  try {
    const visitsCol = collection(db, 'visits');
    const snapshot = await getDocs(visitsCol);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Failed to clear all visits in Firestore:', err);
  }

  logActivity({
    userId: 'officer-admin',
    userName: deletedByName || 'Admin',
    userRole: 'Petugas Posbakum',
    action: 'RESET_STATISTIK_KUNJUNGAN',
    description: `Mereset total kunjungan dan seluruh statistik (menghapus ${totalCount} data)`,
    badgeColor: 'red',
  });

  return totalCount;
};

// Reset / Clear visits by specific period (hari, bulan, atau tahun)
export const clearVisitsByPeriod = async (
  period: 'today' | 'week' | 'month' | 'year',
  periodValue?: string,
  deletedByName?: string
): Promise<number> => {
  const visits = getStoredVisits();
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');

  const todayStr = `${y}-${m}-${d}`;
  const monthStr = periodValue || `${y}-${m}`;
  const yearStr = periodValue || String(y);

  let targetIds: string[] = [];
  let periodLabel = '';

  if (period === 'today') {
    targetIds = visits.filter((v) => v.visitedAt.startsWith(todayStr)).map((v) => v.id);
    periodLabel = `Hari Ini (${todayStr})`;
  } else if (period === 'week') {
    // Current week (past 7 days or current week)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    targetIds = visits.filter((v) => new Date(v.visitedAt) >= sevenDaysAgo).map((v) => v.id);
    periodLabel = 'Pekan Berjalan (7 Hari Terakhir)';
  } else if (period === 'month') {
    targetIds = visits.filter((v) => v.visitedAt.startsWith(monthStr)).map((v) => v.id);
    periodLabel = `Bulan ${monthStr}`;
  } else if (period === 'year') {
    targetIds = visits.filter((v) => v.visitedAt.startsWith(yearStr)).map((v) => v.id);
    periodLabel = `Tahun ${yearStr}`;
  }

  if (targetIds.length === 0) return 0;

  return await deleteMultipleVisits(targetIds, deletedByName || 'Admin');
};

// Reset / Clear visits by case category or type
export const clearVisitsByCase = async (
  caseTypeOrCategory: string,
  deletedByName?: string
): Promise<number> => {
  const visits = getStoredVisits();
  const targetIds = visits
    .filter((v) => v.caseType === caseTypeOrCategory || v.caseCategory === caseTypeOrCategory)
    .map((v) => v.id);

  if (targetIds.length === 0) return 0;

  return await deleteMultipleVisits(targetIds, deletedByName || 'Admin');
};

// Activity Logs with Real-time & Cloud Persistence
export const getStoredLogs = (): ActivityLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(INITIAL_LOGS));
      return INITIAL_LOGS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load logs', err);
    return INITIAL_LOGS;
  }
};

export const subscribeToLogs = (callback: (logs: ActivityLog[]) => void): (() => void) => {
  try {
    const logsCol = collection(db, 'activity_logs');
    const q = query(logsCol, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ActivityLog[] = [];
          snapshot.forEach((d) => list.push(d.data() as ActivityLog));
          localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(list));
          callback(list);
        } else {
          callback(getStoredLogs());
        }
      },
      () => {
        callback(getStoredLogs());
      }
    );

    return unsubscribe;
  } catch {
    callback(getStoredLogs());
    return () => {};
  }
};

export const logActivity = async (logData: Omit<ActivityLog, 'id' | 'timestamp' | 'ipAddress'>): Promise<void> => {
  const logs = getStoredLogs();
  const now = new Date();
  const timeFormatted = now.toISOString().replace('T', ' ').substring(0, 19);

  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    timestamp: timeFormatted,
    ipAddress: '127.0.0.1 (Sistem Posbakum)',
    ...logData,
  };

  const updated = [newLog, ...logs].slice(0, 100);
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));

  try {
    const docRef = doc(db, 'activity_logs', newLog.id);
    await setDoc(docRef, newLog);
  } catch (e) {
    console.warn('Could not persist log to Firestore:', e);
  }
};

// QR Tokens
export const getStoredQrTokens = (): QrToken[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QR);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_QR, JSON.stringify(INITIAL_QR_TOKENS));
      return INITIAL_QR_TOKENS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_QR_TOKENS;
  }
};

export const addQrToken = async (name: string, location: string): Promise<QrToken> => {
  const tokens = getStoredQrTokens();
  const newToken: QrToken = {
    id: `qr-${Date.now()}`,
    name,
    location,
    token: `POSBAKUM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    isActive: true,
    createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    scanCount: 0,
  };
  const updated = [...tokens, newToken];
  localStorage.setItem(STORAGE_KEY_QR, JSON.stringify(updated));

  try {
    const docRef = doc(db, 'qr_tokens', newToken.id);
    await setDoc(docRef, newToken);
  } catch (err) {
    console.warn('Failed to save QR token to Firestore', err);
  }

  return newToken;
};

export const toggleQrTokenStatus = async (id: string): Promise<boolean> => {
  const tokens = getStoredQrTokens();
  const index = tokens.findIndex(t => t.id === id);
  if (index === -1) return false;
  tokens[index].isActive = !tokens[index].isActive;
  localStorage.setItem(STORAGE_KEY_QR, JSON.stringify(tokens));

  try {
    const docRef = doc(db, 'qr_tokens', id);
    await updateDoc(docRef, { isActive: tokens[index].isActive });
  } catch (e) {
    console.warn('Failed to update QR token in Firestore', e);
  }

  return tokens[index].isActive;
};

// Officer Auth Session
export const getAuthenticatedOfficer = (): OfficerUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAuthenticatedOfficer = (officer: OfficerUser | null): void => {
  if (officer) {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(officer));
  } else {
    localStorage.removeItem(STORAGE_KEY_AUTH);
  }
};

export const resetToDemoData = (): void => {
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(INITIAL_VISITS));
  localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(INITIAL_LOGS));
  localStorage.setItem(STORAGE_KEY_QR, JSON.stringify(INITIAL_QR_TOKENS));
};
