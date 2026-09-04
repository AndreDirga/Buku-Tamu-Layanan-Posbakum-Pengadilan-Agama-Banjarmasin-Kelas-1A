import { Visit } from '../types/posbakum';

const NOTIFICATION_CHANNEL_NAME = 'posbakum_realtime_channel';
const SOUND_PREF_KEY = 'pabjm_notification_sound_enabled';
const DAILY_NOTIFICATIONS_KEY = 'pabjm_daily_notifications_v2';

// Helper to get local date key in YYYY-MM-DD format
export const getTodayDateKey = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  if (typeof window === 'undefined') {
    return {
      dateKey: getTodayDateKey(),
      dateLabel: getTodayDateLabel(),
      visits: [],
      readVisitIds: [],
    };
  }
  try {
    const raw = localStorage.getItem(DAILY_NOTIFICATIONS_KEY);
    const todayKey = getTodayDateKey();
    if (!raw) {
      return {
        dateKey: todayKey,
        dateLabel: getTodayDateLabel(),
        visits: [],
        readVisitIds: [],
      };
    }
    const store = JSON.parse(raw);
    // If the stored date is different from today, reset the history automatically
    if (!store || store.dateKey !== todayKey) {
      const resetStore: DailyNotificationStore = {
        dateKey: todayKey,
        dateLabel: getTodayDateLabel(),
        visits: [],
        readVisitIds: [],
      };
      localStorage.setItem(DAILY_NOTIFICATIONS_KEY, JSON.stringify(resetStore));
      return resetStore;
    }
    return {
      dateKey: todayKey,
      dateLabel: store.dateLabel || getTodayDateLabel(),
      visits: Array.isArray(store.visits) ? store.visits : [],
      readVisitIds: Array.isArray(store.readVisitIds) ? store.readVisitIds : [],
    };
  } catch (e) {
    return {
      dateKey: getTodayDateKey(),
      dateLabel: getTodayDateLabel(),
      visits: [],
      readVisitIds: [],
    };
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

// Add new visit to today's notification history (new visit starts as unread)
export const addVisitToDailyNotifications = (visit: Visit): { visits: Visit[]; readVisitIds: string[]; unreadCount: number } => {
  const current = getDailyNotificationStore();
  // Avoid duplicates
  const filteredVisits = current.visits.filter((v) => v.id !== visit.id);
  const updatedVisits = [visit, ...filteredVisits].slice(0, 100);
  // Ensure the new visit is NOT in readVisitIds so it counts as unread
  const updatedReadIds = current.readVisitIds.filter((id) => id !== visit.id);
  
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
export const markDailyNotificationAsRead = (visitId: string): { visits: Visit[]; readVisitIds: string[]; unreadCount: number } => {
  const current = getDailyNotificationStore();
  if (!current.readVisitIds.includes(visitId)) {
    const updatedReadIds = [...current.readVisitIds, visitId];
    const newStore: DailyNotificationStore = {
      ...current,
      readVisitIds: updatedReadIds,
    };
    saveDailyNotificationStore(newStore);
    const unreadCount = current.visits.filter((v) => !updatedReadIds.includes(v.id)).length;
    return { visits: current.visits, readVisitIds: updatedReadIds, unreadCount };
  }
  const unreadCount = current.visits.filter((v) => !current.readVisitIds.includes(v.id)).length;
  return { visits: current.visits, readVisitIds: current.readVisitIds, unreadCount };
};

// Mark all daily notifications as opened/read
export const markAllDailyNotificationsAsRead = (): { visits: Visit[]; readVisitIds: string[]; unreadCount: number } => {
  const current = getDailyNotificationStore();
  const allIds = current.visits.map((v) => v.id);
  const newStore: DailyNotificationStore = {
    ...current,
    readVisitIds: allIds,
  };
  saveDailyNotificationStore(newStore);
  return { visits: current.visits, readVisitIds: allIds, unreadCount: 0 };
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

// Broadcast new visit event across same window, cross-tab BroadcastChannel, and localStorage
export const broadcastNewVisit = (visit: Visit) => {
  // 1. Same-window custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('posbakum_new_visit', { detail: visit })
    );

    // 2. LocalStorage event for cross-tab fallback
    try {
      localStorage.setItem(
        'pabjm_last_visit_event',
        JSON.stringify({ timestamp: Date.now(), visitId: visit.id, visit })
      );
    } catch (e) {
      console.warn('LocalStorage notification event error:', e);
    }

    // 3. BroadcastChannel for fast modern cross-tab messaging
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(NOTIFICATION_CHANNEL_NAME);
        bc.postMessage({ type: 'NEW_VISIT', visit });
        setTimeout(() => bc.close(), 1000);
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }
};

// Subscribe to new visits from all sources (same-window, cross-tab BroadcastChannel, storage events)
export const subscribeToNewVisits = (onNewVisit: (visit: Visit) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  // 1. Same-window listener
  const handleCustomEvent = (event: Event) => {
    const customEv = event as CustomEvent<Visit>;
    if (customEv.detail) {
      onNewVisit(customEv.detail);
    }
  };
  window.addEventListener('posbakum_new_visit', handleCustomEvent);

  // 2. BroadcastChannel listener (Cross-tab)
  let broadcastChannel: BroadcastChannel | null = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel(NOTIFICATION_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'NEW_VISIT' && event.data.visit) {
          onNewVisit(event.data.visit);
        }
      };
    }
  } catch (e) {
    console.warn('Could not initialize BroadcastChannel listener:', e);
  }

  // 3. Storage event fallback (Cross-tab for older browsers or if BroadcastChannel is blocked)
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === 'pabjm_last_visit_event' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed?.visit) {
          onNewVisit(parsed.visit);
        }
      } catch (e) {
        // Ignore JSON parse error
      }
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('posbakum_new_visit', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch (e) {}
    }
  };
};
