import {debugmode} from "../../index.mjs";

export class Clock {
    static timers = new Map();

    static start(name) {
        let entry = this.timers.get(name);
        if (!entry) {
            entry = { stack: [], total: 0 };
            this.timers.set(name, entry);
        }
        entry.stack.push(performance.now());
    }

    static stop(name) {
        const entry = this.timers.get(name);
        if (!entry || entry.stack.length === 0) return 0;

        const start = entry.stack.pop();
        const ms = performance.now() - start;
        entry.total += ms;

        let out;
        if (entry.stack.length === 0) {
            const total = entry.total;
            this.timers.delete(name);

            if (total < 1000) out = `${total.toFixed(2)} ms`;
            else if (total < 60000) out = `${(total / 1000).toFixed(2)} s`;
            else out = `${(total / 60000).toFixed(2)} min`;

            if(debugmode) console.log(`[Clock:${name}] ${out}`);
            return Math.ceil(total);
        }

        return Math.ceil(ms);
    }
}
