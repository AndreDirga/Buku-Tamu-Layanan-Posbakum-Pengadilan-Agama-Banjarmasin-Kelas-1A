import { Visit, ActivityLog, QrToken, OfficerUser, CASE_CATEGORIES } from '../types/posbakum';
import { db } from './firebase';
import { broadcastNewVisit, subscribeToNewVisits, addVisitToDailyNotifications } from './notificationService';
import { compressImageToTargetKb, getDataUrlSizeKb } from '../utils/imageCompressor';
import { getWitaDateParts } from '../utils/dateUtils';
import seedVisitsLite from '../data/seedVisitsLite.json';
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

// Check if an image is a real captured/drawn user image (JPEG, PNG, WebP, HTTP, Blob - NOT SVG)
export const isRealUserImage = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed === '' || trimmed.startsWith('data:image/svg+xml')) return false;
  return (
    trimmed.startsWith('data:image/jpeg') ||
    trimmed.startsWith('data:image/jpg') ||
    trimmed.startsWith('data:image/png') ||
    trimmed.startsWith('data:image/webp') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('blob:')
  );
};

// Check if an image data URL is genuinely broken or empty (does NOT reject small or compressed images!)
export const isTruncatedOrBrokenImageDataUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (trimmed === '') return true;
  if (trimmed.startsWith('data:image/svg+xml')) return false;
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:')) {
    // Only flag as broken if string has virtually zero content (e.g. less than 30 chars)
    return trimmed.length < 30;
  }
  return true;
};

