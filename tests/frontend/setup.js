import { GlobalWindow } from "happy-dom";
import fs from "fs";
import path from "path";

const window = new GlobalWindow();

globalThis.window = window;
globalThis.document = window.document;

export function loadScript(file, globalName) {
    const scriptPath = path.resolve(import.meta.dir, file);
    const scriptContent = fs.readFileSync(scriptPath, "utf8");

    window.eval(`
        ${scriptContent}

        window["${globalName}"] = ${globalName};
    `);

    globalThis[globalName] = window[globalName];
}