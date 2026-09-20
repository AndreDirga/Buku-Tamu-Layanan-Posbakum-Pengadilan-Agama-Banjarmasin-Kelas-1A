import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User 
} from 'firebase/auth';
import { auth } from './firebase';
import { Visit } from '../types/posbakum';
import { logActivity } from './storageService';
import { SHEET_HEADERS, visitToRowData } from './googleSheetsService';

export const ADMIN_GDRIVE_EMAIL = 'gdriveandria1@gmail.com';

export const GDRIVE_STORAGE_KEYS = {
  AUTH_INFO: 'posbakum_gdrive_auth_info',
  DAILY_RECORDS: 'posbakum_gdrive_daily_sync_records',
  AUTO_SYNC: 'posbakum_gdrive_auto_sync_enabled',
};

export interface GDriveAuthInfo {
  email: string;
  displayName?: string;
  photoURL?: string;
  connectedAt: string;
  accessToken: string;
}

export interface DailySyncRecord {
  date: string; // YYYY-MM-DD
  dateDisplay: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowCount: number;
  lastSyncedAt: string;
  syncedToEmail: string;
  createdByEmail: string;
}

// Scopes required for creating files and managing spreadsheets
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

let memoryAccessToken: string | null = null;

// Get stored auth info
export const getStoredGDriveAuth = (): GDriveAuthInfo | null => {
  try {
    const raw = localStorage.getItem(GDRIVE_STORAGE_KEYS.AUTH_INFO);
    if (!raw) return null;
    const parsed: GDriveAuthInfo = JSON.parse(raw);
    if (parsed && parsed.accessToken) {
      memoryAccessToken = parsed.accessToken;
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

export const getGDriveAccessToken = (): string | null => {
  if (memoryAccessToken) return memoryAccessToken;
  const stored = getStoredGDriveAuth();
  return stored?.accessToken || null;
};

// Check if auto-sync is enabled (defaults to true)
export const isGDriveAutoSyncEnabled = (): boolean => {
  try {
    const raw = localStorage.getItem(GDRIVE_STORAGE_KEYS.AUTO_SYNC);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
};

export const setGDriveAutoSyncEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(GDRIVE_STORAGE_KEYS.AUTO_SYNC, String(enabled));
  } catch {}
};

// Connect to Google Drive via OAuth popup
export const connectAdminGoogleDrive = async (): Promise<GDriveAuthInfo | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh access token Google Drive dari autentikasi.');
    }

    memoryAccessToken = credential.accessToken;
    const authInfo: GDriveAuthInfo = {
      email: result.user.email || '',
      displayName: result.user.displayName || 'Petugas Posbakum',
      photoURL: result.user.photoURL || undefined,
      connectedAt: new Date().toISOString(),
      accessToken: credential.accessToken,
    };

    try {
      localStorage.setItem(GDRIVE_STORAGE_KEYS.AUTH_INFO, JSON.stringify(authInfo));
    } catch {}

    logActivity({
      userId: 'officer-admin',
      userName: authInfo.displayName || 'Admin',
      userRole: 'Petugas Posbakum',
      action: 'LOGIN',
      description: `Menghubungkan akun Google Drive (${authInfo.email}) untuk arsip otomatis ke ${ADMIN_GDRIVE_EMAIL}`,
      badgeColor: 'emerald',
    });

    return authInfo;
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorMsg.includes('popup-closed-by-user') ||
      errorMsg.includes('cancelled-popup-request')
    ) {
      return null;
    }

    if (errorCode === 'auth/popup-blocked' || errorMsg.includes('popup-blocked')) {
      throw new Error('Jendela popup otorisasi Google diblokir oleh browser. Harap izinkan popup di peramban Anda.');
    }

    throw error;
  }
};

// Disconnect
export const disconnectAdminGoogleDrive = async () => {
  try {
    await signOut(auth);
  } catch {}
  memoryAccessToken = null;
  localStorage.removeItem(GDRIVE_STORAGE_KEYS.AUTH_INFO);
};

// Get all daily sync records
export const getAllDailySyncRecords = (): Record<string, DailySyncRecord> => {
  try {
    const raw = localStorage.getItem(GDRIVE_STORAGE_KEYS.DAILY_RECORDS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const getDailySyncRecord = (dateStr: string): DailySyncRecord | null => {
  const all = getAllDailySyncRecords();
  return all[dateStr] || null;
};

// Share spreadsheet with the specified admin email address
export const shareSpreadsheetWithAdmin = async (
  fileId: string, 
  token: string, 
  targetEmail: string = ADMIN_GDRIVE_EMAIL
): Promise<boolean> => {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'writer',
        type: 'user',
        emailAddress: targetEmail,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Share file with admin warning (may already have permission):', err);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Could not share file with admin email:', err);
    return false;
  }
};

// Style and format Google Spreadsheet
const applySpreadsheetFormatting = async (spreadsheetId: string, sheetId: number, token: string) => {
  try {
    const formatPayload = {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: SHEET_HEADERS.length,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.024,
                  green: 0.306,
                  blue: 0.231, // Emerald dark
                },
                textFormat: {
                  foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                  bold: true,
                  fontSize: 10,
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId: sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: SHEET_HEADERS.length,
            },
          },
        },
      ],
    };

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formatPayload),
    });
  } catch (e) {
    console.warn('Minor error applying sheet formatting:', e);
  }
};

