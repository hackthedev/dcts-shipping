import { parentPort } from "node:worker_threads";

parentPort.on("message", async ({ code, args }) => {
    try {
        const fn = eval(`(${code})`);
        const result = await fn(...args);
        parentPort.postMessage({ ok: true, result });
    } catch (err) {
        parentPort.postMessage({ ok: false, error: err?.message || String(err) });
    }
});
