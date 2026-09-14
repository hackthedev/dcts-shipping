import fs from "fs";
import path from "path";

export let debugmode = process.env.DEBUG === true || false;

export function flipDebug() {
    debugmode = !debugmode;
}

// check version file for update check
export let versionPath = path.join(path.resolve(), "version");
export let versionCode = fs.readFileSync(versionPath).toString();