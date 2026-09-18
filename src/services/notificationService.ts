import { Visit } from '../types/posbakum';
import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';

const NOTIFICATION_CHANNEL_NAME = 'posbakum_realtime_channel';
const SOUND_PREF_KEY = 'pabjm_notification_sound_enabled';
const DAILY_NOTIFICATIONS_KEY = 'pabjm_daily_notifications_v3';
const HANDLED_POPUPS_KEY = 'pabjm_handled_popups_v3';
const PERMANENT_READ_KEY = 'pabjm_permanent_read_visits_v1';

// In-memory set of handled IDs during the current session for 0ms lookup
const sessionHandledIds = new Set<string>();

// Helper to get local date key in YYYY-MM-DD format
export const getTodayDateKey = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Permanent read IDs storage: tracks all visits read across sessions/dates
export const getPermanentReadIds = (): string[] => {
  if (typeof window === 'undefined') return Array.from(sessionHandledIds);
  try {
    const raw = localStorage.getItem(PERMANENT_READ_KEY);
    if (!raw) return Array.from(sessionHandledIds);
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    list.forEach((id: string) => sessionHandledIds.add(id));
    return list;
  } catch {
    return Array.from(sessionHandledIds);
  }
};

export const addPermanentReadId = (idOrNumber: string): void => {
  if (!idOrNumber || typeof window === 'undefined') return;
  try {
    sessionHandledIds.add(idOrNumber);
    const list = getPermanentReadIds();
    if (!list.includes(idOrNumber)) {
      const updated = [...list, idOrNumber].slice(-1000); // Retain last 1000 IDs
      localStorage.setItem(PERMANENT_READ_KEY, JSON.stringify(updated));
    }
  } catch {}
};

// Handled popups store: tracks all popups displayed, dismissed, or viewed
interface HandledPopupsStore {
  handledIds: string[];
}

export const getHandledPopupStore = (): HandledPopupsStore => {
  if (typeof window === 'undefined') {
    return { handledIds: Array.from(sessionHandledIds) };
  }
  try {
    const raw = localStorage.getItem(HANDLED_POPUPS_KEY);
    if (!raw) return { handledIds: Array.from(sessionHandledIds) };
    const parsed = JSON.parse(raw);
    const handledList: string[] = Array.isArray(parsed?.handledIds)
      ? parsed.handledIds
      : Array.isArray(parsed)
      ? parsed
      : [];
    handledList.forEach((id) => sessionHandledIds.add(id));
    return { handledIds: handledList };
  } catch {
    return { handledIds: Array.from(sessionHandledIds) };
  }
};

