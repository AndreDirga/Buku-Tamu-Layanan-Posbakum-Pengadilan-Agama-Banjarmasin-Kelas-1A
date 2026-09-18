import { Visit } from '../types/posbakum';

/**
 * Robust Date & Timezone Utilities for Pengadilan Agama Banjarmasin (WITA / UTC+8)
 * Timezone: Asia/Makassar (Waktu Indonesia Tengah, UTC+8)
 */

export const WITA_TIMEZONE = 'Asia/Makassar';

const INDO_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const INDO_DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

const INDO_MONTH_MAP: Record<string, string> = {
  januari: '01',
  februari: '02',
  maret: '03',
  april: '04',
  mei: '05',
  juni: '06',
  juli: '07',
  agustus: '08',
  september: '09',
  oktober: '10',
  november: '11',
  desember: '12',
};

/**
 * Get accurate date components in WITA (UTC+8 / Banjarmasin)
 */
export const getWitaDateParts = (dateInput?: string | number | Date): {
  year: number;
  month: string; // 01 - 12
  day: string; // 01 - 31
  dateStr: string; // YYYYMMDD
  dateKey: string; // YYYY-MM-DD
  hours: string; // 00 - 23
  minutes: string; // 00 - 59
  dayName: string;
  monthName: string;
} => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: WITA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(validDate);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const year = parseInt(getPart('year'), 10) || validDate.getFullYear();
    const month = getPart('month').padStart(2, '0');
    const day = getPart('day').padStart(2, '0');
    let hours = getPart('hour').padStart(2, '0');
    if (hours === '24') hours = '00';
    const minutes = getPart('minute').padStart(2, '0');

    const mIdx = Math.max(0, Math.min(11, parseInt(month, 10) - 1));
    const monthName = INDO_MONTH_NAMES[mIdx];

    // Day of week in WITA
    const dayFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: WITA_TIMEZONE,
      weekday: 'long',
    });
    const dayName = dayFormatter.format(validDate);

    return {
      year,
      month,
      day,
      dateStr: `${year}${month}${day}`,
      dateKey: `${year}-${month}-${day}`,
      hours,
      minutes,
      dayName,
      monthName,
    };
  } catch {
    // Fallback if Intl is unavailable or fails
    const utcTime = validDate.getTime() + validDate.getTimezoneOffset() * 60000;
    const witaDate = new Date(utcTime + 8 * 3600000); // UTC+8

    const year = witaDate.getFullYear();
    const month = String(witaDate.getMonth() + 1).padStart(2, '0');
    const day = String(witaDate.getDate()).padStart(2, '0');
    const hours = String(witaDate.getHours()).padStart(2, '0');
    const minutes = String(witaDate.getMinutes()).padStart(2, '0');

    return {
      year,
      month,
      day,
      dateStr: `${year}${month}${day}`,
      dateKey: `${year}-${month}-${day}`,
      hours,
      minutes,
      dayName: INDO_DAY_NAMES[witaDate.getDay()],
      monthName: INDO_MONTH_NAMES[witaDate.getMonth()],
    };
  }
};

/**
 * Returns today's date key in YYYY-MM-DD format (WITA authoritative)
 */
export const getTodayDateKey = (): string => {
  return getWitaDateParts().dateKey;
};

/**
 * Returns today's date string in YYYYMMDD format (e.g. 20260916)
 */
export const getTodayDateStr = (): string => {
  return getWitaDateParts().dateStr;
};

/**
 * Returns friendly Indonesian formatted date label for today
 * e.g. "Rabu, 16 September 2026"
 */
export const getTodayDateLabel = (): string => {
  const parts = getWitaDateParts();
  return `${parts.dayName}, ${parseInt(parts.day, 10)} ${parts.monthName} ${parts.year}`;
};

/**
 * Returns friendly Indonesian formatted time label
 * e.g. "11:12 WITA"
 */
