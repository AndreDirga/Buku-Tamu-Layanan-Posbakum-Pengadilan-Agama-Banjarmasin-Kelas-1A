import { Visit, ActivityLog, QrToken, OfficerUser, CASE_CATEGORIES } from '../types/posbakum';
import { db } from './firebase';
import { broadcastNewVisit } from './notificationService';
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

export const INITIAL_OFFICER: OfficerUser = {
  id: 'usr-001',
  name: 'Admin',
  username: 'posbakumbjm',
  role: 'Petugas Posbakum',
  nip: '',
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
    scanCount: 0,
  },
];

export const INITIAL_VISITS: Visit[] = [];

const INITIAL_LOGS: ActivityLog[] = [
  {
    id: 'log-001',
    timestamp: '2026-08-31 08:00:00',
    userId: 'usr-001',
    userName: 'Admin',
    userRole: 'Petugas Posbakum',
    action: 'LOGIN',
    description: 'Sistem Buku Tamu Posbakum siap digunakan',
    ipAddress: '192.168.10.45',
    badgeColor: 'emerald',
  }
];

// Helper to remove any undefined properties for safe Firestore storage
export const sanitizeForFirestore = <T extends Record<string, any>>(obj: T): T => {
  const clean: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        clean[key] = sanitizeForFirestore(val);
      } else {
        clean[key] = val;
      }
    }
  });
  return clean;
};

