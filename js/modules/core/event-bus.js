export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    const set = this.listeners.get(eventName);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.listeners.delete(eventName);
  }

  emit(eventName, payload = {}) {
    const set = this.listeners.get(eventName);
    if (!set || set.size === 0) return;

    for (const fn of set) {
      try {
        fn(payload);
      } catch {
        // Isolate listeners from each other.
      }
    }
  }
}
