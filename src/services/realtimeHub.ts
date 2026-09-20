import { Visit } from '../types/posbakum';

export type RealtimeEventType =
  | 'NEW_VISIT'
  | 'NOTIFICATION'
  | 'UPDATE_VISIT'
  | 'DELETE_VISITS'
  | 'SYNC_VISITS'
  | 'RESET_VISITS'
  | 'CONNECTED';

export type RealtimeCallback = (type: RealtimeEventType, data: any) => void;

class RealtimeHub {
  private eventSource: EventSource | null = null;
  private listeners: Set<RealtimeCallback> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private isConnecting = false;
  private reconnectTimer: any = null;
  private pollTimer: any = null;
  private lastServerTimestamp = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initBroadcastChannel();
      this.connect();
      this.startFallbackPolling();
    }
  }

  private initBroadcastChannel() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.broadcastChannel = new BroadcastChannel('posbakum_realtime_hub');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type) {
            this.notifyListeners(event.data.type, event.data.data);
          }
        };
      }
    } catch {}
  }

  public broadcastLocal(type: RealtimeEventType, data: any) {
    this.notifyListeners(type, data);
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type, data });
      }
    } catch {}
  }

  public addListener(callback: RealtimeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners(type: RealtimeEventType, data: any) {
    this.listeners.forEach((cb) => {
      try {
        cb(type, data);
      } catch (err) {
        console.warn('Realtime listener error:', err);
      }
    });
  }

  public connect() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/realtime/stream');

      this.eventSource.onopen = () => {
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.type) {
            this.notifyListeners(payload.type as RealtimeEventType, payload.data);
          }
        } catch {}
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };
    } catch (e) {
      this.isConnecting = false;
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 4000);
      }
    }
  }

  private startFallbackPolling() {
    // Check recent notifications and deleted visits every 6 seconds as a backup
    this.pollTimer = setInterval(async () => {
      try {
        const url = this.lastServerTimestamp > 0 
          ? `/api/notifications/recent?since=${this.lastServerTimestamp}` 
          : `/api/notifications/recent`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            let maxTs = this.lastServerTimestamp;
            json.data.forEach((item: any) => {
              if (item.timestamp && item.timestamp > maxTs) {
                maxTs = item.timestamp;
              }
              if (item.visit) {
                this.notifyListeners('NOTIFICATION', item);
              }
            });
            this.lastServerTimestamp = maxTs;
          }
        }
      } catch {}
    }, 6000);
  }
}

export const realtimeHub = new RealtimeHub();