// Defensive normalizer to ensure every Firestore document has complete fields
export const normalizeVisitData = (data: any, docId: string): Visit => {
  const createdAt = data.createdAt || data.visitedAt || data.timestamp || new Date().toISOString();
  const visitedAt = data.visitedAt || createdAt;

  let dateDisplay = data.dateDisplay;
  let timeDisplay = data.timeDisplay;
  if (!dateDisplay || !timeDisplay) {
    try {
      const d = new Date(visitedAt);
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      dateDisplay = dateDisplay || `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      timeDisplay = timeDisplay || `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WITA`;
    } catch {
      dateDisplay = dateDisplay || 'Hari ini';
      timeDisplay = timeDisplay || '08:00 WITA';
    }
  }

  return {
    id: data.id || docId,
    visitNumber: data.visitNumber || `KJG-${docId.substring(0, 8).toUpperCase()}`,
    name: data.name || 'Pengunjung',
    ktpAddress: data.ktpAddress || '',
    domicileAddress: data.domicileAddress || data.ktpAddress || '',
    domicileSameAsKtp: data.domicileSameAsKtp ?? true,
    email: data.email || '',
    whatsapp: data.whatsapp || '',
    occupation: data.occupation || 'Lainnya',
    occupationOther: data.occupationOther,
    caseCategory: data.caseCategory || 'Lainnya',
    caseType: data.caseType || 'Layanan Posbakum',
    caseTypeOther: data.caseTypeOther,
    selfieUrl: data.selfieUrl || '',
    selfieFileName: data.selfieFileName || `${data.visitNumber || docId}-selfie.jpg`,
    signatureUrl: data.signatureUrl || '',
    signatureFileName: data.signatureFileName || `${data.visitNumber || docId}-signature.png`,
    qrToken: data.qrToken || 'DIRECT-WEB',
    status: (data.status as Visit['status']) || 'Menunggu',
    visitedAt,
    createdAt,
    dateDisplay,
    timeDisplay,
    notes: data.notes || '',
    officerName: data.officerName || '',
    updatedAt: data.updatedAt,
  };
};

// Safe localStorage persistence that handles quota limits without crashing the app
export const safeSaveVisitsToStorage = (visits: Visit[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visits));
  } catch (err) {
    console.warn('LocalStorage quota limit reached, saving compact representation:', err);
    try {
      // Keep full data in memory, but trim large base64 strings in local storage to prevent crash
      const compact = visits.map((v) => ({
        ...v,
        selfieUrl: v.selfieUrl && v.selfieUrl.length > 50000 ? v.selfieUrl.substring(0, 5000) : v.selfieUrl,
        signatureUrl: v.signatureUrl && v.signatureUrl.length > 20000 ? v.signatureUrl.substring(0, 2000) : v.signatureUrl,
      }));
      localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(compact));
    } catch (err2) {
      console.error('LocalStorage write failed even with compact representation:', err2);
    }
  }
};

// Helper to get local cache
export const getStoredVisits = (): Visit[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => normalizeVisitData(item, item.id || 'cache-id'));
    }
    return [];
  } catch (err) {
    console.error('Failed to load visits from localStorage', err);
    return [];
  }
};

// Merge cloud and local visits cleanly without loss or duplicate
export const mergeVisits = (cloudList: Visit[], localList: Visit[]): Visit[] => {
  const map = new Map<string, Visit>();

  // 1. Add local visits
  localList.forEach((v) => {
    if (v.id) map.set(v.id, v);
  });

  // 2. Overwrite with Cloud Firestore data, preserving local photos if cloud had empty string
  cloudList.forEach((v) => {
    const existing = map.get(v.id);
    if (existing) {
      map.set(v.id, {
        ...existing,
        ...v,
        selfieUrl: v.selfieUrl || existing.selfieUrl,
        signatureUrl: v.signatureUrl || existing.signatureUrl,
      });
    } else {
      map.set(v.id, v);
    }
  });

  const merged = Array.from(map.values());
  // Sort descending by visitedAt or createdAt
  merged.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.visitedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.visitedAt || 0).getTime();
    return timeB - timeA;
  });

  return merged;
};

// Direct fetch from Cloud Firestore (reads ALL documents without skipping any)
export const fetchVisits = async (): Promise<Visit[]> => {
  try {
    const visitsCol = collection(db, 'visits');
    // Notice: Direct collection read ensures documents without 'createdAt' are NOT excluded
    const snapshot = await getDocs(visitsCol);
    const cloudVisits: Visit[] = [];

    snapshot.forEach((docSnap) => {
      cloudVisits.push(normalizeVisitData(docSnap.data(), docSnap.id));
    });

    const localVisits = getStoredVisits();
    const merged = mergeVisits(cloudVisits, localVisits);

    safeSaveVisitsToStorage(merged);
    return merged;
  } catch (err) {
    console.warn('Direct fetchVisits encountered error, using local cache:', err);
    return getStoredVisits();
  }
};

// Real-time Firestore synchronization for Visits collection
export const subscribeToVisits = (callback: (visits: Visit[]) => void): (() => void) => {
  try {
    const visitsCol = collection(db, 'visits');
    // We listen to the collection directly without server-side orderBy
    // This is vital: Firestore orderBy silently omits documents missing the ordered field!
    let knownVisitIds: Set<string> | null = null;

    const unsubscribe = onSnapshot(
      visitsCol,
      (snapshot) => {
        const cloudList: Visit[] = [];
        const isSubsequentUpdate = knownVisitIds !== null;
        const currentIds = new Set<string>();

        snapshot.forEach((docSnap) => {
          const visitItem = normalizeVisitData(docSnap.data(), docSnap.id);
          cloudList.push(visitItem);
          currentIds.add(visitItem.id);

          // If this is a subsequent real-time update from Firestore, detect brand new arrivals
          if (isSubsequentUpdate && knownVisitIds && !knownVisitIds.has(visitItem.id)) {
            broadcastNewVisit(visitItem);
          }
        });

        knownVisitIds = currentIds;

        const localVisits = getStoredVisits();
        const merged = mergeVisits(cloudList, localVisits);

        // Safely update local storage without crashing
        safeSaveVisitsToStorage(merged);

        // Always notify the subscriber
        callback(merged);
      },
      (error) => {
        console.warn('Firestore visits snapshot warning, triggering direct fetch fallback:', error);
        fetchVisits().then(callback).catch(() => callback(getStoredVisits()));
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Error setting up visits subscription:', err);
    fetchVisits().then(callback).catch(() => callback(getStoredVisits()));
    return () => {};
  }
};

// Save a new visit permanently to Cloud Firestore and local storage
export const saveVisit = async (
  newVisitData: Omit<Visit, 'id' | 'visitNumber' | 'createdAt' | 'status'> & { status?: Visit['status'] }
): Promise<Visit> => {
  const localVisits = getStoredVisits();
  const now = new Date();

  // Date format YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const todayPrefix = `KJG-${dateStr}-`;

  // Find visits on same date across local & cloud to generate accurate sequential NNNN
  let existingCount = localVisits.filter(v => v.visitNumber && v.visitNumber.startsWith(todayPrefix)).length;

  try {
    const visitsCol = collection(db, 'visits');
    const snap = await getDocs(visitsCol);
    if (!snap.empty) {
      let remoteCount = 0;
      snap.forEach((d) => {
        const num = d.data()?.visitNumber;
        if (num && typeof num === 'string' && num.startsWith(todayPrefix)) {
          remoteCount++;
        }
      });
      existingCount = Math.max(existingCount, remoteCount);
    }
  } catch (e) {
    console.warn('Could not query remote visit count for sequence, using local count:', e);
  }

  const nextSeq = existingCount + 1;
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
    id: `vst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
  const updated = [visitRecord, ...localVisits.filter(v => v.id !== visitRecord.id)];
  safeSaveVisitsToStorage(updated);

  // 2. Persist permanently to Cloud Firestore with sanitized payload
  try {
    const cleanRecord = sanitizeForFirestore(visitRecord);
    const docRef = doc(db, 'visits', visitRecord.id);
    await setDoc(docRef, cleanRecord);
  } catch (err) {
    console.error('Error saving visit to Cloud Firestore:', err);
  }

  // 3. Log activity permanently
  logActivity({
    action: 'TAMBAH_KUNJUNGAN',
    description: `Buku tamu terdaftar: ${visitNumber} (${visitRecord.name} - ${visitRecord.caseType})`,
    userRole: 'Pengunjung',
    userName: 'Sistem Publik',
    userId: 'public-guest',
    badgeColor: 'blue',
  });

  // 4. Real-time notification trigger for admin dashboard & other open tabs
  broadcastNewVisit(visitRecord);

  // 5. Automatic Daily Sync to Admin Google Drive (gdriveandria1@gmail.com)
  try {
    import('./googleDriveAdminService').then(({ isGDriveAutoSyncEnabled, getStoredGDriveAuth, syncDailyVisitsToGDrive }) => {
      if (isGDriveAutoSyncEnabled()) {
        const authInfo = getStoredGDriveAuth();
        if (authInfo?.accessToken) {
          const todayISO = now.toISOString().substring(0, 10);
          const visitsToday = updated.filter(v => (v.visitedAt || v.createdAt || '').substring(0, 10) === todayISO);
          syncDailyVisitsToGDrive(todayISO, visitsToday).catch((e) => {
            console.warn('Background auto-sync to Google Drive error:', e);
          });
        }
      }
    }).catch(() => {});
  } catch (e) {
    console.warn('Could not initiate Google Drive background sync:', e);
  }

  return visitRecord;
};

// Update visit status / notes / caseType by Authorized Admin/Officer
export const updateVisitDetails = async (
  visitId: string,
  updates: {
    status?: Visit['status'];
    notes?: string;
    caseCategory?: string;
    caseType?: string;
    caseTypeOther?: string;
    officerName?: string;
  },
  officerName?: string
): Promise<Visit | null> => {
  const visits = getStoredVisits();
  const index = visits.findIndex((v) => v.id === visitId);
  if (index === -1) return null;

  const prev = visits[index];
  const nowIso = new Date().toISOString();

  const updatedVisit: Visit = {
    ...prev,
    ...(updates.status ? { status: updates.status } : {}),
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    ...(updates.caseCategory ? { caseCategory: updates.caseCategory } : {}),
    ...(updates.caseType ? { caseType: updates.caseType } : {}),
    ...(updates.caseTypeOther !== undefined ? { caseTypeOther: updates.caseTypeOther } : {}),
    ...(updates.officerName || officerName ? { officerName: updates.officerName || officerName } : {}),
    updatedAt: nowIso,
  };

  visits[index] = updatedVisit;

  // Local storage update
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visits));

  // Cloud Firestore permanent update
  try {
    const docRef = doc(db, 'visits', visitId);
    const payload: Partial<Visit> = {
      updatedAt: nowIso,
    };
    if (updates.status) payload.status = updates.status;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.caseCategory) payload.caseCategory = updates.caseCategory;
    if (updates.caseType) payload.caseType = updates.caseType;
    if (updates.caseTypeOther !== undefined) payload.caseTypeOther = updates.caseTypeOther;
    if (updates.officerName || officerName) payload.officerName = updates.officerName || officerName;

    const cleanPayload = sanitizeForFirestore(payload);
    await updateDoc(docRef, cleanPayload);
  } catch (err) {
    console.error('Failed to update visit in Firestore:', err);
  }

  // Log activity
  const changesSummary = [];
  if (updates.caseType && updates.caseType !== prev.caseType) {
    changesSummary.push(`Jenis perkara diubah ke "${updates.caseType}"`);
  }
  if (updates.status && updates.status !== prev.status) {
    changesSummary.push(`Status diubah ke "${updates.status}"`);
  }

  logActivity({
    action: 'UPDATE_KUNJUNGAN',
    description: `Petugas memperbarui ${prev.visitNumber} (${prev.name}): ${changesSummary.join(', ') || 'Catatan/Status diperbarui'}`,
    userRole: 'Petugas Posbakum',
    userName: officerName || 'Admin Posbakum',
    userId: 'admin-officer',
    badgeColor: 'emerald',
  });

  return updatedVisit;
};

