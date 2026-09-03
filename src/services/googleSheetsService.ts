import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import * as XLSX from 'xlsx';
import { auth } from './firebase';
import { Visit } from '../types/posbakum';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
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
    // Gracefully handle user-initiated cancellation (closing the popup window)
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';
    
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorMsg.includes('popup-closed-by-user') ||
      errorMsg.includes('cancelled-popup-request')
    ) {
      // User dismissed or closed the login popup intentionally
      return null;
    }

    if (errorCode === 'auth/unauthorized-domain' || errorMsg.includes('unauthorized-domain')) {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'domain ini';
      const customError: any = new Error(
        `Domain ${currentHost} belum terdaftar di Authorized Domains Firebase Authentication.`
      );
      customError.code = 'auth/unauthorized-domain';
      customError.domain = currentHost;
      throw customError;
    }

    if (errorCode === 'auth/popup-blocked' || errorMsg.includes('popup-blocked')) {
      throw new Error('Jendela popup diblokir oleh browser. Harap izinkan jendela popup di browser Anda atau buka aplikasi di tab baru untuk melanjutkan.');
    }

    if (errorCode === 'auth/network-request-failed' || errorMsg.includes('network-request-failed')) {
      throw new Error('Koneksi internet bermasalah. Harap periksa jaringan Anda lalu coba kembali.');
    }

    // Only log unexpected actual errors
    console.warn('Google authentication interrupted:', errorMsg);
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

/**
 * Generates TSV (Tab Separated Values) for direct clipboard paste into Google Sheets.
 * When pasted at cell A1 in Google Sheets, it automatically arranges rows and columns.
 */
export const generateSheetsTsv = (visits: Visit[]): string => {
  const cleanCell = (str: string | undefined | null) => {
    if (!str) return '';
    return String(str).replace(/[\t\r\n]+/g, ' ').trim();
  };

  const headerLine = SHEET_HEADERS.join('\t');
  const rowLines = visits.map((v, i) => {
    const row = visitToRowData(v, i);
    return row.map(cleanCell).join('\t');
  });

  return [headerLine, ...rowLines].join('\n');
};

/**
 * Generates properly escaped CSV for Google Sheets / Excel import with UTF-8 BOM.
 */