// Check if a popup has already been shown, opened, or dismissed for a visit
export const isPopupAlreadyHandled = (visitOrId: Visit | string | null | undefined): boolean => {
  if (!visitOrId) return true;

  // Check if this is a simulation / test notification
  const isSim = typeof visitOrId === 'object' && (
    visitOrId.id?.startsWith('test-') ||
    visitOrId.visitNumber?.startsWith('TEST-') ||
    visitOrId.name?.toLowerCase().includes('simulasi') ||
    visitOrId.notes?.toLowerCase().includes('pengujian notifikasi')
  );

  // For simulation / test notifications, NEVER suppress by guest name or phone!
  // Only check exact ID so tests can be triggered repeatedly across all computers
  if (isSim && typeof visitOrId === 'object') {
    if (visitOrId.id && sessionHandledIds.has(visitOrId.id)) return true;
    return false;
  }

  // 1. If it's a visit object, check status: any status other than 'Menunggu' has ALREADY been served or processed!
  if (typeof visitOrId === 'object') {
    if (visitOrId.status && visitOrId.status !== 'Menunggu') {
      return true;
    }
    // Check age: if created more than 2 minutes (120s) ago, it is NOT a live popup!
    const createdTime = new Date(visitOrId.visitedAt || visitOrId.createdAt || 0).getTime();
    if (createdTime > 0 && Date.now() - createdTime > 120000) {
      return true;
    }
  }

  const idsToCheck: string[] = [];
  if (typeof visitOrId === 'string') {
    idsToCheck.push(visitOrId);
    idsToCheck.push(visitOrId.replace(/[^a-zA-Z0-9]/g, ''));
  } else {
    if (visitOrId.id) {
      idsToCheck.push(visitOrId.id);
      idsToCheck.push(visitOrId.id.replace(/[^a-zA-Z0-9]/g, ''));
    }
    if (visitOrId.visitNumber) {
      idsToCheck.push(visitOrId.visitNumber);
      idsToCheck.push(visitOrId.visitNumber.replace(/[^a-zA-Z0-9]/g, ''));
    }
    if (visitOrId.name) {
      const cleanName = visitOrId.name.trim().toLowerCase();
      idsToCheck.push(`name_${cleanName}`);
      if (visitOrId.visitNumber) {
        idsToCheck.push(`${cleanName}_${visitOrId.visitNumber}`);
      }
      if (visitOrId.whatsapp) {
        idsToCheck.push(`${cleanName}_${visitOrId.whatsapp}`);
      }
      if (visitOrId.visitedAt || visitOrId.createdAt) {
        idsToCheck.push(`${visitOrId.name}_${visitOrId.visitedAt || visitOrId.createdAt}`);
      }
    }
  }

  // 2. Check in-memory session Set (0ms lookup)
  for (const id of idsToCheck) {
    if (id && sessionHandledIds.has(id)) return true;
  }

  // 3. Check permanent read list
  const permanentRead = getPermanentReadIds();
  for (const id of idsToCheck) {
    if (id && permanentRead.includes(id)) {
      sessionHandledIds.add(id);
      return true;
    }
  }

  // 4. Check handled popups store
  const handledList = getHandledPopupStore().handledIds;
  for (const id of idsToCheck) {
    if (id && handledList.includes(id)) {
      sessionHandledIds.add(id);
      return true;
    }
  }

  // 5. Check daily notification readVisitIds
  const notifStore = getDailyNotificationStore();
  for (const id of idsToCheck) {
    if (id && notifStore.readVisitIds.includes(id)) {
      sessionHandledIds.add(id);
      return true;
    }
  }

  return false;
};

// Mark a popup as handled so it never appears again on refresh, auto-sync, or polling
export const markPopupAsHandled = (visitOrId: Visit | string | null | undefined): void => {
  if (!visitOrId || typeof window === 'undefined') return;
  try {
    const idsToAdd: string[] = [];
    let matchedVisit: Visit | undefined;

    if (typeof visitOrId === 'string') {
      idsToAdd.push(visitOrId);
      idsToAdd.push(visitOrId.replace(/[^a-zA-Z0-9]/g, ''));
      // Attempt lookup from current daily store to find full guest details
      const store = getDailyNotificationStore();
      matchedVisit = store.visits.find((v) => v.id === visitOrId || v.visitNumber === visitOrId);
    } else {
      matchedVisit = visitOrId;
    }

    if (matchedVisit) {
      if (matchedVisit.id) {
        idsToAdd.push(matchedVisit.id);
        idsToAdd.push(matchedVisit.id.replace(/[^a-zA-Z0-9]/g, ''));
      }
      if (matchedVisit.visitNumber) {
        idsToAdd.push(matchedVisit.visitNumber);
        idsToAdd.push(matchedVisit.visitNumber.replace(/[^a-zA-Z0-9]/g, ''));
      }
      if (matchedVisit.name) {
        const cleanName = matchedVisit.name.trim().toLowerCase();
        idsToAdd.push(`name_${cleanName}`);
        if (matchedVisit.visitNumber) {
          idsToAdd.push(`${cleanName}_${matchedVisit.visitNumber}`);
        }
        if (matchedVisit.whatsapp) {
          idsToAdd.push(`${cleanName}_${matchedVisit.whatsapp}`);
        }
        if (matchedVisit.visitedAt || matchedVisit.createdAt) {
          idsToAdd.push(`${matchedVisit.name}_${matchedVisit.visitedAt || matchedVisit.createdAt}`);
        }
      }
    }

    const validIds = idsToAdd.filter(Boolean);
    validIds.forEach((id) => {
      sessionHandledIds.add(id);
      addPermanentReadId(id);
    });

    const store = getHandledPopupStore();
    const newItems = validIds.filter((id) => !store.handledIds.includes(id));
    if (newItems.length > 0) {
      const updated = [...store.handledIds, ...newItems].slice(-1000);
      localStorage.setItem(HANDLED_POPUPS_KEY, JSON.stringify({ handledIds: updated, updatedAt: Date.now() }));
    }
  } catch {}
};

