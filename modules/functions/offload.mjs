import { Worker } from 'node:worker_threads';

export async function offload(fn) {
    const workerCode = `
        import { parentPort } from 'node:worker_threads';
        const fn = ${fn.toString()};
        Promise.resolve(fn()).then(result => parentPort.postMessage(result));
    `;

    const encoded = Buffer.from(workerCode).toString('base64');
    const workerURL = `data:text/javascript;base64,${encoded}`;

    return new Promise((resolve, reject) => {
        const worker = new Worker(workerURL, { eval: true });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', code => {
            if (code !== 0)
                reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}