/**
 * Saves or updates daily visits into Google Drive as a formatted Spreadsheet,
 * and automatically shares it with gdriveandria1@gmail.com.
 */
export const syncDailyVisitsToGDrive = async (
  dateStr: string, // YYYY-MM-DD
  visitsToday: Visit[],
  manualTrigger: boolean = false
): Promise<{
  success: boolean;
  record?: DailySyncRecord;
  message: string;
}> => {
  const authInfo = getStoredGDriveAuth();
  const token = authInfo?.accessToken;

  if (!token) {
    return {
      success: false,
      message: 'Akun Google Drive belum dihubungkan. Harap hubungkan akun Google terlebih dahulu.',
    };
  }

  const existingRecord = getDailySyncRecord(dateStr);
  const rows = [
    SHEET_HEADERS,
    ...visitsToday.map((v, i) => visitToRowData(v, i)),
  ];

  const dateParts = dateStr.split('-');
  const formattedDate = dateParts.length === 3 
    ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` 
    : dateStr;

  try {
    let spreadsheetId = existingRecord?.spreadsheetId;
    let spreadsheetUrl = existingRecord?.spreadsheetUrl;
    let sheetId = 0;

    if (!spreadsheetId) {
      // 1. Create brand new spreadsheet for this day
      const title = `Buku Tamu Posbakum PA Banjarmasin - ${formattedDate}`;
      const createPayload = {
        properties: {
          title,
          locale: 'id_ID',
          timeZone: 'Asia/Makassar',
        },
        sheets: [
          {
            properties: {
              title: 'Data Kunjungan',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      };

      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload),
      });

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData?.error?.message || 'Gagal membuat Google Spreadsheet baru di Google Drive.');
      }

      const sheetData = await createRes.json();
      spreadsheetId = sheetData.spreadsheetId;
      sheetId = sheetData.sheets?.[0]?.properties?.sheetId || 0;
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      // 2. Share directly with admin gdriveandria1@gmail.com
      await shareSpreadsheetWithAdmin(spreadsheetId, token, ADMIN_GDRIVE_EMAIL);
    }

    // 3. Write / Overwrite rows in spreadsheet to guarantee up-to-date accurate content
    const writeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Data Kunjungan'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: rows,
        }),
      }
    );

    if (!writeRes.ok) {
      const errData = await writeRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Gagal menulis data kunjungan ke Google Spreadsheet.');
    }

    // Apply header style and column widths
    await applySpreadsheetFormatting(spreadsheetId, sheetId, token);

    // Make sure admin permission is present
    await shareSpreadsheetWithAdmin(spreadsheetId, token, ADMIN_GDRIVE_EMAIL);

    // Save sync record
    const newRecord: DailySyncRecord = {
      date: dateStr,
      dateDisplay: formattedDate,
      spreadsheetId,
      spreadsheetUrl: spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      rowCount: visitsToday.length,
      lastSyncedAt: new Date().toISOString(),
      syncedToEmail: ADMIN_GDRIVE_EMAIL,
      createdByEmail: authInfo.email || 'Admin',
    };

    const allRecords = getAllDailySyncRecords();
    allRecords[dateStr] = newRecord;
    try {
      localStorage.setItem(GDRIVE_STORAGE_KEYS.DAILY_RECORDS, JSON.stringify(allRecords));
    } catch {}

    if (manualTrigger) {
      logActivity({
        userId: 'officer-admin',
        userName: authInfo.displayName || 'Admin',
        userRole: 'Petugas Posbakum',
        action: 'EXPORT_GOOGLE_SHEETS',
        description: `Sinkronisasi data harian (${dateStr}) ke Google Drive admin: ${ADMIN_GDRIVE_EMAIL}`,
        badgeColor: 'emerald',
      });
    }

    return {
      success: true,
      record: newRecord,
      message: `Data kunjungan tanggal ${formattedDate} (${visitsToday.length} data) berhasil disimpan otomatis di Google Drive admin (${ADMIN_GDRIVE_EMAIL}).`,
    };
  } catch (err: any) {
    console.error('Error syncing daily visits to Google Drive:', err);
    return {
      success: false,
      message: 'Gagal sinkronisasi ke Google Drive: ' + (err.message || 'Terjadi kesalahan.'),
    };
  }
};