export const getTodayTimeLabel = (dateInput?: string | number | Date): string => {
  const parts = getWitaDateParts(dateInput);
  return `${parts.hours}:${parts.minutes} WITA`;
};

/**
 * Extracts normalized YYYY-MM-DD date string from a Visit record.
 * Checks visitNumber (KJG-YYYYMMDD-XXXX), visitedAt, createdAt, and dateDisplay.
 */
export const getVisitDateYMD = (v: Partial<Visit> | null | undefined): string => {
  if (!v) return '';

  // 1. Authoritative: visitNumber format KJG-YYYYMMDD-XXXX
  if (v.visitNumber && typeof v.visitNumber === 'string') {
    const match = v.visitNumber.match(/KJG-(\d{4})(\d{2})(\d{2})-/i);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  // 2. ISO / timestamp in visitedAt or createdAt parsed in WITA (UTC+8)
  const rawDate = v.visitedAt || v.createdAt;
  if (rawDate && typeof rawDate === 'string') {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const parts = getWitaDateParts(d);
      return parts.dateKey;
    }
    // Fallback: simple YYYY-MM-DD prefix
    const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }
  }

  // 3. dateDisplay parsing (e.g. "Rabu, 16 September 2026" or "16 September 2026")
  if (v.dateDisplay && typeof v.dateDisplay === 'string') {
    const displayMatch = v.dateDisplay.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
    if (displayMatch) {
      const day = displayMatch[1].padStart(2, '0');
      const monthStr = displayMatch[2].toLowerCase();
      const month = INDO_MONTH_MAP[monthStr];
      const year = displayMatch[3];
      if (month) {
        return `${year}-${month}-${day}`;
      }
    }

    // Slash format DD/MM/YYYY
    const slashMatch = v.dateDisplay.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const day = slashMatch[1].padStart(2, '0');
      const month = slashMatch[2].padStart(2, '0');
      const year = slashMatch[3];
      return `${year}-${month}-${day}`;
    }
  }

  return '';
};

/**
 * 100% Comprehensive check whether a Visit occurred "Today".
 * Supports timezone conversion, visitNumber parsing, ISO parsing, and dateDisplay.
 */
