import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initializeApp as initFirebaseApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

const app = express();
const PORT = 3000;

// Increase body limit for photo selfies and signature images
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const VISITS_FILE = path.join(DATA_DIR, 'visits.json');
const LOGS_FILE = path.join(DATA_DIR, 'activity_logs.json');

// Default initial visits for Posbakum Pengadilan Agama Banjarmasin
const DEFAULT_VISITS = [
  {
    id: 'vst-20260907-001',
    visitNumber: 'KJG-20260907-0001',
    name: 'Siti Rahmah, S.Pd',
    ktpAddress: 'Jl. Sutoyo S No. 42, RT 12 RW 02, Kel. Teluk Dalam, Kec. Banjarmasin Tengah',
    domicileAddress: 'Jl. Sutoyo S No. 42, RT 12 RW 02, Kel. Teluk Dalam, Kec. Banjarmasin Tengah',
    domicileSameAsKtp: true,
    email: 'siti.rahmah89@gmail.com',
    whatsapp: '0812-5182-3912',
    occupation: 'Guru / Tenaga Pendidik',
    caseCategory: 'Hukum Keluarga & Perkawinan',
    caseType: 'Gugatan Perceraian (Cerai Gugat)',
    selfieUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23047857"/><circle cx="100" cy="80" r="35" fill="%23ecfdf5"/><path d="M45 165 C45 125 155 125 155 165 Z" fill="%23ecfdf5"/><text x="100" y="190" font-family="sans-serif" font-size="12" fill="%23ffffff" text-anchor="middle">Foto KTP / Pengunjung</text></svg>',
    selfieFileName: 'KJG-20260907-0001-selfie.jpg',
    signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><path d="M30 90 Q 70 30, 110 80 T 170 85 T 230 75 Q 260 90, 270 60" stroke="%23047857" stroke-width="3" fill="none"/></svg>',
    signatureFileName: 'KJG-20260907-0001-signature.png',
    qrToken: 'POSBAKUM-MEJA-1',
    status: 'Diproses',
    visitedAt: '2026-09-07T08:45:00.000Z',
    createdAt: '2026-09-07T08:45:00.000Z',
    dateDisplay: 'Senin, 7 September 2026',
    timeDisplay: '08:45 WITA',
    notes: 'Konsultasi berkas gugatan dan syarat prodeo',
    officerName: 'Petugas Posbakum Meja 1'
  },
  {
    id: 'vst-20260907-002',
    visitNumber: 'KJG-20260907-0002',
    name: 'Muhammad Fahmi, S.E',
    ktpAddress: 'Jl. Veteran Gg. Dwikora No. 15, RT 08, Kec. Banjarmasin Timur',
    domicileAddress: 'Jl. Veteran Gg. Dwikora No. 15, RT 08, Kec. Banjarmasin Timur',
    domicileSameAsKtp: true,
    email: 'fahmi.mhd@yahoo.com',
    whatsapp: '0852-4891-2041',
    occupation: 'Wiraswasta / Pedagang',
    caseCategory: 'Hukum Keluarga & Perkawinan',
    caseType: 'Permohonan Isbat Nikah (Pengesahan Nikah)',
    selfieUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23065f46"/><circle cx="100" cy="80" r="35" fill="%23ecfdf5"/><path d="M45 165 C45 125 155 125 155 165 Z" fill="%23ecfdf5"/><text x="100" y="190" font-family="sans-serif" font-size="12" fill="%23ffffff" text-anchor="middle">Foto KTP / Pengunjung</text></svg>',
    selfieFileName: 'KJG-20260907-0002-selfie.jpg',
    signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><path d="M40 85 Q 90 40, 130 90 T 190 70 T 260 80" stroke="%23065f46" stroke-width="3" fill="none"/></svg>',
    signatureFileName: 'KJG-20260907-0002-signature.png',
    qrToken: 'POSBAKUM-MEJA-1',
    status: 'Menunggu',
    visitedAt: '2026-09-07T09:30:00.000Z',
    createdAt: '2026-09-07T09:30:00.000Z',
    dateDisplay: 'Senin, 7 September 2026',
    timeDisplay: '09:30 WITA',
    notes: 'Permohonan isbat nikah untuk pengurusan akta anak',
    officerName: ''
  },
  {
    id: 'vst-20260905-001',
    visitNumber: 'KJG-20260905-0001',
    name: 'Rusmini Binti Hamdani',
    ktpAddress: 'Jl. Pramuka Km. 6, Komplek Melati Indah No. 18, Banjarmasin Timur',
    domicileAddress: 'Jl. Pramuka Km. 6, Komplek Melati Indah No. 18, Banjarmasin Timur',
    domicileSameAsKtp: true,
    email: '',
    whatsapp: '0821-5541-0982',
    occupation: 'Ibu Rumah Tangga',
    caseCategory: 'Hukum Keluarga & Perkawinan',
    caseType: 'Permohonan Dispensasi Kawin',
    selfieUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23047857"/><circle cx="100" cy="80" r="35" fill="%23ecfdf5"/><path d="M45 165 C45 125 155 125 155 165 Z" fill="%23ecfdf5"/><text x="100" y="190" font-family="sans-serif" font-size="12" fill="%23ffffff" text-anchor="middle">Foto KTP / Pengunjung</text></svg>',
    selfieFileName: 'KJG-20260905-0001-selfie.jpg',
    signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><path d="M30 80 Q 70 20, 120 70 T 180 80 T 250 65" stroke="%23047857" stroke-width="3" fill="none"/></svg>',
    signatureFileName: 'KJG-20260905-0001-signature.png',
    qrToken: 'DIRECT-WEB',
    status: 'Selesai',
    visitedAt: '2026-09-05T10:15:00.000Z',
    createdAt: '2026-09-05T10:15:00.000Z',
    dateDisplay: 'Sabtu, 5 September 2026',
    timeDisplay: '10:15 WITA',
    notes: 'Pembuatan surat permohonan dispensasi kawin telah selesai',
    officerName: 'Admin Posbakum'
  },
  {
    id: 'vst-20260904-001',
    visitNumber: 'KJG-20260904-0001',
    name: 'Akhmad Zulkifli',
    ktpAddress: 'Jl. Belitung Darat No. 88, RT 05, Kel. Kuin Selatan, Banjarmasin Barat',
    domicileAddress: 'Jl. Belitung Darat No. 88, RT 05, Kel. Kuin Selatan, Banjarmasin Barat',
    domicileSameAsKtp: true,
    email: 'zulkifli.akhmad@gmail.com',
    whatsapp: '0813-4921-6543',
    occupation: 'Karyawan Swasta',
    caseCategory: 'Hukum Waris & Harta Bersama',
    caseType: 'Konsultasi Hukum Waris & Harta Bersama',
    selfieUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23065f46"/><circle cx="100" cy="80" r="35" fill="%23ecfdf5"/><path d="M45 165 C45 125 155 125 155 165 Z" fill="%23ecfdf5"/><text x="100" y="190" font-family="sans-serif" font-size="12" fill="%23ffffff" text-anchor="middle">Foto KTP / Pengunjung</text></svg>',
    selfieFileName: 'KJG-20260904-0001-selfie.jpg',
    signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><path d="M40 90 Q 80 40, 140 85 T 200 80 T 260 70" stroke="%23065f46" stroke-width="3" fill="none"/></svg>',
    signatureFileName: 'KJG-20260904-0001-signature.png',
    qrToken: 'POSBAKUM-MEJA-1',
    status: 'Selesai',
    visitedAt: '2026-09-04T11:20:00.000Z',
    createdAt: '2026-09-04T11:20:00.000Z',
    dateDisplay: 'Jumat, 4 September 2026',
    timeDisplay: '11:20 WITA',
    notes: 'Pemberian informasi hukum pembagian harta waris secara Islam',
    officerName: 'Admin Posbakum'
  },
  {
    id: 'vst-20260902-001',
    visitNumber: 'KJG-20260902-0001',
    name: 'Nurul Hidayah',
    ktpAddress: 'Jl. Pangeran Hidayatullah, Banua Anyar RT 11, Banjarmasin Timur',
    domicileAddress: 'Jl. Pangeran Hidayatullah, Banua Anyar RT 11, Banjarmasin Timur',
    domicileSameAsKtp: true,
    email: 'nurul.hidayah@gmail.com',
    whatsapp: '0878-1422-9011',
    occupation: 'PNS / ASN',
    caseCategory: 'Hukum Keluarga & Perkawinan',
    caseType: 'Gugatan Perceraian (Cerai Gugat)',
    selfieUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23047857"/><circle cx="100" cy="80" r="35" fill="%23ecfdf5"/><path d="M45 165 C45 125 155 125 155 165 Z" fill="%23ecfdf5"/><text x="100" y="190" font-family="sans-serif" font-size="12" fill="%23ffffff" text-anchor="middle">Foto KTP / Pengunjung</text></svg>',
    selfieFileName: 'KJG-20260902-0001-selfie.jpg',
    signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><path d="M30 85 Q 75 35, 125 80 T 185 85 T 260 75" stroke="%23047857" stroke-width="3" fill="none"/></svg>',
    signatureFileName: 'KJG-20260902-0001-signature.png',
    qrToken: 'POSBAKUM-MEJA-1',
    status: 'Selesai',
    visitedAt: '2026-09-02T09:10:00.000Z',
    createdAt: '2026-09-02T09:10:00.000Z',
    dateDisplay: 'Rabu, 2 September 2026',
    timeDisplay: '09:10 WITA',
    notes: 'Pembuatan gugatan dan lampiran izin atasan',
    officerName: 'Admin Posbakum'
  },
  {
    id: 'vst-20260901-001',
    visitNumber: 'KJG-20260901-0001',
    name: 'H. Gusti Arifin',
    ktpAddress: 'Jl. Sultan Adam Komplek Taekwondo Permai No. 23, Banjarmasin Utara',
    domicileAddress: 'Jl. Sultan Adam Komplek Taekwondo Permai No. 23, Banjarmasin Utara',
    domicileSameAsKtp: true,
    email: 'gusti.arifin@gmail.com',
    whatsapp: '0851-5678-1234',
    occupation: 'Pensiunan',
    caseCategory: 'Hukum Waris & Harta Bersama',
    caseType: 'Permohonan Penetapan Ahli Waris',
    selfieUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23065f46"/><circle cx="100" cy="80" r="35" fill="%23ecfdf5"/><path d="M45 165 C45 125 155 125 155 165 Z" fill="%23ecfdf5"/><text x="100" y="190" font-family="sans-serif" font-size="12" fill="%23ffffff" text-anchor="middle">Foto KTP / Pengunjung</text></svg>',
    selfieFileName: 'KJG-20260901-0001-selfie.jpg',
    signatureUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150"><path d="M40 80 Q 90 30, 140 80 T 210 75 T 270 70" stroke="%23065f46" stroke-width="3" fill="none"/></svg>',
    signatureFileName: 'KJG-20260901-0001-signature.png',
    qrToken: 'DIRECT-WEB',
    status: 'Selesai',
    visitedAt: '2026-09-01T10:00:00.000Z',
    createdAt: '2026-09-01T10:00:00.000Z',
    dateDisplay: 'Selasa, 1 September 2026',
    timeDisplay: '10:00 WITA',
    notes: 'Permohonan penetapan ahli waris untuk perbankan',
    officerName: 'Admin Posbakum'
  }
];

