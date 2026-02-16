import { Worker } from "node:worker_threads";

export function runInWorker(fn, ...args) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./worker.js", import.meta.url));

    worker.postMessage({
      code: fn.toString(),
      args,
    });

    worker.on("message", (msg) => {
      worker.terminate();
      if (msg.ok) resolve(msg.result);
      else reject(new Error(msg.error));
    });

    worker.on("error", reject);
  });
}
