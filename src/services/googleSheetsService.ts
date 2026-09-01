import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import { auth } from './firebase';
import { Visit } from '../types/posbakum';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
// Set custom parameters to always prompt consent and select account if needed
provider.setCustomParameters({
  prompt: 'select_account',
});

// Cache token in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!isSigningIn) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal memperoleh access token dari Google OAuth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in Google error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const signOutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// Transform Visit into Sheet Row Array
export const visitToRowData = (v: Visit, index: number): string[] => {
  return [
    String(index + 1),
    v.visitNumber || '',
    v.dateDisplay || '',
    v.timeDisplay || '',
    v.name || '',
    v.ktpAddress || '',
    v.domicileAddress || '',
    v.whatsapp || '',
    v.email || '',
    v.occupation + (v.occupationOther ? ` (${v.occupationOther})` : ''),
    v.caseCategory || '',
    v.caseType + (v.caseTypeOther ? ` (${v.caseTypeOther})` : ''),
    v.status || 'Menunggu',
    v.officerName || 'Admin Posbakum',
    v.notes || '',
    v.selfieFileName || (v.visitNumber ? `${v.visitNumber}-selfie.jpg` : ''),
    v.signatureFileName || (v.visitNumber ? `${v.visitNumber}-signature.png` : ''),
  ];
};

export const SHEET_HEADERS = [
  'No.',
  'Nomor Kunjungan',
  'Tanggal',
  'Waktu',
  'Nama Penggugat / Pemohon / Tergugat / Termohon',
  'Alamat KTP',
  'Alamat Domisili',
  'No. WhatsApp',
  'Email',
  'Pekerjaan',
  'Kategori Perkara',
  'Jenis Perkara',
  'Status Layanan',
  'Petugas',
  'Catatan / Konsultasi',
  'Berkas Foto Selfie',
  'Berkas Tanda Tangan',
];

export interface CreatedSpreadsheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  rowCount: number;
}

/**
 * Creates a brand new, professionally formatted Google Spreadsheet in the user's Google Drive
 */
export const createSpreadsheetWithVisits = async (
  title: string,
  visits: Visit[]
): Promise<CreatedSpreadsheetResult> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Anda belum terhubung dengan akun Google. Silakan login terlebih dahulu.');
  }

  // 1. Create the spreadsheet
  const createPayload = {
    properties: {
      title: title || `Buku Tamu Posbakum PA Banjarmasin - ${new Date().toLocaleDateString('id-ID')}`,
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
    throw new Error(errData?.error?.message || 'Gagal membuat Google Spreadsheet baru.');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const sheetId = sheetData.sheets?.[0]?.properties?.sheetId || 0;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare Rows Data (Headers + Visits)
  const rows: string[][] = [
    SHEET_HEADERS,
    ...visits.map((v, i) => visitToRowData(v, i)),
  ];

  // 3. Append Data
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Data Kunjungan'!A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!appendRes.ok) {
    const errData = await appendRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Gagal memasukkan data baris ke Spreadsheet.');
  }

  // 4. Polish Formatting (Header styling, borders, colors, auto-fit)
  try {
    const formatPayload = {
      requests: [
        // Style Header Row (Dark Emerald background, White Bold text)
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
                  blue: 0.231, // Emerald #064e3b
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
        // Auto-resize columns
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
  } catch (formatErr) {
    console.warn('Minor warning during sheet formatting:', formatErr);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: createPayload.properties.title,
    rowCount: visits.length,
  };
};

/**
 * Appends visits to an existing spreadsheet
 */
export const appendToExistingSpreadsheet = async (
  spreadsheetId: string,
  visits: Visit[],
  sheetName: string = 'Sheet1'
): Promise<{ updatedRows: number; spreadsheetUrl: string }> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Akses Google Sheets belum diotorisasi.');
  }

  const rows = visits.map((v, i) => visitToRowData(v, i));

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Gagal menambahkan baris ke Google Spreadsheet.');
  }

  return {
    updatedRows: visits.length,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
};

/**
 * Fetch spreadsheet metadata to get tabs / sheets list
 */
export const fetchSpreadsheetDetails = async (
  spreadsheetId: string
): Promise<{ title: string; sheetNames: string[] }> => {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('Akses Google Sheets belum diotorisasi.');
  }

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Spreadsheet tidak ditemukan atau Anda tidak memiliki akses.');
  }

  const data = await res.json();
  const title = data.properties?.title || 'Google Spreadsheet';
  const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');

  return { title, sheetNames };
};
