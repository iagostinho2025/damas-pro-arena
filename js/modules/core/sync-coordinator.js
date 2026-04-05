import { GAME_EVENTS } from './game-events.js';

class NullSyncBridge {
  async connect() {
    return { ok: true };
  }

  async disconnect() {
    return { ok: true };
  }

  async send(_message) {
    return { ok: true, queued: true };
  }

  onMessage(_handler) {
    return () => {};
  }
}

export class SyncCoordinator {
  constructor({ eventBus, bridge = null } = {}) {
    this.eventBus = eventBus;
    this.bridge = bridge || new NullSyncBridge();
    this.connected = false;
    this.offInbound = null;
    this.outboundQueue = [];
  }

  async connect() {
    await this.bridge.connect();
    this.connected = true;

    this.offInbound = this.bridge.onMessage((envelope) => {
      this.eventBus.emit(GAME_EVENTS.SYNC_INBOUND_EVENT, envelope);
    });

    this.eventBus.emit(GAME_EVENTS.SYNC_CONNECTED, { connected: true });
    return { ok: true };
  }

  async disconnect() {
    if (this.offInbound) {
      this.offInbound();
      this.offInbound = null;
    }

    await this.bridge.disconnect();
    this.connected = false;
    this.eventBus.emit(GAME_EVENTS.SYNC_DISCONNECTED, { connected: false });
    return { ok: true };
  }

  pushOutbound(eventType, payload) {
    const envelope = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      type: eventType,
      payload
    };

    this.outboundQueue.push(envelope);
    this.flushOutbound();
    this.eventBus.emit(GAME_EVENTS.SYNC_OUTBOUND_EVENT, envelope);
    return envelope;
  }

  async flushOutbound() {
    if (!this.connected || this.outboundQueue.length === 0) return;

    const pending = [...this.outboundQueue];
    this.outboundQueue = [];

    for (const envelope of pending) {
      const res = await this.bridge.send(envelope);
      if (!res?.ok) {
        this.outboundQueue.push(envelope);
      }
    }
  }
}