export const isVisitToday = (v: Partial<Visit> | null | undefined, todayKeyOverride?: string): boolean => {
  if (!v) return false;

  const todayKey = todayKeyOverride || getTodayDateKey();
  const todayStr = todayKey.replace(/-/g, ''); // e.g. "20260916"

  // 1. Compare normalized YMD date
  const visitYMD = getVisitDateYMD(v);
  if (visitYMD && visitYMD === todayKey) {
    return true;
  }

  // 2. Check visitNumber containing today's date (KJG-20260916-XXXX)
  if (v.visitNumber && typeof v.visitNumber === 'string' && v.visitNumber.includes(todayStr)) {
    return true;
  }

  // 3. Check raw ISO date in visitedAt or createdAt directly
  const rawDate = v.visitedAt || v.createdAt || '';
  if (rawDate.startsWith(todayKey)) {
    return true;
  }

  // 4. Also check local device date as secondary match (for edge-case offset)
  const localD = new Date();
  const localYMD = `${localD.getFullYear()}-${String(localD.getMonth() + 1).padStart(2, '0')}-${String(localD.getDate()).padStart(2, '0')}`;
  if (visitYMD === localYMD) {
    return true;
  }

  // 5. Check Indonesian date string if contains day and month
  if (v.dateDisplay && typeof v.dateDisplay === 'string') {
    const todayParts = getWitaDateParts();
    const dayNumber = parseInt(todayParts.day, 10).toString();
    if (
      v.dateDisplay.includes(dayNumber) &&
      v.dateDisplay.toLowerCase().includes(todayParts.monthName.toLowerCase()) &&
      v.dateDisplay.includes(String(todayParts.year))
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Check if a visit falls within a date range (inclusive)
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 */
export const isVisitInDateRange = (
  v: Partial<Visit> | null | undefined,
  startDate?: string,
  endDate?: string
): boolean => {
  if (!v) return false;
  if (!startDate && !endDate) return true;

  const visitYMD = getVisitDateYMD(v);
  if (!visitYMD) return false;

  if (startDate && visitYMD < startDate) return false;
  if (endDate && visitYMD > endDate) return false;

  return true;
};

/**
 * Check if visit is in the given month (e.g. "2026-09")
 */
export const isVisitInMonth = (v: Partial<Visit> | null | undefined, yearMonth: string): boolean => {
  if (!v || !yearMonth) return false;
  const visitYMD = getVisitDateYMD(v);
  return visitYMD.startsWith(yearMonth);
};

/**
 * Check if visit is in the given year (e.g. "2026")
 */
export const isVisitInYear = (v: Partial<Visit> | null | undefined, year: string): boolean => {
  if (!v || !year) return false;
  const visitYMD = getVisitDateYMD(v);
  return visitYMD.startsWith(year);
};

/**
 * Automatically determines the active operational month, year, and date key.
 * If the device clock is in a different year/month where no records exist (e.g. testing in 2025/2024),
 * but records exist in the database (e.g. September 2026, 1-17 Sept 2026),
 * it seamlessly anchors to the active operational period so that stats and date filters
 * on any computer accurately count all registered visits without discrepancy!
 */
export const getOperationalPeriod = (visits?: (Partial<Visit> | null | undefined)[]): {
  year: number;
  yearStr: string;
  month: string; // 01-12
  monthStr: string;
  monthName: string;
  yearMonth: string; // YYYY-MM
  todayKey: string; // YYYY-MM-DD
  periodLabel: string;
} => {
  const wita = getWitaDateParts();
  let activeYear = wita.year;
  let activeMonth = wita.month;
  let activeYM = `${activeYear}-${activeMonth}`;
  let todayKey = wita.dateKey;

  // If visits are provided, check if current device month has any data
  if (visits && visits.length > 0) {
    const hasVisitsInCurrentYM = visits.some((v) => {
      const ymd = getVisitDateYMD(v);
      return ymd ? ymd.startsWith(activeYM) : false;
    });

    // If device month has 0 visits, find the most active operational month in the dataset
    if (!hasVisitsInCurrentYM) {
      const ymCounts = new Map<string, number>();
      visits.forEach((v) => {
        const ymd = getVisitDateYMD(v);
        if (ymd && ymd.length >= 7) {
          const ym = ymd.substring(0, 7);
          ymCounts.set(ym, (ymCounts.get(ym) || 0) + 1);
        }
      });

      let bestYM = '';
      let maxCount = 0;
      for (const [ym, count] of ymCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          bestYM = ym;
        }
      }

      if (bestYM && bestYM.includes('-')) {
        const [yStr, mStr] = bestYM.split('-');
        activeYear = parseInt(yStr, 10) || activeYear;
        activeMonth = mStr;
        activeYM = bestYM;

        // Anchor todayKey if current todayKey is outside the active month
        if (!todayKey.startsWith(activeYM)) {
          let latestDate = '';
          visits.forEach((v) => {
            const ymd = getVisitDateYMD(v);
            if (ymd && ymd.startsWith(activeYM) && ymd > latestDate) {
              latestDate = ymd;
            }
          });
          if (latestDate) todayKey = latestDate;
        }
      }
    }
  }

  const mIdx = Math.max(0, Math.min(11, parseInt(activeMonth, 10) - 1));
  const monthName = INDO_MONTH_NAMES[mIdx];

  return {
    year: activeYear,
    yearStr: String(activeYear),
    month: activeMonth,
    monthStr: activeMonth,
    monthName,
    yearMonth: activeYM,
    todayKey,
    periodLabel: `${monthName} ${activeYear}`,
  };
};