export const generateSheetsCsv = (visits: Visit[]): string => {
  const escapeCsv = (str: string | undefined | null) => {
    if (!str) return '""';
    const cleanStr = String(str).replace(/"/g, '""');
    return `"${cleanStr}"`;
  };

  const headerLine = SHEET_HEADERS.map(escapeCsv).join(',');
  const rowLines = visits.map((v, i) => {
    const row = visitToRowData(v, i);
    return row.map(escapeCsv).join(',');
  });

  return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
};

/**
 * Generates an actual XLSX binary Blob for Google Sheets and Excel with optimized column widths
 */
export const generateSheetsXlsx = (visits: Visit[], sheetTitle: string = 'Buku Tamu POSBAKUM'): Blob => {
  const rows = visits.length > 0 
    ? visits.map((v, i) => visitToRowData(v, i))
    : [
        [
          1,
          'CONTOH-001',
          new Date().toLocaleDateString('id-ID'),
          '09:00:00',
          'Nama Pemohon (Contoh Baris Template)',
          'Jl. Contoh KTP No. 1, Banjarmasin',
          'Jl. Contoh Domisili No. 1, Banjarmasin',
          '081234567890',
          'pemohon@contoh.id',
          'Wiraswasta',
          'Perdata',
          'Gugatan Perceraian',
          'Selesai',
          'Petugas Posbakum',
          'Konsultasi hukum dan pembuatan permohonan',
          'CONTOH-001-selfie.jpg',
          'CONTOH-001-signature.png',
        ]
      ];

  const data = [SHEET_HEADERS, ...rows];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths suited for Posbakum guestbook fields
  ws['!cols'] = [
    { wch: 6 },   // No.
    { wch: 18 },  // Nomor Kunjungan
    { wch: 14 },  // Tanggal
    { wch: 10 },  // Waktu
    { wch: 32 },  // Nama Penggugat / Pemohon / Tergugat
    { wch: 38 },  // Alamat KTP
    { wch: 38 },  // Alamat Domisili
    { wch: 16 },  // No. WhatsApp
    { wch: 24 },  // Email
    { wch: 20 },  // Pekerjaan
    { wch: 20 },  // Kategori Perkara
    { wch: 28 },  // Jenis Perkara
    { wch: 16 },  // Status Layanan
    { wch: 22 },  // Petugas
    { wch: 35 },  // Catatan / Konsultasi
    { wch: 24 },  // Berkas Foto Selfie
    { wch: 24 },  // Berkas Tanda Tangan
  ];

  const validSheetName = sheetTitle.substring(0, 31).replace(/[\\/?*[\]:]/g, ' ') || 'Data Kunjungan';
  XLSX.utils.book_append_sheet(wb, ws, validSheetName);

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Directly downloads the XLSX spreadsheet without requiring any Google login
 */
export const downloadSpreadsheetXlsx = (visits: Visit[], customFileName?: string) => {
  const timestamp = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const cleanName = customFileName
    ? `${customFileName.replace(/\.(xlsx|csv)$/i, '')}.xlsx`
    : `Rekap_GoogleSheets_Posbakum_${timestamp}.xlsx`;

  const rows = visits.length > 0 
    ? visits.map((v, i) => visitToRowData(v, i))
    : [
        [
          1,
          'CONTOH-001',
          new Date().toLocaleDateString('id-ID'),
          '09:00:00',
          'Nama Pemohon (Contoh Template)',
          'Jl. Contoh KTP No. 1, Banjarmasin',
          'Jl. Contoh Domisili No. 1, Banjarmasin',
          '081234567890',
          'pemohon@contoh.id',
          'Wiraswasta',
          'Perdata',
          'Gugatan Perceraian',
          'Selesai',
          'Petugas Posbakum',
          'Konsultasi hukum dan pembuatan permohonan',
          'CONTOH-001-selfie.jpg',
          'CONTOH-001-signature.png',
        ]
      ];

  const data = [SHEET_HEADERS, ...rows];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 6 },   // No.
    { wch: 18 },  // Nomor Kunjungan
    { wch: 14 },  // Tanggal
    { wch: 10 },  // Waktu
    { wch: 32 },  // Nama Penggugat / Pemohon / Tergugat
    { wch: 38 },  // Alamat KTP
    { wch: 38 },  // Alamat Domisili
    { wch: 16 },  // No. WhatsApp
    { wch: 24 },  // Email
    { wch: 20 },  // Pekerjaan
    { wch: 20 },  // Kategori Perkara
    { wch: 28 },  // Jenis Perkara
    { wch: 16 },  // Status Layanan
    { wch: 22 },  // Petugas
    { wch: 35 },  // Catatan / Konsultasi
    { wch: 24 },  // Berkas Foto Selfie
    { wch: 24 },  // Berkas Tanda Tangan
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Kunjungan');

  try {
    XLSX.writeFile(wb, cleanName);
  } catch (err) {
    console.warn('XLSX.writeFile encountered an issue, trying Blob anchor download:', err);
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    }, 60000);
  }
};

/**
 * Directly downloads the CSV file for Google Sheets / Excel import
 */
export const downloadSheetsCsv = (visits: Visit[], customFileName?: string) => {
  const timestamp = new Date().toISOString().substring(0, 10).replace(/-/g, '');
  const cleanName = customFileName
    ? `${customFileName.replace(/\.(xlsx|csv)$/i, '')}.csv`
    : `Rekap_GoogleSheets_Posbakum_${timestamp}.csv`;

  const csvContent = generateSheetsCsv(visits);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (document.body.contains(a)) {
      document.body.removeChild(a);
    }
    URL.revokeObjectURL(url);
  }, 60000);
};

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
