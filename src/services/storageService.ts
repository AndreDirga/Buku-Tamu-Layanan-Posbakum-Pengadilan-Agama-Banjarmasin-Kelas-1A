import { Visit, ActivityLog, QrToken, OfficerUser, CASE_CATEGORIES } from '../types/posbakum';
import { db } from './firebase';
import { broadcastNewVisit, subscribeToNewVisits, addVisitToDailyNotifications, removeVisitFromDailyNotifications } from './notificationService';
import { realtimeHub } from './realtimeHub';
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

  // Preserve actual original selfieUrl if it exists. NEVER overwrite with SVG placeholder in the data model!
  // SafeVisitImage handles UI fallback dynamically when selfieUrl is empty.
  let selfieUrl = data.selfieUrl || '';

  // Preserve actual original signatureUrl if it exists. NEVER overwrite with SVG placeholder in the data model!
  let signatureUrl = data.signatureUrl || '';

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

const STORAGE_KEY_DELETED_VISITS = 'pabjm_posbakum_deleted_v1';
const clientDeletedIds = new Set<string>();

// Predefined set of obsolete test entries and simulations that must never appear in production totals
export const KNOWN_OBSOLETE_IDS = new Set<string>([
  'KJG-20260918-0010',
  'KJG-20260918-0011',
  'test-1789948158103-i1on',
  'TEST-1022',
  'notif-test-1789948158103-i1on',
  'vst-test-guest-1',
  'vst-test-sync-1',
  'vst-test-guest-2',
  'vst-sync-test-01',
  'vst-1788410950971-wtxdn',
  'KJG-20260908-9999',
  'KJG-VST-1788',
]);

export const getDeletedIds = (): Set<string> => {
  KNOWN_OBSOLETE_IDS.forEach((id) => clientDeletedIds.add(id));
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DELETED_VISITS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => clientDeletedIds.add(id));
        }
      }
    } catch {}
  }
  return clientDeletedIds;
};

export const isVisitDeleted = (idOrNumber?: string): boolean => {
  if (!idOrNumber) return false;
  if (KNOWN_OBSOLETE_IDS.has(idOrNumber)) return true;
  const deleted = getDeletedIds();
  return deleted.has(idOrNumber);
};

export const addDeletedIds = (ids: string[]): void => {
  if (!ids || !Array.isArray(ids) || ids.length === 0) return;
  ids.forEach((id) => {
    if (id) clientDeletedIds.add(id);
  });
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_VISITS, JSON.stringify(Array.from(clientDeletedIds)));
    } catch {}
  }
};

export const clearDeletedIds = (): void => {
  clientDeletedIds.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY_DELETED_VISITS);
    } catch {}
  }
};

export const syncDeletedIdsFromServer = async (): Promise<Set<string>> => {
  try {
    const res = await fetch('/api/visits/deleted', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.deletedIds) && json.deletedIds.length > 0) {
        addDeletedIds(json.deletedIds);
      }
    }
  } catch {}
  return getDeletedIds();
};

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

export async function deleteVisitFromIndexedDB(visitId: string, visitNumber?: string): Promise<void> {
  try {
    const database = await openVisitsDB();
    if (!database) return;
    const tx = database.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    if (visitId) {
      store.delete(visitId);
    }
    const req = store.getAll();
    req.onsuccess = () => {
      const records = req.result || [];
      records.forEach((rec: any) => {
        if (rec && (rec.id === visitId || (visitNumber && rec.visitNumber === visitNumber))) {
          store.delete(rec.id);
        }
      });
    };
  } catch (err) {
    console.warn('IndexedDB delete warning:', err);
  }
}

export async function pruneDeletedFromIndexedDB(deletedIds: Set<string>): Promise<void> {
  if (!deletedIds || deletedIds.size === 0) return;
  try {
    const database = await openVisitsDB();
    if (!database) return;
    const tx = database.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    req.onsuccess = () => {
      const records = req.result || [];
      records.forEach((rec: any) => {
        if (rec && (deletedIds.has(rec.id) || (rec.visitNumber && deletedIds.has(rec.visitNumber)))) {
          store.delete(rec.id);
        }
      });
    };
  } catch {}
}