// Update visit status / notes by Authorized Admin/Officer (Legacy wrapper)
export const updateVisitStatus = async (
  visitId: string, 
  status: Visit['status'], 
  notes?: string,
  officerName?: string
): Promise<Visit | null> => {
  return updateVisitDetails(visitId, { status, notes, officerName }, officerName);
};

// Delete single visit by Authorized Officer/Admin
export const deleteVisit = async (visitId: string, deletedByName?: string): Promise<boolean> => {
  const visits = getStoredVisits();
  const target = visits.find((v) => v.id === visitId);

  // 1. Local cache update immediately
  const updated = visits.filter((v) => v.id !== visitId);
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(updated));

  // 2. Cloud Firestore permanent deletion
  try {
    const docRef = doc(db, 'visits', visitId);
    await deleteDoc(docRef);

    // Also scan in case doc ID differs from field id
    const visitsCol = collection(db, 'visits');
    const snapshot = await getDocs(visitsCol);
    const batch = writeBatch(db);
    let matchedCount = 0;
    snapshot.forEach((d) => {
      const data = d.data();
      if (d.id === visitId || data.id === visitId || (target?.visitNumber && data.visitNumber === target.visitNumber)) {
        batch.delete(d.ref);
        matchedCount++;
      }
    });
    if (matchedCount > 0) {
      await batch.commit();
    }
  } catch (err) {
    console.error('Failed to delete visit in Firestore:', err);
  }

  logActivity({
    userId: 'officer-admin',
    userName: deletedByName || 'Admin',
    userRole: 'Petugas Posbakum',
    action: 'HAPUS_KUNJUNGAN',
    description: target 
      ? `Menghapus data kunjungan: ${target.visitNumber} (${target.name} - ${target.caseType})`
      : `Menghapus data kunjungan ID: ${visitId}`,
    badgeColor: 'red',
  });

  return true;
};