// Helper to read visits from disk
function readVisitsFromDisk(): any[] {
  try {
    if (fs.existsSync(VISITS_FILE)) {
      const raw = fs.readFileSync(VISITS_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
    // Initialize with default visits
    fs.writeFileSync(VISITS_FILE, JSON.stringify(DEFAULT_VISITS, null, 2), 'utf8');
    return DEFAULT_VISITS;
  } catch (err) {
    console.error('Error reading visits file:', err);
    return DEFAULT_VISITS;
  }
}

// Helper to save visits to disk
function saveVisitsToDisk(visits: any[]): void {
  try {
    fs.writeFileSync(VISITS_FILE, JSON.stringify(visits, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing visits file:', err);
  }
}

// Helper for logs
function readLogsFromDisk(): any[] {
  try {
    if (fs.existsSync(LOGS_FILE)) {
      const raw = fs.readFileSync(LOGS_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

function saveLogsToDisk(logs: any[]): void {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing logs file:', err);
  }
}

// Helper to obtain authoritative date/time in Asia/Makassar (WITA, UTC+8)
function getWitaDateInfo(dateInput?: Date | string | number) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const valid = isNaN(d.getTime()) ? new Date() : d;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(valid);
    const getP = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const y = parseInt(getP('year'), 10) || valid.getFullYear();
    const m = getP('month').padStart(2, '0');
    const dStr = getP('day').padStart(2, '0');
    let h = getP('hour').padStart(2, '0');
    if (h === '24') h = '00';
    const min = getP('minute').padStart(2, '0');
    const dateStr = `${y}${m}${dStr}`;
    const todayPrefix = `KJG-${dateStr}-`;
    return { y, m, d: dStr, h, min, dateStr, todayPrefix };
  } catch {
    const utc = valid.getTime() + valid.getTimezoneOffset() * 60000;
    const w = new Date(utc + 8 * 3600000);
    const y = w.getFullYear();
    const m = String(w.getMonth() + 1).padStart(2, '0');
    const dStr = String(w.getDate()).padStart(2, '0');
    const h = String(w.getHours()).padStart(2, '0');
    const min = String(w.getMinutes()).padStart(2, '0');
    const dateStr = `${y}${m}${dStr}`;
    const todayPrefix = `KJG-${dateStr}-`;
    return { y, m, d: dStr, h, min, dateStr, todayPrefix };
  }
}

// Enforce strictly unique, chronologically sequential queue numbers across visits
function enforceUniqueQueueNumbers(list: any[]): boolean {
  if (!Array.isArray(list) || list.length === 0) return false;
  let changed = false;
  const groups = new Map<string, any[]>();

  list.forEach((v) => {
    if (!v) return;
    const { todayPrefix } = getWitaDateInfo(v.visitedAt || v.createdAt);
    if (!groups.has(todayPrefix)) groups.set(todayPrefix, []);
    groups.get(todayPrefix)!.push(v);
  });

  groups.forEach((items, prefix) => {
    items.sort((a, b) => {
      const tA = new Date(a.visitedAt || a.createdAt || 0).getTime();
      const tB = new Date(b.visitedAt || b.createdAt || 0).getTime();
      return tA - tB;
    });

    const usedNumbers = new Set<string>();
    let maxSeq = 0;

    items.forEach((item) => {
      let num = item.visitNumber;
      if (!num || !num.startsWith(prefix) || usedNumbers.has(num)) {
        maxSeq++;
        num = `${prefix}${String(maxSeq).padStart(4, '0')}`;
        while (usedNumbers.has(num)) {
          maxSeq++;
          num = `${prefix}${String(maxSeq).padStart(4, '0')}`;
        }
        item.visitNumber = num;
        changed = true;
      } else {
        const parts = num.split('-');
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
      usedNumbers.add(item.visitNumber);
    });
  });

  return changed;
}

// In-memory cache synced with disk
let visitsCache: any[] = readVisitsFromDisk();
if (enforceUniqueQueueNumbers(visitsCache)) {
  saveVisitsToDisk(visitsCache);
  console.log('[Server] Startup queue numbers sanitized and saved.');
}

// Mutex lock promise queue to guarantee atomic queue numbers under concurrent requests
let visitSaveQueue: Promise<any> = Promise.resolve();

// Real-time cross-computer notification buffer
interface ServerNotification {
  id: string;
  visitId: string;
  visit: any;
  timestamp: number;
  createdAt: string;
}

let recentNotifications: ServerNotification[] = [];

// Cloud Firestore initialization in server for multi-instance & multi-computer real-time data sync
let serverFirestoreDb: any = null;
try {
  const configPath = path.join(process.cwd(), 'src', 'firebase-config.json');
  if (fs.existsSync(configPath)) {
    const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const serverFbApp = initFirebaseApp(fbConfig, 'server-app');
    serverFirestoreDb = getFirestore(serverFbApp, fbConfig.firestoreDatabaseId);
    console.log('[Server Firestore] Initialized with databaseId:', fbConfig.firestoreDatabaseId);
  }
} catch (e: any) {
  console.warn('[Server Firestore] Init warning:', e.message);
}

// Helper to check if an image is a real captured/drawn user image (JPEG, PNG, WebP, HTTP, Blob - NOT SVG)
function isRealUserImage(url?: string): boolean {
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
}

// Pick the best image: real user captured/drawn image ALWAYS wins over an SVG placeholder!
function pickBestImage(imgA?: string, imgB?: string): string {
  const aReal = isRealUserImage(imgA);
  const bReal = isRealUserImage(imgB);
  if (aReal && !bReal) return imgA!;
  if (!aReal && bReal) return imgB!;
  if (aReal && bReal) {
    return (imgA?.length || 0) >= (imgB?.length || 0) ? imgA! : imgB!;
  }
  return imgA || imgB || '';
}

// Background sync from Cloud Firestore into server cache
async function syncServerWithFirestore() {
  if (!serverFirestoreDb) return;
  try {
    const snap = await getDocs(collection(serverFirestoreDb, 'visits'));
    if (!snap.empty) {
      const fsMap = new Map<string, any>();
      snap.forEach((d) => {
        fsMap.set(d.id, d.data());
      });

      let hasChanges = false;
      const currentMap = new Map<string, any>(visitsCache.map((v) => [v.id, v]));

      for (const [id, fsDoc] of fsMap.entries()) {
        if (!currentMap.has(id)) {
          currentMap.set(id, fsDoc);
          hasChanges = true;
        } else {
          const localDoc = currentMap.get(id);
          const localTime = new Date(localDoc.updatedAt || localDoc.visitedAt || 0).getTime();
          const fsTime = new Date(fsDoc.updatedAt || fsDoc.visitedAt || 0).getTime();
          
          // Real user images are always preserved; never let an SVG overwrite a real photo/signature
          const selfie = pickBestImage(fsDoc.selfieUrl, localDoc.selfieUrl);
          const sig = pickBestImage(fsDoc.signatureUrl, localDoc.signatureUrl);

          const hasImageImprovement = (selfie && selfie !== localDoc.selfieUrl) || (sig && sig !== localDoc.signatureUrl);
          if (fsTime > localTime || hasImageImprovement) {
            currentMap.set(id, { ...localDoc, ...fsDoc, selfieUrl: selfie, signatureUrl: sig });
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        const mergedList = Array.from(currentMap.values());
        enforceUniqueQueueNumbers(mergedList);
        mergedList.sort((a, b) => {
          const timeA = new Date(a.visitedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.visitedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });
        visitsCache = mergedList;
        saveVisitsToDisk(visitsCache);
        console.log(`[Server Firestore] Synced. Cache updated to ${visitsCache.length} visits.`);
      }
    }
  } catch (err: any) {
    console.warn('[Server Firestore] Sync warning:', err.message);
  }
}

// Initial sync and periodic 15-second sync
syncServerWithFirestore();
setInterval(syncServerWithFirestore, 15000);

// ==========================================
// API ROUTES FIRST (BEFORE VITE MIDDLEWARE)
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    visitsCount: visitsCache.length,
  });
});

// GET Client IP and System Information (detects computer/device details)
app.get('/api/client-info', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const forwarded = req.headers['x-forwarded-for'];
  let ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  const userAgent = (req.headers['user-agent'] as string) || 'Unknown Client';
  res.json({
    success: true,
    ip,
    userAgent,
    timestamp: new Date().toISOString(),
  });
});

// GET recent notifications for cross-computer real-time synchronization
app.get('/api/notifications/recent', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  const since = parseInt(req.query.since as string, 10) || 0;
  const filtered = since > 0
    ? recentNotifications.filter((n) => n.timestamp > since)
    : recentNotifications.slice(0, 15);
  res.json({
    success: true,
    count: filtered.length,
    data: filtered,
  });
});

// POST broadcast a new visit notification to all computers
app.post('/api/notifications/broadcast', (req, res) => {
  try {
    const visit = req.body?.visit || req.body;
    if (!visit || !visit.id) {
      return res.status(400).json({ success: false, message: 'Data kunjungan tidak valid.' });
    }
    const notifItem: ServerNotification = {
      id: `notif-${visit.id}-${Date.now()}`,
      visitId: visit.id,
      visit,
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    };
    recentNotifications = [notifItem, ...recentNotifications.filter((n) => n.visitId !== visit.id)].slice(0, 50);

    // Replicate to Cloud Firestore admin_notifications
    if (serverFirestoreDb) {
      setDoc(doc(serverFirestoreDb, 'admin_notifications', notifItem.id), notifItem, { merge: true }).catch(() => {});
    }

    res.json({ success: true, data: notifItem });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all visits (instant, 100% reliable, zero Firestore quota limits)
app.get('/api/visits', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    // Re-read or return in-memory
    if (!visitsCache || visitsCache.length === 0) {
      visitsCache = readVisitsFromDisk();
    }
    res.json({
      success: true,
      count: visitsCache.length,
      data: visitsCache,
    });
  } catch (err: any) {
    console.error('Failed to GET /api/visits:', err);
    res.status(500).json({ success: false, message: err.message, data: [] });
  }
});

// GET next available queue number for today (guaranteed WITA timezone)
app.get('/api/visits/next-number', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  try {
    const { dateStr, todayPrefix } = getWitaDateInfo();

    let maxSeq = 0;
    visitsCache.forEach((v) => {
      if (v.visitNumber && typeof v.visitNumber === 'string' && v.visitNumber.startsWith(todayPrefix)) {
        const parts = v.visitNumber.split('-');
        const lastPart = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastPart) && lastPart > maxSeq) {
          maxSeq = lastPart;
        }
      }
    });

    const nextNumber = `${todayPrefix}${String(maxSeq + 1).padStart(4, '0')}`;
    res.json({ success: true, nextNumber, dateStr, todayCount: maxSeq });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST new visit (atomically assigned queue number & instant storage under serialization lock)
app.post('/api/visits', async (req, res) => {
  // Enqueue this save request to avoid concurrent race-conditions creating duplicate numbers
  visitSaveQueue = visitSaveQueue
    .catch(() => {})
    .then(async () => {
      try {
        const newVisit = req.body;
        if (!newVisit || !newVisit.name) {
          return res.status(400).json({ success: false, message: 'Data kunjungan tidak valid.' });
        }

        const { dateStr, todayPrefix, y, m, d, h, min } = getWitaDateInfo(newVisit.visitedAt || Date.now());

        // Check if visitNumber already exists in cache or needs authoritative generation
        const isVisitNumberTaken = Boolean(
          newVisit.visitNumber &&
          visitsCache.some((v) => v.visitNumber === newVisit.visitNumber && v.id !== newVisit.id)
        );

        if (!newVisit.visitNumber || isVisitNumberTaken || !newVisit.visitNumber.startsWith(todayPrefix)) {
          let maxSeq = 0;
          visitsCache.forEach((v) => {
            if (v.visitNumber && typeof v.visitNumber === 'string' && v.visitNumber.startsWith(todayPrefix)) {
              const parts = v.visitNumber.split('-');
              const lastPart = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(lastPart) && lastPart > maxSeq) {
                maxSeq = lastPart;
              }
            }
          });
          newVisit.visitNumber = `${todayPrefix}${String(maxSeq + 1).padStart(4, '0')}`;
        }

        // Ensure ID and timestamps
        if (!newVisit.id) {
          newVisit.id = `vst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        }
        if (!newVisit.visitedAt) {
          newVisit.visitedAt = new Date().toISOString();
        }
        if (!newVisit.createdAt) {
          newVisit.createdAt = new Date().toISOString();
        }

        // Ensure date & time display in accurate Indonesian WITA format
        if (!newVisit.dateDisplay || !newVisit.timeDisplay) {
          const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          const monthNames = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
          ];
          const dObj = new Date(newVisit.visitedAt);
          const dayIdx = isNaN(dObj.getDay()) ? 0 : dObj.getDay();
          const mIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));

          newVisit.dateDisplay = newVisit.dateDisplay || `${dayNames[dayIdx]}, ${parseInt(d, 10)} ${monthNames[mIdx]} ${y}`;
          newVisit.timeDisplay = newVisit.timeDisplay || `${h}:${min} WITA`;
        }

        // Only update if exact same ID exists, otherwise prepend as a fresh record
        const existingIndex = visitsCache.findIndex((v) => v.id === newVisit.id);
        if (existingIndex >= 0) {
          visitsCache[existingIndex] = { ...visitsCache[existingIndex], ...newVisit };
        } else {
          // Detect accidental rapid double submissions from the same guest
          const recentDuplicateIndex = visitsCache.findIndex(
            (v) =>
              v.name &&
              newVisit.name &&
              v.name.trim().toLowerCase() === newVisit.name.trim().toLowerCase() &&
              v.whatsapp === newVisit.whatsapp &&
              Math.abs(new Date(v.visitedAt || v.createdAt || 0).getTime() - new Date(newVisit.visitedAt || newVisit.createdAt || 0).getTime()) < 60000
          );
          if (recentDuplicateIndex >= 0) {
            visitsCache[recentDuplicateIndex] = { ...visitsCache[recentDuplicateIndex], ...newVisit, id: visitsCache[recentDuplicateIndex].id };
            newVisit.id = visitsCache[recentDuplicateIndex].id;
            newVisit.visitNumber = visitsCache[recentDuplicateIndex].visitNumber;
          } else {
            visitsCache = [newVisit, ...visitsCache];
          }
        }

        // Sanity check to enforce queue number uniqueness across whole list
        enforceUniqueQueueNumbers(visitsCache);

        // Keep visitsCache strictly sorted descending by visitedAt/createdAt (newest first)
        visitsCache.sort((a, b) => {
          const timeA = new Date(a.visitedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.visitedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        saveVisitsToDisk(visitsCache);

        // Register notification in server buffer for cross-computer real-time distribution
        const notifItem: ServerNotification = {
          id: `notif-${newVisit.id}-${Date.now()}`,
          visitId: newVisit.id,
          visit: newVisit,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
        };
        recentNotifications = [notifItem, ...recentNotifications.filter((n) => n.visitId !== newVisit.id)].slice(0, 50);

        // Asynchronously replicate to Cloud Firestore (non-blocking for quota resilience)
        if (serverFirestoreDb) {
          setDoc(doc(serverFirestoreDb, 'visits', newVisit.id), newVisit, { merge: true }).catch((fsErr: any) => {
            console.warn('[Server Firestore] Write notice (persisted safely to server disk):', fsErr.message);
          });
          setDoc(doc(serverFirestoreDb, 'admin_notifications', notifItem.id), notifItem, { merge: true }).catch(() => {});
        }

        return res.json({
          success: true,
          message: 'Kunjungan berhasil disimpan di server database.',
          data: newVisit,
          totalVisits: visitsCache.length,
        });
      } catch (err: any) {
        console.error('Failed to POST /api/visits:', err);
        return res.status(500).json({ success: false, message: err.message });
      }
    });
});

// POST sync multiple visits (merges client visits from localStorage into server database)
app.post('/api/visits/sync', (req, res) => {
  try {
    const incomingVisits: any[] = req.body?.visits || req.body;
    if (!Array.isArray(incomingVisits)) {
      return res.status(400).json({ success: false, message: 'Format data sinkronisasi harus array kunjungan.' });
    }

    const map = new Map<string, any>();

    // Put current server visits
    visitsCache.forEach((v) => {
      const key = v.id || v.visitNumber;
      if (key) map.set(key, v);
    });

    // Merge incoming visits
    let addedCount = 0;
    incomingVisits.forEach((v) => {
      if (!v) return;
      const key = v.id || v.visitNumber;
      if (!key) return;
      if (!map.has(key)) {
        addedCount++;
        map.set(key, v);
      } else {
        // Update if existing without destroying valid real user images
        const existing = map.get(key);
        const selfie = pickBestImage(v.selfieUrl, existing.selfieUrl);
        const sig = pickBestImage(v.signatureUrl, existing.signatureUrl);
        map.set(key, { ...existing, ...v, selfieUrl: selfie, signatureUrl: sig });
      }
    });

    const merged = Array.from(map.values());
    // Ensure strict queue number uniqueness across all visits
    enforceUniqueQueueNumbers(merged);

    // Sort descending by visitedAt
    merged.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.visitedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.visitedAt || 0).getTime();
      return timeB - timeA;
    });

    visitsCache = merged;
    saveVisitsToDisk(visitsCache);

    res.json({
      success: true,
      addedCount,
      totalCount: visitsCache.length,
      data: visitsCache,
    });
  } catch (err: any) {
    console.error('Failed to sync visits:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update a visit
app.put('/api/visits/:id', (req, res) => {
  try {
    const visitId = req.params.id;
    const updates = req.body;
    const index = visitsCache.findIndex((v) => v.id === visitId);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Data kunjungan tidak ditemukan.' });
    }

    visitsCache[index] = {
      ...visitsCache[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveVisitsToDisk(visitsCache);

    // Asynchronously replicate update to Cloud Firestore
    if (serverFirestoreDb) {
      setDoc(doc(serverFirestoreDb, 'visits', visitId), visitsCache[index], { merge: true }).catch((fsErr: any) => {
        console.warn('[Server Firestore] Update warning:', fsErr.message);
      });
    }

    res.json({
      success: true,
      message: 'Data kunjungan berhasil diperbarui.',
      data: visitsCache[index],
    });
  } catch (err: any) {
    console.error('Failed to update visit:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE single visit
app.delete('/api/visits/:id', (req, res) => {
  try {
    const visitId = req.params.id;
    visitsCache = visitsCache.filter((v) => v.id !== visitId);
    saveVisitsToDisk(visitsCache);

    // Asynchronously replicate deletion to Cloud Firestore
    if (serverFirestoreDb) {
      deleteDoc(doc(serverFirestoreDb, 'visits', visitId)).catch(() => {});
    }
    res.json({ success: true, message: 'Data kunjungan berhasil dihapus.', remaining: visitsCache.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE multiple visits
app.post('/api/visits/bulk-delete', (req, res) => {
  try {
    const idsToDelete: string[] = req.body?.ids || [];
    if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) {
      return res.status(400).json({ success: false, message: 'Daftar ID tidak valid.' });
    }

    const idSet = new Set(idsToDelete);
    visitsCache = visitsCache.filter((v) => !idSet.has(v.id));
    saveVisitsToDisk(visitsCache);

    res.json({ success: true, message: `${idsToDelete.length} data kunjungan berhasil dihapus.`, remaining: visitsCache.length });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST restore default demo visits
app.post('/api/visits/restore-default', (req, res) => {
  try {
    visitsCache = [...DEFAULT_VISITS];
    saveVisitsToDisk(visitsCache);
    res.json({ success: true, message: 'Data posbakum berhasil dipulihkan.', count: visitsCache.length, data: visitsCache });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// ACTIVITY LOGS API
// ==========================================
app.get('/api/logs', (req, res) => {
  const logs = readLogsFromDisk();
  res.json({ success: true, data: logs });
});

app.post('/api/logs', (req, res) => {
  try {
    const newLog = req.body;
    const forwarded = req.headers['x-forwarded-for'];
    let clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || '127.0.0.1';
    if (clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.substring(7);
    }
    if (!newLog.ipAddress || newLog.ipAddress.includes('127.0.0.1')) {
      newLog.ipAddress = clientIp;
    }
    const logs = readLogsFromDisk();
    const updated = [newLog, ...logs].slice(0, 500); // keep last 500 logs
    saveLogsToDisk(updated);

    // Replicate log to Firestore
    if (serverFirestoreDb && newLog.id) {
      setDoc(doc(serverFirestoreDb, 'activity_logs', newLog.id), newLog, { merge: true }).catch(() => {});
    }

    res.json({ success: true, data: newLog });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// VITE MIDDLEWARE & STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Posbakum server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