// Helper to get friendly Indonesian date label for today
export const getTodayDateLabel = (): string => {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch (e) {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  }
};

interface DailyNotificationStore {
  dateKey: string;
  dateLabel: string;
  visits: Visit[];
  readVisitIds: string[];
}

export const getDailyNotificationStore = (): DailyNotificationStore => {
  const todayKey = getTodayDateKey();
  const permReads = getPermanentReadIds();

  const defaultStore: DailyNotificationStore = {
    dateKey: todayKey,
    dateLabel: getTodayDateLabel(),
    visits: [],
    readVisitIds: permReads,
  };

  if (typeof window === 'undefined') return defaultStore;

  try {
    const raw = localStorage.getItem(DAILY_NOTIFICATIONS_KEY);
    if (!raw) return defaultStore;
    const store = JSON.parse(raw);
    if (!store) return defaultStore;

    const storedReads = Array.isArray(store.readVisitIds) ? store.readVisitIds : [];
    const combinedReads = Array.from(new Set([...permReads, ...storedReads]));

    // If the stored date is different from today, rollover visits but PRESERVE readVisitIds
    if (store.dateKey !== todayKey) {
      const rolloverStore: DailyNotificationStore = {
        dateKey: todayKey,
        dateLabel: getTodayDateLabel(),
        visits: [],
        readVisitIds: combinedReads,
      };
      localStorage.setItem(DAILY_NOTIFICATIONS_KEY, JSON.stringify(rolloverStore));
      return rolloverStore;
    }

    return {
      dateKey: todayKey,
      dateLabel: store.dateLabel || getTodayDateLabel(),
      visits: Array.isArray(store.visits) ? store.visits : [],
      readVisitIds: combinedReads,
    };
  } catch (e) {
    return defaultStore;
  }
};

export const saveDailyNotificationStore = (store: DailyNotificationStore): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DAILY_NOTIFICATIONS_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('Failed to save daily notifications store:', e);
  }
};

// Load notification history for today. If it's a new day/different date, auto-resets!
export const getDailyNotifications = (): Visit[] => {
  return getDailyNotificationStore().visits;
};

// Get list of read visit IDs for today
export const getDailyReadVisitIds = (): string[] => {
  return getDailyNotificationStore().readVisitIds;
};

// Calculate count of unread notifications for today
export const getDailyUnreadCount = (): number => {
  const store = getDailyNotificationStore();
  return store.visits.filter((v) => !store.readVisitIds.includes(v.id)).length;
};

// Save notification list for today
export const saveDailyNotifications = (visits: Visit[]): void => {
  const current = getDailyNotificationStore();
  saveDailyNotificationStore({
    ...current,
    visits,
  });
};

// Add new visit to today's notification history (preserves read status if already read)
export const addVisitToDailyNotifications = (visit: Visit): { visits: Visit[]; readVisitIds: string[]; unreadCount: number } => {
  const current = getDailyNotificationStore();
  // Avoid duplicates
  const filteredVisits = current.visits.filter((v) => v.id !== visit.id);
  const updatedVisits = [visit, ...filteredVisits].slice(0, 100);
  // Preserve read status! If visit is already read, do NOT strip it from readVisitIds!
  const updatedReadIds = current.readVisitIds;
  
  const newStore: DailyNotificationStore = {
    ...current,
    visits: updatedVisits,
    readVisitIds: updatedReadIds,
  };
  saveDailyNotificationStore(newStore);

  const unreadCount = updatedVisits.filter((v) => !updatedReadIds.includes(v.id)).length;
  return { visits: updatedVisits, readVisitIds: updatedReadIds, unreadCount };
};