// Delete multiple visits by Authorized Officer/Admin
export const deleteMultipleVisits = async (visitIds: string[], deletedByName?: string): Promise<number> => {
  const visits = getStoredVisits();
  const countBefore = visits.length;
  const updated = visits.filter((v) => !visitIds.includes(v.id));
  const deletedCount = countBefore - updated.length || visitIds.length;

  // Local cache update
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(updated));

  // Cloud Firestore batch delete
  try {
    const visitsCol = collection(db, 'visits');
    const snapshot = await getDocs(visitsCol);
    const batch = writeBatch(db);
    let matched = 0;
    snapshot.forEach((d) => {
      const data = d.data();
      if (visitIds.includes(d.id) || (data && visitIds.includes(data.id))) {
        batch.delete(d.ref);
        matched++;
      }
    });
    if (matched > 0) {
      await batch.commit();
    }

    // Direct deletion fallback
    for (const id of visitIds) {
      const docRef = doc(db, 'visits', id);
      await deleteDoc(docRef).catch(() => {});
    }
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

  return deletedCount;
};

// Reset / Clear all visits data completely (Mulai dari 0)
export const clearAllVisits = async (deletedByName?: string): Promise<number> => {
  const visits = getStoredVisits();
  const totalCount = visits.length;

  // 1. Clear local storage
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify([]));

  // 2. Batch delete all in Cloud Firestore
  try {
    const visitsCol = collection(db, 'visits');
    const snapshot = await getDocs(visitsCol);
    if (!snapshot.empty) {
      const batch = writeBatch(db);
      snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Failed to clear all visits in Firestore:', err);
  }

  // 3. Clean up any visit-related activity logs from local storage
  try {
    const logs = getStoredLogs();
    const cleanedLogs = logs.filter(
      (l) => l.action !== 'TAMBAH_KUNJUNGAN' && !l.description.includes('mengisi buku tamu')
    );
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(cleanedLogs));
  } catch (e) {
    console.warn('Could not clean old visit logs', e);
  }

  logActivity({
    userId: 'officer-admin',
    userName: deletedByName || 'Admin',
    userRole: 'Petugas Posbakum',
    action: 'RESET_STATISTIK_KUNJUNGAN',
    description: `Mereset total kunjungan dan seluruh statistik (dikosongkan total)`,
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

    const unsubscribe = onSnapshot(
      logsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ActivityLog[] = [];
          snapshot.forEach((d) => list.push(d.data() as ActivityLog));
          list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
          const trimmed = list.slice(0, 100);
          try {
            localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(trimmed));
          } catch {}
          callback(trimmed);
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
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.nip === '19880512 201403 1 002' || !parsed.nip)) {
      parsed.nip = '';
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(parsed));
    }
    return parsed;
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
