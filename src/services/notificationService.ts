import { Visit } from '../types/posbakum';

const NOTIFICATION_CHANNEL_NAME = 'posbakum_realtime_channel';
const SOUND_PREF_KEY = 'pabjm_notification_sound_enabled';

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
