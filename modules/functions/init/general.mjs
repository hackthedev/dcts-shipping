import fs from "fs";
import path from "path";
import {app} from "./web.mjs";
import {changeKeyVerification} from "../chat/main.mjs";

import dSyncAuth from "@hackthedev/dsync-auth";
//import dSyncAuth from "E:\\network-z-dev\\dSyncAuth\\index.mjs";
import {dSyncSign} from "@hackthedev/dsync-sign";

export let debugmode = process.env.DEBUG === true || false;

export function flipDebug() {
    debugmode = !debugmode;
}

// check version file for update check
export let versionPath = path.join(path.resolve(), "version");
export let versionCode = fs.readFileSync(versionPath).toString();
export let ratelimit = [];
export let auther = null;
export let signer = new dSyncSign("./configs/privatekey.json");

export function setRatelimit(ip, value) {
    ratelimit[ip] = value;
}


export function initAuther(){
    auther = new dSyncAuth(app, signer, async function (data) {
        if (data.valid === true) {
            changeKeyVerification(data.publicKey, data.valid);
        }
    });
}