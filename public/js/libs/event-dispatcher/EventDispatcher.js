class EventDispatcher {
    static events = new Map();

    static on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        this.events.get(event).add(callback);
        return () => this.off(event, callback);
    }

    static off(event, callback) {
        const listeners = this.events.get(event);
        if (!listeners) return;
        listeners.delete(callback);
        if (listeners.size === 0) {
            this.events.delete(event);
        }
    }

    static send(event, data = null) {
        const listeners = this.events.get(event);
        if (!listeners) return [];
        return [...listeners].map(callback => callback(data));
    }
}