// Mark a specific notification as opened/read
export const markDailyNotificationAsRead = (visitOrId: Visit | string): { visits: Visit[]; readVisitIds: string[]; unreadCount: number } => {
  markPopupAsHandled(visitOrId);
  const current = getDailyNotificationStore();
  const idsToAdd: string[] = [];

  let matchedVisit: Visit | undefined;
  if (typeof visitOrId === 'string') {
    idsToAdd.push(visitOrId);
    matchedVisit = current.visits.find((v) => v.id === visitOrId || v.visitNumber === visitOrId);
  } else if (visitOrId) {
    matchedVisit = visitOrId;
  }

  if (matchedVisit) {
    if (matchedVisit.id) idsToAdd.push(matchedVisit.id);
    if (matchedVisit.visitNumber) idsToAdd.push(matchedVisit.visitNumber);
    if (matchedVisit.name) {
      const cleanName = matchedVisit.name.trim().toLowerCase();
      idsToAdd.push(`name_${cleanName}`);
      if (matchedVisit.visitNumber) idsToAdd.push(`${cleanName}_${matchedVisit.visitNumber}`);
      if (matchedVisit.whatsapp) idsToAdd.push(`${cleanName}_${matchedVisit.whatsapp}`);
    }
  }

  const validIds = idsToAdd.filter(Boolean);
  validIds.forEach((id) => addPermanentReadId(id));

  const updatedReadIds = Array.from(new Set([...current.readVisitIds, ...validIds]));
  const newStore: DailyNotificationStore = {
    ...current,
    readVisitIds: updatedReadIds,
  };
  saveDailyNotificationStore(newStore);

  const unreadCount = current.visits.filter(
    (v) => !updatedReadIds.includes(v.id) && (!v.visitNumber || !updatedReadIds.includes(v.visitNumber))
  ).length;
  return { visits: current.visits, readVisitIds: updatedReadIds, unreadCount };
};

// Mark all daily notifications as opened/read
export const markAllDailyNotificationsAsRead = (): { visits: Visit[]; readVisitIds: string[]; unreadCount: number } => {
  const current = getDailyNotificationStore();
  current.visits.forEach((v) => markPopupAsHandled(v));
  const allIds = current.visits.flatMap((v) => [
    v.id,
    v.visitNumber,
    v.name ? `name_${v.name.trim().toLowerCase()}` : null,
    v.name && v.visitNumber ? `${v.name.trim().toLowerCase()}_${v.visitNumber}` : null
  ].filter(Boolean) as string[]);
  allIds.forEach((id) => addPermanentReadId(id));
  const newReadIds = Array.from(new Set([...current.readVisitIds, ...allIds]));
  const newStore: DailyNotificationStore = {
    ...current,
    readVisitIds: newReadIds,
  };
  saveDailyNotificationStore(newStore);
  return { visits: current.visits, readVisitIds: newReadIds, unreadCount: 0 };
};

// Remove single notification by ID
export const deleteSingleDailyNotification = (visitId: string): { visits: Visit[]; readVisitIds: string[]; unreadCount: number } => {
  const current = getDailyNotificationStore();
  const updatedVisits = current.visits.filter((v) => v.id !== visitId);
  const updatedReadIds = current.readVisitIds.filter((id) => id !== visitId);
  const newStore: DailyNotificationStore = {
    ...current,
    visits: updatedVisits,
    readVisitIds: updatedReadIds,
  };
  saveDailyNotificationStore(newStore);
  const unreadCount = updatedVisits.filter((v) => !updatedReadIds.includes(v.id)).length;
  return { visits: updatedVisits, readVisitIds: updatedReadIds, unreadCount };
};

// Clear all notifications for today
export const clearAllDailyNotifications = (): { visits: Visit[]; readVisitIds: string[]; unreadCount: number } => {
  const resetStore: DailyNotificationStore = {
    dateKey: getTodayDateKey(),
    dateLabel: getTodayDateLabel(),
    visits: [],
    readVisitIds: [],
  };
  saveDailyNotificationStore(resetStore);
  return { visits: [], readVisitIds: [], unreadCount: 0 };
};