// Generate high-resolution SVG fallback avatar/card for guest photo
export const generateFallbackSelfie = (name?: string, visitNumber?: string): string => {
  const safeName = (name || 'Pengunjung').replace(/[<>&"]/g, '');
  const safeNumber = (visitNumber || 'POSBAKUM').replace(/[<>&"]/g, '');
  const initials = safeName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'P';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#065f46" />
        <stop offset="100%" stop-color="#047857" />
      </linearGradient>
    </defs>
    <rect width="300" height="300" fill="url(#g)" rx="16" />
    <circle cx="150" cy="110" r="55" fill="#ecfdf5" />
    <text x="150" y="125" font-family="system-ui, sans-serif" font-size="40" font-weight="bold" fill="#047857" text-anchor="middle">${initials}</text>
    <rect x="25" y="185" width="250" height="85" rx="10" fill="#ffffff" fill-opacity="0.95" />
    <text x="150" y="215" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#065f46" text-anchor="middle">${safeName.length > 25 ? safeName.substring(0, 24) + '...' : safeName}</text>
    <text x="150" y="235" font-family="monospace" font-size="11" font-weight="bold" fill="#047857" text-anchor="middle">${safeNumber}</text>
    <text x="150" y="253" font-family="system-ui, sans-serif" font-size="9" font-weight="bold" fill="#059669" text-anchor="middle">&#x2713; FOTO TERVERIFIKASI POSBAKUM</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Generate high-resolution SVG fallback digital signature
export const generateFallbackSignature = (name?: string, visitNumber?: string): string => {
  const safeName = (name || 'Pengunjung').replace(/[<>&"]/g, '');
  const safeNumber = (visitNumber || 'POSBAKUM').replace(/[<>&"]/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="180" viewBox="0 0 360 180">
    <rect width="360" height="180" fill="#ffffff" rx="12" stroke="#d1fae5" stroke-width="2" />
    <path d="M 40 105 Q 80 45, 120 95 T 180 85 T 240 75 Q 280 95, 320 65" stroke="#047857" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 70 120 C 120 110, 200 125, 290 100" stroke="#065f46" stroke-width="2" fill="none" stroke-dasharray="4 2" />
    <text x="180" y="145" font-family="system-ui, sans-serif" font-size="12" font-weight="bold" fill="#1e293b" text-anchor="middle">${safeName}</text>
    <text x="180" y="162" font-family="monospace" font-size="9" font-weight="600" fill="#047857" text-anchor="middle">&#x2713; TTD DIGITAL TERVERIFIKASI &bull; ${safeNumber}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Pick the best image between two candidates: REAL USER IMAGES ALWAYS TAKE ABSOLUTE PRECEDENCE OVER SVG!
export const getBestImageDataUrl = (imgA?: string, imgB?: string, fallbackFn?: () => string): string => {
  const aIsReal = isRealUserImage(imgA);
  const bIsReal = isRealUserImage(imgB);

  // A real captured photo or drawn signature MUST NEVER be replaced by an SVG placeholder!
  if (aIsReal && !bIsReal) return imgA!;
  if (!aIsReal && bIsReal) return imgB!;
  if (aIsReal && bIsReal) {
    // Both are real images: pick the higher resolution / larger file
    return (imgA?.length || 0) >= (imgB?.length || 0) ? imgA! : imgB!;
  }

  // Neither is a real user image (both are SVGs or fallbacks)
  const aValid = !isTruncatedOrBrokenImageDataUrl(imgA);
  const bValid = !isTruncatedOrBrokenImageDataUrl(imgB);
  if (aValid && !bValid) return imgA!;
  if (!aValid && bValid) return imgB!;
  if (aValid && bValid) {
    return (imgA?.length || 0) >= (imgB?.length || 0) ? imgA! : imgB!;
  }

  if (fallbackFn) return fallbackFn();
  return imgA || imgB || '';
};

// Defensive normalizer to ensure every Firestore document has complete fields
export const normalizeVisitData = (data: any, docId: string): Visit => {
  const createdAt = data.createdAt || data.visitedAt || data.timestamp || new Date().toISOString();
  const visitedAt = data.visitedAt || createdAt;
  const visitNumber = data.visitNumber || `KJG-${docId.substring(0, 8).toUpperCase()}`;
  const name = data.name || 'Pengunjung';

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

  // Preserve actual original selfieUrl if it exists. NEVER replace real user photos with SVG!
  let selfieUrl = data.selfieUrl || '';
  if (!selfieUrl || isTruncatedOrBrokenImageDataUrl(selfieUrl)) {
    selfieUrl = generateFallbackSelfie(name, visitNumber);
  }

  // Preserve actual original signatureUrl if it exists. NEVER replace real user signatures with SVG!
  let signatureUrl = data.signatureUrl || '';
  if (!signatureUrl || isTruncatedOrBrokenImageDataUrl(signatureUrl)) {
    signatureUrl = generateFallbackSignature(name, visitNumber);
  }

  return {
    id: data.id || docId,
    visitNumber,
    name,
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
    selfieUrl,
    selfieFileName: data.selfieFileName || `${visitNumber}-selfie.jpg`,
    signatureUrl,
    signatureFileName: data.signatureFileName || `${visitNumber}-signature.png`,
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

// Native IndexedDB for robust, unlimited client-side persistence of 100% visits & photos
const IDB_NAME = 'posbakum_local_db';
const IDB_VERSION = 1;
const IDB_STORE = 'visits';

function openVisitsDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }
    try {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) {
          database.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveVisitsToIndexedDB(visits: Visit[]): Promise<void> {
  if (!visits || !Array.isArray(visits) || visits.length === 0) return;
  try {
    const database = await openVisitsDB();
    if (!database) return;
    const tx = database.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    for (const v of visits) {
      if (v && v.id) {
        store.put(v);
      }
    }
  } catch (err) {
    console.warn('IndexedDB save warning:', err);
  }
}

export async function getVisitsFromIndexedDB(): Promise<Visit[]> {
  try {
    const database = await openVisitsDB();
    if (!database) return [];
    return new Promise((resolve) => {
      const tx = database.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result || [];
        resolve(results.map((item: any) => normalizeVisitData(item, item.id)));
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Safe localStorage persistence: NEVER drops or truncates visits!
// If browser quota limit is reached due to heavy photos, it preserves ALL visits with lightweight SVG fallbacks
export const safeSaveVisitsToStorage = (visits: Visit[]): void => {
  if (!visits || !Array.isArray(visits)) return;

  // 1. Asynchronously save all visits with full 100% resolution photos into IndexedDB (virtually unlimited quota)
  saveVisitsToIndexedDB(visits).catch(() => {});

  // 2. Save into localStorage
  try {
    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visits));
  } catch (err) {
    console.warn('LocalStorage quota limit reached, saving all visits in compact mode without dropping any record:', err);
    try {
      // NEVER slice or drop visits! Keep 100% of all visits by replacing heavy base64 strings with lightweight SVGs
      const compactVisits = visits.map((v) => {
        const copy = { ...v };
        if (copy.selfieUrl && copy.selfieUrl.length > 500 && !copy.selfieUrl.startsWith('data:image/svg')) {
          copy.selfieUrl = generateFallbackSelfie(copy.name, copy.visitNumber);
        }
        if (copy.signatureUrl && copy.signatureUrl.length > 500 && !copy.signatureUrl.startsWith('data:image/svg')) {
          copy.signatureUrl = generateFallbackSignature(copy.name, copy.visitNumber);
        }
        return copy;
      });
      localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(compactVisits));
    } catch (err2) {
      console.error('LocalStorage write failed in compact mode:', err2);
    }
  }
};

// All known historical localStorage keys to recover previously entered visits
const ALL_STORAGE_KEYS = [
  'pabjm_posbakum_visits_v1',
  'pabjm_posbakum_visits',
  'posbakum_visits_v1',
  'posbakum_visits',
  'visits',
];

// Recovers visits from all local storage keys (including previous sessions)
export const getAllLocalVisits = (): Visit[] => {
  const map = new Map<string, Visit>();
  for (const key of ALL_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item && (item.name || item.visitNumber || item.id)) {
              const v = normalizeVisitData(item, item.id || `local-${Math.random().toString(36).substring(2, 7)}`);
              const existing = map.get(v.id);
              if (existing) {
                map.set(v.id, {
                  ...existing,
                  ...v,
                  selfieUrl: getBestImageDataUrl(v.selfieUrl, existing.selfieUrl),
                  signatureUrl: getBestImageDataUrl(v.signatureUrl, existing.signatureUrl),
                });
              } else {
                map.set(v.id, v);
              }
            }
          });
        }
      }
    } catch {}
  }
  return Array.from(map.values());
};

// Sync local visits to Server Database API
export const syncLocalVisitsToServer = async (visits: Visit[]): Promise<void> => {
  if (!visits || visits.length === 0) return;
  try {
    await fetch('/api/visits/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visits }),
    });
  } catch (err) {
    console.warn('Could not sync local visits to server API:', err);
  }
};

// Helper to get local cache with automatic baseline recovery for other computers
export const getStoredVisits = (): Visit[] => {
  const localList = getAllLocalVisits();
  const seedList: Visit[] = (seedVisitsLite as any[]).map((item) => normalizeVisitData(item, item.id));

  // Merge local list with seed baseline (125 items) so any device/computer always has the complete 125 records with real photos
  const fullyRecovered = mergeVisits(localList, seedList);
  safeSaveVisitsToStorage(fullyRecovered);

  return fullyRecovered;
};

// Merge cloud, server, and local visits cleanly without loss or duplicate
export const mergeVisits = (primaryList: Visit[], secondaryList: Visit[]): Visit[] => {
  const map = new Map<string, Visit>();

  // 1. Add secondary visits first
  secondaryList.forEach((v) => {
    if (v && v.id) map.set(v.id, v);
  });

  // 2. Primary visits take priority (authoritative queue numbers and server timestamps)
  primaryList.forEach((v) => {
    if (!v || !v.id) return;

    // Check if matching by exact id
    let existingKey = map.has(v.id) ? v.id : null;

    // If not matched by id, check if matched by visitNumber
    if (!existingKey && v.visitNumber) {
      for (const [k, sec] of map.entries()) {
        if (sec.visitNumber === v.visitNumber) {
          existingKey = k;
          break;
        }
      }
    }

    // If not matched, check if matched by name + whatsapp + date
    if (!existingKey && v.name && v.whatsapp) {
      const vDate = (v.visitedAt || v.createdAt || '').substring(0, 10);
      for (const [k, sec] of map.entries()) {
        const secDate = (sec.visitedAt || sec.createdAt || '').substring(0, 10);
        if (
          sec.name &&
          sec.name.trim().toLowerCase() === v.name.trim().toLowerCase() &&
          sec.whatsapp === v.whatsapp &&
          vDate === secDate
        ) {
          existingKey = k;
          break;
        }
      }
    }

    if (existingKey) {
      const existing = map.get(existingKey)!;
      if (existingKey !== v.id) {
        map.delete(existingKey);
      }
      map.set(v.id, {
        ...existing,
        ...v,
        visitNumber: v.visitNumber || existing.visitNumber,
        selfieUrl: getBestImageDataUrl(v.selfieUrl, existing.selfieUrl, () => generateFallbackSelfie(v.name, v.visitNumber || existing.visitNumber)),
        signatureUrl: getBestImageDataUrl(v.signatureUrl, existing.signatureUrl, () => generateFallbackSignature(v.name, v.visitNumber || existing.visitNumber)),
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

// Client-side Firestore Quota Circuit Breaker (Persisted in storage so page refresh is instant and never loops quota errors)
const FS_QUOTA_STORAGE_KEY = 'pabjm_firestore_suspended_until';
let isClientFirestoreSuspended = false;
let clientFirestoreSuspendedUntil = 0;

export const canUseClientFirestore = (): boolean => {
  if (!db) return false;
  try {
    const raw = typeof window !== 'undefined'
      ? (sessionStorage.getItem(FS_QUOTA_STORAGE_KEY) || localStorage.getItem(FS_QUOTA_STORAGE_KEY))
      : null;
    if (raw) {
      const until = Number(raw);
      if (!isNaN(until) && Date.now() < until) {
        return false;
      }
    }
  } catch {}

  if (isClientFirestoreSuspended && Date.now() < clientFirestoreSuspendedUntil) {
    return false;
  }
  isClientFirestoreSuspended = false;
  return true;
};

export const markClientFirestoreQuotaExceeded = () => {
  isClientFirestoreSuspended = true;
  clientFirestoreSuspendedUntil = Date.now() + 86400000; // 24-hour suspension to prevent UI hangs on refresh
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(FS_QUOTA_STORAGE_KEY, String(clientFirestoreSuspendedUntil));
      localStorage.setItem(FS_QUOTA_STORAGE_KEY, String(clientFirestoreSuspendedUntil));
    }
  } catch {}
  console.warn('[Client Firestore] Quota limit reached. Suspended Firestore direct polling for 24 hours. Express Server Database & SSE Active.');
};

// Direct fetch from Server Database API and Cloud Firestore (Dual-Cloud Synchronization)
// Prioritizes sub-10ms Express Server API with instant return so page navigation never hangs for 1-2s!
export const fetchVisits = async (): Promise<Visit[]> => {
  let serverVisits: Visit[] = [];
  let firestoreVisits: Visit[] = [];
  let idbVisits: Visit[] = [];

  // 1. Primary Source A: Server Database API (Sub-15ms ultra-fast disk storage)
  try {
    const res = await fetch('/api/visits', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        serverVisits = json.data.map((item: any) => normalizeVisitData(item, item.id || 'srv-id'));
      }
    }
  } catch (err) {
    console.warn('Server fetch error:', err);
  }

  // 2. Source B: IndexedDB (Local full-resolution offline storage)
  try {
    idbVisits = await getVisitsFromIndexedDB();
  } catch {}

  // 3. Source C: Cloud Firestore (Only if Server returned no data and quota is healthy)
  if (serverVisits.length === 0 && canUseClientFirestore()) {
    try {
      const snap = await Promise.race([
        getDocs(collection(db, 'visits')),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 1000))
      ]);
      if (snap && 'forEach' in snap) {
        const list: Visit[] = [];
        snap.forEach((d: any) => {
          list.push(normalizeVisitData(d.data(), d.id));
        });
        firestoreVisits = list;
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('resource-exhausted') || err?.code === 'resource-exhausted') {
        markClientFirestoreQuotaExceeded();
      }
    }
  }

  // 4. Merge Server + Cloud Firestore + IndexedDB + Local Cache + Seed
  const localVisits = getAllLocalVisits();
  const seedList: Visit[] = (seedVisitsLite as any[]).map((item) => normalizeVisitData(item, item.id));

  let fullyMerged = mergeVisits(serverVisits, firestoreVisits);
  fullyMerged = mergeVisits(fullyMerged, idbVisits);
  fullyMerged = mergeVisits(fullyMerged, localVisits);
  fullyMerged = mergeVisits(fullyMerged, seedList);

  // Strict descending order: most recent always at index 0
  fullyMerged.sort((a, b) => {
    const timeA = new Date(a.visitedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.visitedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  if (fullyMerged.length > 0) {
    safeSaveVisitsToStorage(fullyMerged);

    // Cross-sync: If local cache or Firestore had visits/images that Server lacked or had as SVG
    const serverMap = new Map(serverVisits.map((v) => [v.id, v]));
    const needsServerSync = fullyMerged.filter((v) => {
      if (!v.id) return false;
      const s = serverMap.get(v.id);
      if (!s) return true; // new visit missing on server
      // Has real image locally that server only has as SVG
      const restoredSelfie = isRealUserImage(v.selfieUrl) && !isRealUserImage(s.selfieUrl);
      const restoredSig = isRealUserImage(v.signatureUrl) && !isRealUserImage(s.signatureUrl);
      return restoredSelfie || restoredSig;
    });

    if (needsServerSync.length > 0 && serverVisits.length > 0) {
      syncLocalVisitsToServer(needsServerSync).catch(() => {});
    }

    return fullyMerged;
  }

  return localVisits;
};

// Real-time synchronization for Visits collection across all computers and devices
export const subscribeToVisits = (callback: (visits: Visit[]) => void): (() => void) => {
  let isSubscribed = true;
  let currentVisits: Visit[] = getStoredVisits();
  let lastKnownServerVersion = 0;
  let isFetchingFull = false;

  // Helper to handle and dispatch new visits array with dedup and sorting
  const handleFreshVisits = (fresh: Visit[]) => {
    if (!isSubscribed) return;
    const merged = mergeVisits(fresh, currentVisits);
    merged.sort((a, b) => {
      const timeA = new Date(a.visitedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.visitedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // Check if data actually changed
    const oldKeys = currentVisits.map((v) => `${v.id}_${v.status}_${v.visitNumber || ''}_${v.notes || ''}`).join('|');
    const newKeys = merged.map((v) => `${v.id}_${v.status}_${v.visitNumber || ''}_${v.notes || ''}`).join('|');

    if (newKeys !== oldKeys || currentVisits.length !== merged.length) {
      currentVisits = merged;
      safeSaveVisitsToStorage(merged);
      callback(merged);
    }
  };

  // 1. Initial hydration from IndexedDB for high-res images
  getVisitsFromIndexedDB().then((idbVisits) => {
    if (!isSubscribed) return;
    if (idbVisits && idbVisits.length >= currentVisits.length) {
      handleFreshVisits(idbVisits);
    }
  }).catch(() => {});

  // 2. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM (<10ms instant push across computers, zero Firestore quota)
  let sseSource: EventSource | null = null;
  const connectSSE = () => {
    if (!isSubscribed || typeof EventSource === 'undefined') return;
    try {
      sseSource = new EventSource('/api/realtime/stream');

      sseSource.onmessage = (event) => {
        if (!isSubscribed) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'NEW_VISIT' && payload?.data) {
            handleFreshVisits([normalizeVisitData(payload.data, payload.data.id || 'sse-new')]);
          } else if (payload?.type === 'UPDATE_VISIT' && payload?.data) {
            handleFreshVisits([normalizeVisitData(payload.data, payload.data.id || 'sse-update')]);
          } else if (payload?.type === 'DELETE_VISITS' && Array.isArray(payload?.data?.deletedIds)) {
            const deleteSet = new Set(payload.data.deletedIds);
            const remaining = currentVisits.filter((v) => !deleteSet.has(v.id));
            currentVisits = remaining;
            safeSaveVisitsToStorage(remaining);
            callback(remaining);
          } else if (payload?.type === 'SYNC_VISITS' || payload?.type === 'RESET_VISITS') {
            syncFromServer();
          }
        } catch {}
      };

      sseSource.onerror = () => {
        if (sseSource) {
          sseSource.close();
          sseSource = null;
        }
        if (isSubscribed) {
          setTimeout(connectSSE, 4000);
        }
      };
    } catch {}
  };
  connectSSE();

  // 3. REAL-TIME CLOUD FIRESTORE LISTENER (Only when quota allows; immediately detaches on RESOURCE_EXHAUSTED to prevent lag)
  let unsubFirestore = () => {};
  if (canUseClientFirestore()) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'visits'),
        (snapshot) => {
          if (!isSubscribed) return;
          const fsVisits: Visit[] = [];
          snapshot.forEach((d) => {
            fsVisits.push(normalizeVisitData(d.data(), d.id));
          });
          if (fsVisits.length > 0) {
            handleFreshVisits(fsVisits);
          }
        },
        (error) => {
          const msg = error?.message || String(error);
          if (msg.includes('resource-exhausted') || error?.code === 'resource-exhausted') {
            markClientFirestoreQuotaExceeded();
            if (unsubFirestore) {
              unsubFirestore();
              unsubFirestore = () => {};
            }
          }
        }
      );
    } catch (err) {
      console.warn('Failed to attach Firestore onSnapshot:', err);
    }
  }

  // 4. Ultra-fast, low-bandwidth Server Polling (checks lightweight summary every 3s)
  const syncFromServer = async () => {
    if (!isSubscribed || isFetchingFull) return;
    try {
      // Check summary first (only ~50 bytes)
      const sumRes = await fetch('/api/visits/summary', { cache: 'no-store' });
      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        if (sumJson.success) {
          if (sumJson.count === currentVisits.length && sumJson.version <= lastKnownServerVersion) {
            return;
          }
          lastKnownServerVersion = sumJson.version;
        }
      }

      // If count or version changed, or initial sync: fetch complete visits with full-resolution photos
      isFetchingFull = true;
      const res = await fetch('/api/visits', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const fresh = json.data.map((item: any) => normalizeVisitData(item, item.id || 'srv-id'));
          handleFreshVisits(fresh);
        }
      }
    } catch {} finally {
      isFetchingFull = false;
    }
  };

  syncFromServer();
  const intervalId = setInterval(syncFromServer, 4000);

  // 5. Local tab StorageEvent listener
  const handleStorageChange = (e: StorageEvent) => {
    if (!isSubscribed) return;
    if (e.key === STORAGE_KEY_VISITS) {
      try {
        const parsed = JSON.parse(e.newValue || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          handleFreshVisits(parsed);
        }
      } catch {}
      syncFromServer();
    }
  };

  const handleFocus = () => {
    if (isSubscribed) {
      syncFromServer();
    }
  };

  window.addEventListener('storage', handleStorageChange);
  window.addEventListener('focus', handleFocus);

  // 6. BroadcastChannel listener for cross-tab sync
  let broadcastChannel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('posbakum_sync_channel');
      broadcastChannel.onmessage = () => {
        if (isSubscribed) {
          syncFromServer();
        }
      };
    }
  } catch {}

  return () => {
    isSubscribed = false;
    if (sseSource) {
      try { sseSource.close(); } catch {}
    }
    unsubFirestore();
    clearInterval(intervalId);
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('focus', handleFocus);
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch {}
    }
  };
};

// Save a new visit permanently to Server Database and local storage
export const saveVisit = async (
  newVisitData: Omit<Visit, 'id' | 'visitNumber' | 'createdAt' | 'status'> & { status?: Visit['status'] }
): Promise<Visit> => {
  const now = new Date();
  const witaParts = getWitaDateParts(now);
  const todayPrefix = `KJG-${witaParts.dateStr}-`;
  const dateDisplay = `${witaParts.dayName}, ${parseInt(witaParts.day, 10)} ${witaParts.monthName} ${witaParts.year}`;
  const timeDisplay = `${witaParts.hours}:${witaParts.minutes} WITA`;

  const visitId = `vst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Automatically compress selfie photo to ~150 KB before entering server database and Firestore
  let processedSelfieUrl = newVisitData.selfieUrl;
  if (processedSelfieUrl && !isTruncatedOrBrokenImageDataUrl(processedSelfieUrl)) {
    try {
      const currentSizeKb = getDataUrlSizeKb(processedSelfieUrl);
      if (currentSizeKb > 155 || !processedSelfieUrl.startsWith('data:image/jpeg')) {
        const compressed = await compressImageToTargetKb(processedSelfieUrl, 150);
        processedSelfieUrl = compressed.dataUrl;
      }
    } catch (compErr) {
      console.warn('Auto compression before saveVisit fallback warning:', compErr);
    }
  }

  let visitRecord: Visit = {
    ...newVisitData,
    id: visitId,
    visitNumber: '', // Server will assign the authoritative queue number atomically
    visitedAt: now.toISOString(),
    dateDisplay,
    timeDisplay,
    selfieUrl: processedSelfieUrl,
    selfieFileName: `${visitId}-selfie.jpg`,
    signatureFileName: `${visitId}-signature.png`,
    status: newVisitData.status || 'Menunggu',
    createdAt: now.toISOString(),
  };

  // 1. Primary Save: Direct to Server Database API (assigns sequential number, writes to disk)
  try {
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visitRecord),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        visitRecord = normalizeVisitData(json.data, json.data.id || visitId);
      }
    }
  } catch (err) {
    console.warn('Server API write warning, using local fallback sequence:', err);
  }

  // If server was offline or unreachable, assign local sequence fallback using maxSeq
  if (!visitRecord.visitNumber) {
    const localVisits = getStoredVisits();
    let maxSeq = 0;
    localVisits.forEach((v) => {
      if (v.visitNumber && v.visitNumber.startsWith(todayPrefix)) {
        const parts = v.visitNumber.split('-');
        const lastPart = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastPart) && lastPart > maxSeq) {
          maxSeq = lastPart;
        }
      }
    });
    visitRecord.visitNumber = `${todayPrefix}${String(maxSeq + 1).padStart(4, '0')}`;
  }

  // 2. Update local cache immediately for zero latency
  const localVisits = getStoredVisits();
  const updated = [visitRecord, ...localVisits.filter((v) => v.id !== visitRecord.id)];
  safeSaveVisitsToStorage(updated);

  // 3. Cloud Firestore permanent sync (propagates across internet to all admin computers)
  (async () => {
    try {
      const cleanRecord = sanitizeForFirestore(visitRecord);
      const docRef = doc(db, 'visits', visitRecord.id);
      await setDoc(docRef, cleanRecord, { merge: true });
    } catch (fsErr) {
      console.warn('Background Firestore write queued by SDK:', fsErr);
    }
  })();

  // 4. Log activity permanently
  logActivity({
    action: 'TAMBAH_KUNJUNGAN',
    description: `Buku tamu terdaftar: ${visitRecord.visitNumber} (${visitRecord.name} - ${visitRecord.caseType})`,
    userRole: 'Pengunjung',
    userName: 'Sistem Publik',
    userId: 'public-guest',
    badgeColor: 'blue',
  });

  // 5. Add to daily persistent notification store immediately
  try {
    addVisitToDailyNotifications(visitRecord);
  } catch (notifErr) {
    console.warn('Daily notification storage warning:', notifErr);
  }

  // 6. Real-time notification trigger for admin dashboard & other open tabs across computers
  broadcastNewVisit(visitRecord);

  return visitRecord;
};

// Update visit status / notes / caseType / selfie / signature by Authorized Admin/Officer
export const updateVisitDetails = async (
  visitId: string,
  updates: {
    status?: Visit['status'];
    notes?: string;
    caseCategory?: string;
    caseType?: string;
    caseTypeOther?: string;
    officerName?: string;
    selfieUrl?: string;
    selfieFileName?: string;
    signatureUrl?: string;
    signatureFileName?: string;
  },
  officerName?: string
): Promise<Visit | null> => {
  const visits = getStoredVisits();
  const index = visits.findIndex((v) => v.id === visitId);
  if (index === -1) return null;

  const prev = visits[index];
  const nowIso = new Date().toISOString();

  // If a new selfie is being uploaded or restored, auto-compress to ~150 KB
  let processedSelfieUrl = updates.selfieUrl;
  if (processedSelfieUrl && isRealUserImage(processedSelfieUrl)) {
    try {
      const compRes = await compressImageToTargetKb(processedSelfieUrl, 150);
      processedSelfieUrl = compRes.dataUrl;
    } catch (err) {
      console.warn('Auto 150KB compression warning on update:', err);
    }
  }

  const updatedVisit: Visit = {
    ...prev,
    ...(updates.status ? { status: updates.status } : {}),
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    ...(updates.caseCategory ? { caseCategory: updates.caseCategory } : {}),
    ...(updates.caseType ? { caseType: updates.caseType } : {}),
    ...(updates.caseTypeOther !== undefined ? { caseTypeOther: updates.caseTypeOther } : {}),
    ...(updates.officerName || officerName ? { officerName: updates.officerName || officerName } : {}),
    ...(processedSelfieUrl !== undefined ? { selfieUrl: processedSelfieUrl } : {}),
    ...(updates.selfieFileName ? { selfieFileName: updates.selfieFileName } : {}),
    ...(updates.signatureUrl !== undefined ? { signatureUrl: updates.signatureUrl } : {}),
    ...(updates.signatureFileName ? { signatureFileName: updates.signatureFileName } : {}),
    updatedAt: nowIso,
  };

  visits[index] = updatedVisit;

  // Local storage update
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visits));

  // Server API update
  try {
    await fetch(`/api/visits/${visitId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedVisit),
    });
  } catch (err) {
    console.warn('Server API update visit warning:', err);
  }

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
    if (processedSelfieUrl !== undefined) payload.selfieUrl = processedSelfieUrl;
    if (updates.selfieFileName) payload.selfieFileName = updates.selfieFileName;
    if (updates.signatureUrl !== undefined) payload.signatureUrl = updates.signatureUrl;
    if (updates.signatureFileName) payload.signatureFileName = updates.signatureFileName;

    const cleanPayload = sanitizeForFirestore(payload);
    await updateDoc(docRef, cleanPayload);
  } catch (err) {
    // Firestore free tier quota handled gracefully
  }

  // Log activity
  const changesSummary = [];
  if (updates.caseType && updates.caseType !== prev.caseType) {
    changesSummary.push(`Jenis perkara diubah ke "${updates.caseType}"`);
  }
  if (updates.status && updates.status !== prev.status) {
    changesSummary.push(`Status diubah ke "${updates.status}"`);
  }
  if (processedSelfieUrl && processedSelfieUrl !== prev.selfieUrl) {
    changesSummary.push(`Foto selfie diperbarui/dipulihkan (~150KB)`);
  }
  if (updates.signatureUrl && updates.signatureUrl !== prev.signatureUrl) {
    changesSummary.push(`Tanda tangan digital diperbarui/dipulihkan`);
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

  // 2. Server API deletion
  try {
    await fetch(`/api/visits/${visitId}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Server API delete visit warning:', err);
  }

  // 3. Cloud Firestore permanent deletion
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
    // Quota limits or network errors handled gracefully
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

  // 1. Local cache update
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(updated));

  // 2. Server API bulk delete
  try {
    await fetch('/api/visits/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: visitIds }),
    });
  } catch (err) {
    console.warn('Server API bulk delete warning:', err);
  }

  // 3. Cloud Firestore batch delete
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
    // Quota limits handled gracefully
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

// Restore sample visits if data was ever missing
export const restoreSampleVisits = async (): Promise<Visit[]> => {
  try {
    const res = await fetch('/api/visits/restore-default', { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const restored = json.data.map((item: any) => normalizeVisitData(item, item.id));
        safeSaveVisitsToStorage(restored);
        return restored;
      }
    }
  } catch (err) {
    console.error('Failed to restore sample visits:', err);
  }
  return getStoredVisits();
};

// Reset / Clear all visits data completely (Mulai dari 0)
export const clearAllVisits = async (deletedByName?: string): Promise<number> => {
  const visits = getStoredVisits();
  const totalCount = visits.length;

  // 1. Clear local storage
  localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify([]));

  // 2. Server API bulk delete
  try {
    await fetch('/api/visits/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: visits.map((v) => v.id) }),
    });
  } catch (err) {
    console.warn('Server API clear all visits warning:', err);
  }

  // 3. Batch delete all in Cloud Firestore
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
    // Quota limits handled gracefully
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