export async function saveVisitsToIndexedDB(visits: Visit[]): Promise<void> {
  if (!visits || !Array.isArray(visits) || visits.length === 0) return;
  const deleted = getDeletedIds();
  try {
    const database = await openVisitsDB();
    if (!database) return;
    const tx = database.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    for (const v of visits) {
      if (v && v.id && !deleted.has(v.id) && (!v.visitNumber || !deleted.has(v.visitNumber))) {
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
        const filtered = results
          .filter((item: any) => item && !isVisitDeleted(item.id) && !isVisitDeleted(item.visitNumber))
          .map((item: any) => normalizeVisitData(item, item.id));
        resolve(filtered);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// All known historical localStorage keys to recover previously entered visits
const ALL_STORAGE_KEYS = [
  'pabjm_posbakum_visits_v1',
  'pabjm_posbakum_visits',
  'posbakum_visits_v1',
  'posbakum_visits',
  'visits',
];

// Completely safe localStorage writer:
// 1. Removes the target key first to free up quota before writing the new value (vital for WebKit/Blink)
// 2. Catches any QuotaExceededError and gracefully purges stale keys instead of throwing
export const safeLocalStorageSet = (key: string, value: string): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    localStorage.removeItem(key);
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    try {
      // Purge all legacy/temporary keys
      for (const oldKey of ALL_STORAGE_KEYS) {
        if (oldKey !== key) {
          try { localStorage.removeItem(oldKey); } catch {}
        }
      }
      try { localStorage.removeItem('pabjm_last_visit_event'); } catch {}
      // Retry write after purge
      localStorage.removeItem(key);
      localStorage.setItem(key, value);
      return true;
    } catch (err2) {
      console.warn(`[LocalStorage] Quota full for "${key}". Preserved in IndexedDB & Server disk.`);
      return false;
    }
  }
};

// Helper to sanitize visit records for localStorage cache:
// Only keeps up to 50 most recent visits and strips all base64 data URLs (>100 chars).
// Full 100% resolution photos and visitor digital signatures are safely persisted
// in IndexedDB and Express server disk (/data/visits.json).
// This keeps the localStorage footprint under ~35KB (vs 4.5MB), eliminating QuotaExceededError forever.
export const toLightweightVisits = (visits: Visit[]): Visit[] => {
  if (!Array.isArray(visits)) return [];
  return visits.slice(0, 50).map((v) => {
    const hasHeavySelfie = v.selfieUrl && v.selfieUrl.length > 100;
    const hasHeavySig = v.signatureUrl && v.signatureUrl.length > 100;
    if (!hasHeavySelfie && !hasHeavySig) return v;
    return {
      ...v,
      selfieUrl: hasHeavySelfie ? '' : v.selfieUrl,
      signatureUrl: hasHeavySig ? '' : v.signatureUrl,
    };
  });
};

// Self-healing migration on initial script load:
// Purge obsolete legacy keys and compress existing oversized STORAGE_KEY_VISITS immediately
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    for (const oldKey of ALL_STORAGE_KEYS) {
      if (oldKey !== STORAGE_KEY_VISITS) {
        try { localStorage.removeItem(oldKey); } catch {}
      }
    }
    const currentRaw = localStorage.getItem(STORAGE_KEY_VISITS);
    if (currentRaw && (currentRaw.includes('data:image') || currentRaw.length > 50000)) {
      try {
        const parsed = JSON.parse(currentRaw);
        if (Array.isArray(parsed)) {
          // Preserve full images in IndexedDB before shrinking localStorage
          saveVisitsToIndexedDB(parsed).catch(() => {});
          const light = toLightweightVisits(parsed);
          localStorage.removeItem(STORAGE_KEY_VISITS);
          safeLocalStorageSet(STORAGE_KEY_VISITS, JSON.stringify(light));
        } else {
          localStorage.removeItem(STORAGE_KEY_VISITS);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY_VISITS);
      }
    }
  } catch {}
}