// Play a pleasant, professional two-tone chime for incoming guest registration
export const playNotificationChime = () => {
  try {
    const isSoundEnabled = localStorage.getItem(SOUND_PREF_KEY) !== 'false';
    if (!isSoundEnabled) return;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First tone (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (A5 - 880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    gain2.gain.setValueAtTime(0.22, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (e) {
    // Gracefully handle browser autoplay policies
  }
};

export const getNotificationSoundEnabled = (): boolean => {
  return localStorage.getItem(SOUND_PREF_KEY) !== 'false';
};

export const setNotificationSoundEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
};

// Helper to request browser desktop notification permission
export const requestDesktopNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  try {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
  } catch {}
  return false;
};

// Show native browser desktop notification (works even when tab/window is minimized)
export const showDesktopNotification = (visit: Visit) => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const title = `Tamu Baru: ${visit.name}`;
      const notif = new Notification(title, {
        body: `Nomor: ${visit.visitNumber} • Perkara: ${visit.caseType}`,
        icon: '/posbakum-qr.png',
        tag: `posbakum-${visit.id}`,
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch (e) {
    // Ignore desktop notification error
  }
};

// Broadcast new visit event across same window, cross-tab BroadcastChannel, Server API, and Cloud Firestore
export const broadcastNewVisit = async (visit: Visit) => {
  if (typeof window === 'undefined') return;

  // 1. Same-window custom event (0ms)
  window.dispatchEvent(
    new CustomEvent('posbakum_new_visit', { detail: visit })
  );

  // 2. LocalStorage event for cross-tab fallback
  try {
    localStorage.setItem(
      'pabjm_last_visit_event',
      JSON.stringify({ timestamp: Date.now(), visitId: visit.id, visit })
    );
  } catch (e) {}

  // 3. BroadcastChannel for modern cross-tab messaging
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(NOTIFICATION_CHANNEL_NAME);
      bc.postMessage({ type: 'NEW_VISIT', visit });
      setTimeout(() => bc.close(), 1000);
    }
  } catch (e) {}

  // 4. Server API broadcast endpoint (relays to all connected computers via backend)
  try {
    fetch('/api/notifications/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit }),
    }).catch(() => {});
  } catch {}

  // 5. Cloud Firestore cross-computer real-time distribution
  try {
    const notifDocRef = doc(db, 'admin_notifications', `notif-${visit.id}`);
    const cleanDoc = {
      id: `notif-${visit.id}`,
      visitId: visit.id,
      visit: {
        id: visit.id,
        visitNumber: visit.visitNumber,
        name: visit.name,
        caseCategory: visit.caseCategory,
        caseType: visit.caseType,
        timeDisplay: visit.timeDisplay,
        dateDisplay: visit.dateDisplay,
        status: visit.status,
        visitedAt: visit.visitedAt,
        selfieUrl: visit.selfieUrl || '',
      },
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
    };
    await setDoc(notifDocRef, cleanDoc);
  } catch (fsErr) {
    console.warn('[Firestore Notification] Broadcast warning:', fsErr);
  }
};

// In-memory map of notified visit IDs with timestamps to prevent duplicate triggers across channels
const recentlyNotifiedVisits = new Map<string, number>();

// Helper to check and mark if a visit should trigger popup and chime notification
function markVisitAsNotified(visit: Visit): boolean {
  if (!visit || (!visit.id && !visit.visitNumber)) return false;

  const isSim = Boolean(
    visit.id?.startsWith('test-') ||
    visit.visitNumber?.startsWith('TEST-') ||
    visit.name?.toLowerCase().includes('simulasi') ||
    visit.notes?.toLowerCase().includes('pengujian notifikasi')
  );

  const now = Date.now();

  // For simulation / test notifications, debounce ONLY the exact ID for 4 seconds
  // (Prevents duplicate chime on same machine across BroadcastChannel + SSE), but ALWAYS allows tests across computers!
  if (isSim) {
    const simKey = `sim_${visit.id || visit.visitNumber}`;
    const lastSim = recentlyNotifiedVisits.get(simKey);
    if (lastSim && now - lastSim < 4000) {
      return false;
    }
    recentlyNotifiedVisits.set(simKey, now);
    if (visit.id) sessionHandledIds.add(visit.id);
    return true;
  }

  // 1. If visit is already read or popup already handled/shown/dismissed/opened, NEVER notify or pop up again!
  if (isPopupAlreadyHandled(visit)) {
    return false;
  }

  // 2. In-memory debounce for real guest visits: if ANY of its IDs was notified in the last 15 minutes, ignore duplicate channel pushes
  const keys: string[] = [];
  if (visit.id) keys.push(visit.id);
  if (visit.visitNumber) keys.push(visit.visitNumber);
  if (visit.name) {
    const cleanName = visit.name.trim().toLowerCase();
    keys.push(`name_${cleanName}`);
    if (visit.visitNumber) keys.push(`${cleanName}_${visit.visitNumber}`);
    if (visit.whatsapp) keys.push(`${cleanName}_${visit.whatsapp}`);
  }

  for (const k of keys) {
    const lastTime = recentlyNotifiedVisits.get(k);
    if (lastTime && now - lastTime < 900000) {
      return false;
    }
  }

  // Record debounce timestamp for all keys
  keys.forEach((k) => recentlyNotifiedVisits.set(k, now));
  return true;
}

// Synchronize daily notification store with all known visits from database/state
export const syncDailyNotificationsWithVisits = (
  allVisits: Visit[]
): { visits: Visit[]; readVisitIds: string[]; unreadCount: number } => {
  const current = getDailyNotificationStore();
  const todayKey = getTodayDateKey();
  const permReads = getPermanentReadIds();

  // Any visit that is already served, processed, or finished (status !== 'Menunggu') is AUTOMATICALLY marked as handled and read!
  (allVisits || []).forEach((v) => {
    if (v && v.status && v.status !== 'Menunggu') {
      markPopupAsHandled(v);
      if (v.id) permReads.push(v.id);
      if (v.visitNumber) permReads.push(v.visitNumber);
    }
  });

  // Extract visits that occurred today
  const todayVisits = (allVisits || []).filter((v) => {
    if (!v) return false;
    const vDate = (v.visitedAt || v.createdAt || '').substring(0, 10);
    if (vDate === todayKey) return true;
    if (v.visitNumber && typeof v.visitNumber === 'string' && v.visitNumber.includes(todayKey.replace(/-/g, ''))) return true;
    return false;
  });

  // Merge with existing visits in current store
  const map = new Map<string, Visit>();
  current.visits.forEach((v) => {
    if (v && v.id) map.set(v.id, v);
  });
  todayVisits.forEach((v) => {
    if (v && v.id) map.set(v.id, v);
  });

  const mergedVisits = Array.from(map.values());
  mergedVisits.sort((a, b) => {
    const timeA = new Date(a.visitedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.visitedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const combinedReads = Array.from(new Set([...current.readVisitIds, ...permReads]));

  const unreadCount = mergedVisits.filter(
    (v) => !combinedReads.includes(v.id) && (!v.visitNumber || !combinedReads.includes(v.visitNumber))
  ).length;

  const newStore: DailyNotificationStore = {
    dateKey: todayKey,
    dateLabel: current.dateLabel || getTodayDateLabel(),
    visits: mergedVisits,
    readVisitIds: combinedReads,
  };
  saveDailyNotificationStore(newStore);

  return {
    visits: mergedVisits,
    readVisitIds: combinedReads,
    unreadCount,
  };
};

// Trigger a mock test notification for admin to test sound and banner across all computers
export const triggerTestNotification = (): Visit => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const randomSuffix = Math.random().toString(36).slice(2, 6);
  const testVisit: Visit = {
    id: `test-${Date.now()}-${randomSuffix}`,
    visitNumber: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
    name: 'Pengunjung Simulasi (Uji Coba)',
    caseCategory: 'Konsultasi Hukum Gratis',
    caseType: 'Uji Coba Notifikasi Sistem Posbakum',
    timeDisplay: `${hours}:${minutes} WITA`,
    dateDisplay: getTodayDateLabel(),
    status: 'Menunggu',
    visitedAt: now.toISOString(),
    createdAt: now.toISOString(),
    ktpAddress: 'Jl. Lambung Mangkurat No. 1, Banjarmasin',
    domicileAddress: 'Jl. Lambung Mangkurat No. 1, Banjarmasin',
    domicileSameAsKtp: true,
    email: 'test@posbakum.pa-banjarmasin.go.id',
    whatsapp: '0812-3456-7890',
    occupation: 'Masyarakat',
    selfieUrl: '',
    selfieFileName: '',
    signatureUrl: '',
    signatureFileName: '',
    qrToken: 'TEST-SYSTEM',
    notes: 'Pengujian Notifikasi Real-Time Lintas Komputer',
  };

  playNotificationChime();
  addVisitToDailyNotifications(testVisit);
  broadcastNewVisit(testVisit);
  return testVisit;
};

// Subscribe to new visits from ALL sources (Server-Sent Events SSE, Cloud Firestore, Server Polling, BroadcastChannel)
export const subscribeToNewVisits = (onNewVisit: (visit: Visit) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const listenerStartTime = Date.now();

  const handleIncomingVisit = (visit: Visit) => {
    if (!visit || (!visit.id && !visit.visitNumber)) return;
    if (!visit.id && visit.visitNumber) {
      visit.id = visit.visitNumber;
    }
    const isSim = Boolean(
      visit.id?.startsWith('test-') ||
      visit.visitNumber?.startsWith('TEST-') ||
      visit.name?.toLowerCase().includes('simulasi')
    );

    // 1. If visit has already been read or popup already handled/opened, do NOT trigger popup or chime!
    if (!isSim && isPopupAlreadyHandled(visit)) {
      addVisitToDailyNotifications(visit);
      return;
    }
    // 2. Always ensure visit is in daily notification history
    addVisitToDailyNotifications(visit);
    // 3. Debounce popup and sound trigger across multiple concurrent channels
    if (markVisitAsNotified(visit)) {
      markPopupAsHandled(visit);
      onNewVisit(visit);
      showDesktopNotification(visit);
    }
  };

  // 1. Same-window listener
  const handleCustomEvent = (event: Event) => {
    const customEv = event as CustomEvent<Visit>;
    if (customEv.detail) {
      handleIncomingVisit(customEv.detail);
    }
  };
  window.addEventListener('posbakum_new_visit', handleCustomEvent);

  // 2. Real-Time Server-Sent Events (SSE) Stream (<10ms cross-computer delivery, zero quotas)
  let eventSource: EventSource | null = null;
  let isClosed = false;

  const initSSE = () => {
    if (isClosed || typeof EventSource === 'undefined') return;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type === 'NOTIFICATION' && payload?.data?.visit) {
            handleIncomingVisit(payload.data.visit);
          } else if (payload?.type === 'NEW_VISIT' && payload?.data) {
            handleIncomingVisit(payload.data);
          }
        } catch {}
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!isClosed) {
          setTimeout(initSSE, 4000);
        }
      };
    } catch (e) {
      console.warn('[SSE Notifications] Init warning:', e);
    }
  };
  initSSE();

  // 3. BroadcastChannel listener (Cross-tab modern messaging)
  let broadcastChannel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(NOTIFICATION_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'NEW_VISIT' && event.data.visit) {
          handleIncomingVisit(event.data.visit);
        }
      };
    }
  } catch (e) {
    console.warn('Could not initialize BroadcastChannel listener:', e);
  }

  // 4. Storage event fallback (Cross-tab)
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === 'pabjm_last_visit_event' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed?.visit) {
          handleIncomingVisit(parsed.visit);
        }
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  // 5. Cloud Firestore cross-computer real-time listener (safe mode with circuit-breaker)
  let unsubscribeFirestoreNotif: (() => void) | null = null;
  try {
    const notifCol = collection(db, 'admin_notifications');
    unsubscribeFirestoreNotif = onSnapshot(notifCol, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (data && data.visit) {
            const docTime = data.timestamp || new Date(data.createdAt || 0).getTime();
            if (docTime >= Date.now() - 30000) {
              handleIncomingVisit(data.visit as Visit);
            }
          }
        }
      });
    }, (err) => {
      // Benign when Firestore free quota exhausted; SSE handles real-time sync seamlessly
    });
  } catch (e) {}

  // 6. Server fallback polling every 5 seconds
  let lastServerPollTime = listenerStartTime - 5000;
  const pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/notifications/recent?since=${lastServerPollTime}`);
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          let maxTimestamp = lastServerPollTime;
          result.data.forEach((item: any) => {
            const itemTime = typeof item.timestamp === 'number' ? item.timestamp : new Date(item.createdAt || 0).getTime();
            if (item?.visit) {
              if (itemTime >= Date.now() - 30000) {
                handleIncomingVisit(item.visit);
              }
            }
            if (itemTime > maxTimestamp) {
              maxTimestamp = itemTime;
            }
          });
          lastServerPollTime = Math.max(lastServerPollTime, maxTimestamp, Date.now() - 10000);
        }
      }
    } catch {}
  }, 5000);

  return () => {
    isClosed = true;
    window.removeEventListener('posbakum_new_visit', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
    }
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch {}
    }
    if (unsubscribeFirestoreNotif) {
      try {
        unsubscribeFirestoreNotif();
      } catch {}
    }
    clearInterval(pollInterval);
  };
};