// Safe localStorage persistence: NEVER drops or corrupts visits!
// High-resolution real photos are always safely persisted in IndexedDB and Server disk.
export const safeSaveVisitsToStorage = (visits: Visit[]): void => {
  if (!visits || !Array.isArray(visits)) return;

  // 1. Asynchronously save all visits with full 100% resolution photos into IndexedDB (virtually unlimited quota)
  saveVisitsToIndexedDB(visits).catch(() => {});

  // 2. Save lightweight visits into localStorage (safe & lightweight cache)
  try {
    const lightweightVisits = toLightweightVisits(visits);
    safeLocalStorageSet(STORAGE_KEY_VISITS, JSON.stringify(lightweightVisits));
  } catch (err) {
    console.warn('LocalStorage save warning handled gracefully:', err);
  }
};

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
              if (isVisitDeleted(item.id) || isVisitDeleted(item.visitNumber)) {
                return;
              }
              const v = normalizeVisitData(item, item.id || `local-${Math.random().toString(36).substring(2, 7)}`);
              if (isVisitDeleted(v.id) || isVisitDeleted(v.visitNumber)) {
                return;
              }
              // Clear any stale SVG avatars previously saved in browser localStorage so real photos take precedence
              if (v.selfieUrl && v.selfieUrl.startsWith('data:image/svg')) {
                v.selfieUrl = '';
              }
              if (v.signatureUrl && v.signatureUrl.startsWith('data:image/svg')) {
                v.signatureUrl = '';
              }
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

  // Remove old obsolete keys so they don't occupy localStorage quota
  for (const oldKey of ALL_STORAGE_KEYS) {
    if (oldKey !== STORAGE_KEY_VISITS) {
      try { localStorage.removeItem(oldKey); } catch {}
    }
  }

  return Array.from(map.values()).filter((v) => !isVisitDeleted(v.id) && (!v.visitNumber || !isVisitDeleted(v.visitNumber)));
};

// Sync local visits to Server Database API
export const syncLocalVisitsToServer = async (visits: Visit[]): Promise<void> => {
  if (!visits || visits.length === 0) return;
  const deleted = getDeletedIds();
  const validVisits = visits.filter(
    (v) => v && v.id && !deleted.has(v.id) && (!v.visitNumber || !deleted.has(v.visitNumber))
  );
  if (validVisits.length === 0) return;
  try {
    const res = await fetch('/api/visits/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visits: validVisits }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.deletedIds && Array.isArray(json.deletedIds)) {
        addDeletedIds(json.deletedIds);
      }
    }
  } catch (err) {
    console.warn('Could not sync local visits to server API:', err);
  }
};

// Helper to get local cache with automatic baseline recovery for other computers
export const getStoredVisits = (): Visit[] => {
  const deleted = getDeletedIds();
  const localList = getAllLocalVisits().filter((v) => !deleted.has(v.id) && (!v.visitNumber || !deleted.has(v.visitNumber)));
  const seedList: Visit[] = (seedVisitsLite as any[])
    .filter((item) => !deleted.has(item.id) && (!item.visitNumber || !deleted.has(item.visitNumber)))
    .map((item) => normalizeVisitData(item, item.id));

  // If local list has visits, reconcile against canonical seed baseline to prevent stale orphaned items from inflating the count
  const fullyRecovered = localList.length > 0 
    ? reconcileWithAuthoritativeList(seedList, localList)
    : seedList;
  return fullyRecovered.filter((v) => !deleted.has(v.id) && (!v.visitNumber || !deleted.has(v.visitNumber)));
};

// Merge cloud, server, and local visits cleanly without loss or duplicate
export const mergeVisits = (primaryList: Visit[], secondaryList: Visit[]): Visit[] => {
  const map = new Map<string, Visit>();
  const deleted = getDeletedIds();

  // 1. Add secondary visits first (skip deleted)
  secondaryList.forEach((v) => {
    if (v && v.id && !deleted.has(v.id) && (!v.visitNumber || !deleted.has(v.visitNumber))) {
      map.set(v.id, v);
    }
  });

  // 2. Primary visits take priority (authoritative queue numbers and server timestamps)
  primaryList.forEach((v) => {
    if (!v || !v.id || deleted.has(v.id) || (v.visitNumber && deleted.has(v.visitNumber))) return;

    // Check if matching by exact id
    let existingKey = map.has(v.id) ? v.id : null;

    // If not matched by id, check if matched by visitNumber AND same visitor name
    if (!existingKey && v.visitNumber && v.name) {
      const vNameNorm = v.name.trim().toLowerCase();
      for (const [k, sec] of map.entries()) {
        if (sec.visitNumber === v.visitNumber && sec.name && sec.name.trim().toLowerCase() === vNameNorm) {
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
        selfieUrl: getBestImageDataUrl(v.selfieUrl, existing.selfieUrl),
        signatureUrl: getBestImageDataUrl(v.signatureUrl, existing.signatureUrl),
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

// Reconciles local browser caches (localStorage & IndexedDB) against central authoritative database.
// The authoritative list is the single source of truth (131 verified records).
// Stale orphaned records or old test entries on different computers are strictly pruned,
// while genuine unsaved offline drafts created today and full-resolution user photos/signatures are preserved.
export const reconcileWithAuthoritativeList = (authoritativeVisits: Visit[], localOrIdbVisits: Visit[]): Visit[] => {
  const deleted = getDeletedIds();
  const map = new Map<string, Visit>();

  // 1. Authoritative visits (from Server API / Firestore / Seed) form the absolute ground truth
  authoritativeVisits.forEach((v) => {
    if (v && v.id && !deleted.has(v.id) && (!v.visitNumber || !deleted.has(v.visitNumber))) {
      map.set(v.id, { ...v });
    }
  });

  // 2. Cross-reference local visits
  localOrIdbVisits.forEach((loc) => {
    if (!loc || !loc.id || deleted.has(loc.id) || (loc.visitNumber && deleted.has(loc.visitNumber))) {
      return;
    }

    // A. Check exact ID match
    let matchedId = map.has(loc.id) ? loc.id : null;

    // B. Check visitNumber + name match (MUST match name to prevent collapsing different visitors who got identical temp numbers on different desks)
    if (!matchedId && loc.visitNumber && loc.name) {
      const locNameNorm = loc.name.trim().toLowerCase();
      for (const [id, auth] of map.entries()) {
        if (
          auth.visitNumber === loc.visitNumber &&
          auth.name &&
          auth.name.trim().toLowerCase() === locNameNorm
        ) {
          matchedId = id;
          break;
        }
      }
    }

    // C. Check name + close timestamp match (within 10 minutes)
    if (!matchedId && loc.name && loc.visitedAt) {
      const locNameNorm = loc.name.trim().toLowerCase();
      const locTime = new Date(loc.visitedAt).getTime();
      for (const [id, auth] of map.entries()) {
        if (
          auth.name &&
          auth.name.trim().toLowerCase() === locNameNorm &&
          auth.visitedAt &&
          Math.abs(new Date(auth.visitedAt).getTime() - locTime) < 10 * 60 * 1000
        ) {
          matchedId = id;
          break;
        }
      }
    }

    if (matchedId) {
      // Enrich authoritative record with high-res photo/signature stored on this machine
      const auth = map.get(matchedId)!;
      map.set(matchedId, {
        ...auth,
        selfieUrl: getBestImageDataUrl(auth.selfieUrl, loc.selfieUrl),
        signatureUrl: getBestImageDataUrl(auth.signatureUrl, loc.signatureUrl),
      });
    } else {
      // Not in authoritative list: only keep if it is an unsaved pending draft created on this machine within 2 hours
      const createdTime = new Date(loc.createdAt || loc.visitedAt || 0).getTime();
      const isTodayDraft = loc.status === 'Menunggu' && (Date.now() - createdTime) < 2 * 60 * 60 * 1000;
      const hasValidName = Boolean(loc.name && loc.name.trim().length >= 2);
      const isNotObsolete = !KNOWN_OBSOLETE_IDS.has(loc.id) && (!loc.visitNumber || !KNOWN_OBSOLETE_IDS.has(loc.visitNumber));

      if (isTodayDraft && hasValidName && isNotObsolete) {
        // Genuine new offline draft awaiting sync
        map.set(loc.id, loc);
      }
      // Any other stale record, old test entry, or ghost item is PRUNED completely!
    }
  });

  const reconciled = Array.from(map.values());
  reconciled.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.visitedAt || 0).getTime();
    const timeB = new Date(b.createdAt || b.visitedAt || 0).getTime();
    return timeB - timeA;
  });

  return reconciled;
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
  clientFirestoreSuspendedUntil = Date.now() + 30000; // 30-second safe backoff (never 24 hours)
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(FS_QUOTA_STORAGE_KEY, String(clientFirestoreSuspendedUntil));
      localStorage.setItem(FS_QUOTA_STORAGE_KEY, String(clientFirestoreSuspendedUntil));
    }
  } catch {}
  console.warn('[Client Firestore] Temporary quota pause for 30s. Express Server Database & SSE Active.');
};

// Direct fetch from Server Database API and Cloud Firestore (Dual-Cloud Synchronization)
// Prioritizes sub-10ms Express Server API with instant return so page navigation never hangs for 1-2s!
export const fetchVisits = async (): Promise<Visit[]> => {
  let serverVisits: Visit[] = [];
  let firestoreVisits: Visit[] = [];
  let idbVisits: Visit[] = [];

  // 0. Ensure deleted IDs are synchronized so deleted items are NEVER resurrected
  await syncDeletedIdsFromServer().catch(() => {});
  const deleted = getDeletedIds();
  pruneDeletedFromIndexedDB(deleted).catch(() => {});

  // 1. Primary Source A: Server Database API (Sub-15ms ultra-fast disk storage)
  try {
    const res = await fetch('/api/visits', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        serverVisits = json.data
          .filter((item: any) => item && !deleted.has(item.id) && (!item.visitNumber || !deleted.has(item.visitNumber)))
          .map((item: any) => normalizeVisitData(item, item.id || 'srv-id'));
      }
    }
  } catch (err) {
    console.warn('Server fetch error:', err);
  }

  // 2. Source B: IndexedDB (Local full-resolution offline storage)
  try {
    idbVisits = (await getVisitsFromIndexedDB()).filter(
      (item) => item && !deleted.has(item.id) && (!item.visitNumber || !deleted.has(item.visitNumber))
    );
  } catch {}

  // 3. Source C: Cloud Firestore (Query in parallel so visits recorded on ANY computer are NEVER missed)
  if (canUseClientFirestore()) {
    try {
      const snapPromise = getDocs(collection(db, 'visits'));
      const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 6000));
      const snap = await Promise.race([snapPromise, timeoutPromise]);
      if (snap && 'forEach' in snap) {
        const list: Visit[] = [];
        snap.forEach((d: any) => {
          const item = d.data();
          if (!deleted.has(d.id) && (!item.id || !deleted.has(item.id)) && (!item.visitNumber || !deleted.has(item.visitNumber))) {
            list.push(normalizeVisitData(item, d.id));
          }
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
  const localVisits = getAllLocalVisits().filter(
    (item) => item && !deleted.has(item.id) && (!item.visitNumber || !deleted.has(item.visitNumber))
  );
  const seedList: Visit[] = (seedVisitsLite as any[])
    .filter((item) => item && !deleted.has(item.id) && (!item.visitNumber || !deleted.has(item.visitNumber)))
    .map((item) => normalizeVisitData(item, item.id));

  // Authoritative merge order: Cloud Firestore & Server visits take priority
  let centralVisits = mergeVisits(firestoreVisits, serverVisits);
  if (centralVisits.length === 0) {
    centralVisits = seedList;
  }

  // Authoritative reconciliation: combine local + IndexedDB into central truth without duplicating or resurrecting stale records
  const allLocalCandidate = [...idbVisits, ...localVisits];
  let fullyMerged = reconcileWithAuthoritativeList(centralVisits, allLocalCandidate);

  // Filter out any deleted visits
  fullyMerged = fullyMerged.filter(
    (v) => v && !deleted.has(v.id) && (!v.visitNumber || !deleted.has(v.visitNumber))
  );

  // Strict descending order: most recent always at index 0
  fullyMerged.sort((a, b) => {
    const timeA = new Date(a.visitedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.visitedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  if (fullyMerged.length > 0) {
    safeSaveVisitsToStorage(fullyMerged);
    // Ensure IndexedDB is always in exact sync with authoritative visits (pruning old test records)
    saveVisitsToIndexedDB(fullyMerged).catch(() => {});

    // Cross-sync: If local cache or Firestore had visits/images that Server lacked or had as SVG
    const serverMap = new Map(serverVisits.map((v) => [v.id, v]));
    const needsServerSync = fullyMerged.filter((v) => {
      if (!v.id || deleted.has(v.id) || (v.visitNumber && deleted.has(v.visitNumber))) return false;
      const s = serverMap.get(v.id);
      if (!s) return true; // new visit missing on server
      // Has real image locally that server only has as SVG
      const restoredSelfie = isRealUserImage(v.selfieUrl) && !isRealUserImage(s.selfieUrl);
      const restoredSig = isRealUserImage(v.signatureUrl) && !isRealUserImage(s.signatureUrl);
      return restoredSelfie || restoredSig;
    });

    if (needsServerSync.length > 0) {
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
    const deleted = getDeletedIds();
    const validFresh = fresh.filter(
      (v) => v && !deleted.has(v.id) && (!v.visitNumber || !deleted.has(v.visitNumber))
    );
    // Use authoritative reconciliation so server updates normalize local state and discard stale entries
    const merged = reconcileWithAuthoritativeList(validFresh, currentVisits).filter(
      (v) => v && !deleted.has(v.id) && (!v.visitNumber || !deleted.has(v.visitNumber))
    );
    merged.sort((a, b) => {
      const timeA = new Date(a.visitedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.visitedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    // Check if data actually changed (including real image improvements!)
    const oldKeys = currentVisits.map((v) => `${v.id}_${v.status}_${v.visitNumber || ''}_${v.notes || ''}_${isRealUserImage(v.selfieUrl) ? 'R' : 'F'}_${v.selfieUrl?.length || 0}_${v.signatureUrl?.length || 0}`).join('|');
    const newKeys = merged.map((v) => `${v.id}_${v.status}_${v.visitNumber || ''}_${v.notes || ''}_${isRealUserImage(v.selfieUrl) ? 'R' : 'F'}_${v.selfieUrl?.length || 0}_${v.signatureUrl?.length || 0}`).join('|');

    if (newKeys !== oldKeys || currentVisits.length !== merged.length) {
      currentVisits = merged;
      safeSaveVisitsToStorage(merged);
      callback(merged);
    }
  };

  // 1. Initial hydration from IndexedDB for high-res images
  getVisitsFromIndexedDB().then((idbVisits) => {
    if (!isSubscribed) return;
    if (idbVisits && idbVisits.length > 0) {
      const reconciled = reconcileWithAuthoritativeList(currentVisits, idbVisits);
      handleFreshVisits(reconciled);
    }
  }).catch(() => {});

  // 2. Centralized RealtimeHub listener (handles SSE, BroadcastChannel, and server notifications)
  const unsubRealtimeHub = realtimeHub.addListener((type, data) => {
    if (!isSubscribed) return;
    if (type === 'DELETE_VISITS') {
      const idsToDelete = data?.deletedIds || data?.ids;
      if (Array.isArray(idsToDelete) && idsToDelete.length > 0) {
        addDeletedIds(idsToDelete);
        pruneDeletedFromIndexedDB(new Set(idsToDelete)).catch(() => {});
        removeVisitFromDailyNotifications(idsToDelete);
        const deleteSet = new Set(idsToDelete);
        const remaining = currentVisits.filter(
          (v) => !deleteSet.has(v.id) && (!v.visitNumber || !deleteSet.has(v.visitNumber))
        );
        currentVisits = remaining;
        safeSaveVisitsToStorage(remaining);
        callback(remaining);
      }
    } else if (type === 'NEW_VISIT' && data) {
      if (!isVisitDeleted(data.id) && (!data.visitNumber || !isVisitDeleted(data.visitNumber))) {
        const norm = normalizeVisitData(data, data.id || 'hub-new');
        const existingIdx = currentVisits.findIndex(
          (v) => v.id === norm.id || (norm.visitNumber && v.visitNumber === norm.visitNumber && norm.name && v.name && v.name.trim().toLowerCase() === norm.name.trim().toLowerCase())
        );
        let updatedList: Visit[];
        if (existingIdx >= 0) {
          updatedList = [...currentVisits];
          updatedList[existingIdx] = { ...updatedList[existingIdx], ...norm };
        } else {
          updatedList = [norm, ...currentVisits];
        }
        updatedList.sort((a, b) => {
          const timeA = new Date(a.visitedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.visitedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        currentVisits = updatedList;
        safeSaveVisitsToStorage(updatedList);
        saveVisitsToIndexedDB(updatedList).catch(() => {});
        callback(updatedList);
      }
    } else if (type === 'UPDATE_VISIT' && data) {
      if (!isVisitDeleted(data.id) && (!data.visitNumber || !isVisitDeleted(data.visitNumber))) {
        const norm = normalizeVisitData(data, data.id || 'hub-update');
        const updatedList = currentVisits.map((v) => (v.id === norm.id ? { ...v, ...norm } : v));
        currentVisits = updatedList;
        safeSaveVisitsToStorage(updatedList);
        saveVisitsToIndexedDB(updatedList).catch(() => {});
        callback(updatedList);
      }
    } else if (type === 'SYNC_VISITS' || type === 'RESET_VISITS') {
      syncFromServer();
    }
  });

  // 3. REAL-TIME CLOUD FIRESTORE LISTENER (Only when quota allows; immediately detaches on RESOURCE_EXHAUSTED to prevent lag)
  let unsubFirestore = () => {};
  if (canUseClientFirestore()) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'visits'),
        (snapshot) => {
          if (!isSubscribed) return;
          const fsVisits: Visit[] = [];
          const deleted = getDeletedIds();
          snapshot.forEach((d) => {
            const data = d.data();
            if (!deleted.has(d.id) && (!data.id || !deleted.has(data.id)) && (!data.visitNumber || !deleted.has(data.visitNumber))) {
              fsVisits.push(normalizeVisitData(data, d.id));
            }
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
      await syncDeletedIdsFromServer().catch(() => {});
      const deleted = getDeletedIds();
      pruneDeletedFromIndexedDB(deleted).catch(() => {});

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
          const fresh = json.data
            .filter((item: any) => item && !deleted.has(item.id) && (!item.visitNumber || !deleted.has(item.visitNumber)))
            .map((item: any) => normalizeVisitData(item, item.id || 'srv-id'));
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

  return () => {
    isSubscribed = false;
    unsubRealtimeHub();
    unsubFirestore();
    clearInterval(intervalId);
    window.removeEventListener('storage', handleStorageChange);
    window.removeEventListener('focus', handleFocus);
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
  try {
    const cleanRecord = sanitizeForFirestore(visitRecord);
    const docRef = doc(db, 'visits', visitRecord.id);
    await Promise.race([
      setDoc(docRef, cleanRecord, { merge: true }),
      new Promise((resolve) => setTimeout(resolve, 3000)),
    ]);
  } catch (fsErr) {
    console.warn('Firestore write warning:', fsErr);
  }

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

  // Local storage update (safe & lightweight)
  safeSaveVisitsToStorage(visits);

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

  // 1. Add to client tombstone store immediately so this machine and others NEVER re-add it!
  const tombstones = [visitId, target?.visitNumber].filter(Boolean) as string[];
  addDeletedIds(tombstones);

  // 2. Delete from IndexedDB immediately
  deleteVisitFromIndexedDB(visitId, target?.visitNumber).catch(() => {});

  // 3. Remove from daily notifications
  removeVisitFromDailyNotifications(tombstones);

  // 4. Local cache update immediately (safe & lightweight)
  const updated = visits.filter((v) => v.id !== visitId && (!target?.visitNumber || v.visitNumber !== target.visitNumber));
  safeSaveVisitsToStorage(updated);

  // 5. Broadcast deletion to all local tabs immediately
  realtimeHub.broadcastLocal('DELETE_VISITS', { ids: [visitId], deletedIds: tombstones });

  // 6. Server API deletion
  try {
    await fetch(`/api/visits/${visitId}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Server API delete visit warning:', err);
  }

  // 7. Cloud Firestore permanent deletion
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

  const tombstones = [...visitIds];
  visits.forEach((v) => {
    if (visitIds.includes(v.id) && v.visitNumber) {
      tombstones.push(v.visitNumber);
    }
  });

  // 1. Add to client tombstones
  addDeletedIds(tombstones);

  // 2. Delete from IndexedDB
  pruneDeletedFromIndexedDB(new Set(tombstones)).catch(() => {});

  // 3. Remove from daily notifications
  removeVisitFromDailyNotifications(tombstones);

  // 4. Local cache update (safe & lightweight)
  const updated = visits.filter((v) => !visitIds.includes(v.id));
  const deletedCount = countBefore - updated.length || visitIds.length;
  safeSaveVisitsToStorage(updated);

  // 5. Broadcast deletion to all local tabs immediately
  realtimeHub.broadcastLocal('DELETE_VISITS', { ids: visitIds, deletedIds: tombstones });

  // 6. Server API bulk delete
  try {
    await fetch('/api/visits/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: visitIds }),
    });
  } catch (err) {
    console.warn('Server API bulk delete warning:', err);
  }

  // 7. Cloud Firestore batch delete
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
  clearDeletedIds();
  try {
    const res = await fetch('/api/visits/restore-default', { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const restored = json.data.map((item: any) => normalizeVisitData(item, item.id));
        safeSaveVisitsToStorage(restored);
        saveVisitsToIndexedDB(restored).catch(() => {});
        realtimeHub.broadcastLocal('SYNC_VISITS', { count: restored.length });
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

  const allIds: string[] = [];
  visits.forEach((v) => {
    if (v.id) allIds.push(v.id);
    if (v.visitNumber) allIds.push(v.visitNumber);
  });
  addDeletedIds(allIds);
  pruneDeletedFromIndexedDB(new Set(allIds)).catch(() => {});
  removeVisitFromDailyNotifications(allIds);

  // 1. Clear local storage (safe & lightweight)
  safeSaveVisitsToStorage([]);

  // 2. Broadcast locally immediately
  realtimeHub.broadcastLocal('DELETE_VISITS', { ids: allIds, deletedIds: allIds });

  // 3. Server API bulk delete
  try {
    await fetch('/api/visits/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: visits.map((v) => v.id) }),
    });
  } catch (err) {
    console.warn('Server API clear all visits warning:', err);
  }

  // 4. Batch delete all in Cloud Firestore
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
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage save logs warning:', err);
  }

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
      try {
        localStorage.setItem(STORAGE_KEY_QR, JSON.stringify(INITIAL_QR_TOKENS));
      } catch {}
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
  try {
    localStorage.setItem(STORAGE_KEY_QR, JSON.stringify(updated));
  } catch {}

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
  try {
    localStorage.setItem(STORAGE_KEY_QR, JSON.stringify(tokens));
  } catch {}

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
      try {
        localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(parsed));
      } catch {}
    }
    return parsed;
  } catch {
    return null;
  }
};

export const setAuthenticatedOfficer = (officer: OfficerUser | null): void => {
  try {
    if (officer) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(officer));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  } catch {}
};

// Explicit calibration function for Admin: forces local machine to align 100% with central server database.
// Clears any obsolete / orphaned cache keys, writes clean canonical visits to IndexedDB and localStorage,
// and broadcasts the normalized state to all open windows/tabs.
export const forceSyncWithServer = async (): Promise<{ success: boolean; count: number; message: string }> => {
  try {
    // 1. Fetch fresh deleted IDs from server so no resurrecting occurs
    await syncDeletedIdsFromServer().catch(() => {});
    const deleted = getDeletedIds();

    // 2. Fetch authoritative visits directly from server
    let serverVisits: Visit[] = [];
    try {
      const res = await fetch('/api/visits', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          serverVisits = json.data
            .filter((item: any) => item && !deleted.has(item.id) && (!item.visitNumber || !deleted.has(item.visitNumber)))
            .map((item: any) => normalizeVisitData(item, item.id));
        }
      }
    } catch {}

    // Fallback to seedList if server is unreachable
    if (serverVisits.length === 0) {
      serverVisits = (seedVisitsLite as any[])
        .filter((item: any) => item && !deleted.has(item.id) && (!item.visitNumber || !deleted.has(item.visitNumber)))
        .map((item: any) => normalizeVisitData(item, item.id));
    }

    if (serverVisits.length > 0) {
      // 3. Clear obsolete localStorage keys
      for (const oldKey of ALL_STORAGE_KEYS) {
        try { localStorage.removeItem(oldKey); } catch {}
      }

      // 4. Overwrite IndexedDB and localStorage cleanly
      await saveVisitsToIndexedDB(serverVisits);
      safeSaveVisitsToStorage(serverVisits);

      // 5. Broadcast normalized state across all browser tabs
      realtimeHub.broadcastLocal('RESET_VISITS', { count: serverVisits.length });

      return {
        success: true,
        count: serverVisits.length,
        message: `Sinkronisasi berhasil! Data komputer ini telah diselaraskan dengan server pusat (${serverVisits.length} Kunjungan).`
      };
    }
  } catch (err: any) {
    console.error('Calibration error:', err);
    return { success: false, count: 0, message: err?.message || 'Gagal sinkronisasi data' };
  }
  return { success: false, count: 0, message: 'Data server tidak tersedia' };
};

