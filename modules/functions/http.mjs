import {server, serverconfig, http, https, app, setServer, fs, saveConfig} from "../../index.mjs";
import Logger from "@hackthedev/terminal-logger"
import {lookupIP} from "./chat/main.mjs";


function getClientIp(req) {
    const xf = req.headers["x-forwarded-for"];
    if (xf) return xf.split(",")[0].trim();

    return req.socket?.remoteAddress || req.connection?.remoteAddress;
}





export function checkSSL(){
    // if ssl is disabled but the file exists, enable ssl and delete the file
    if(serverconfig.serverinfo.ssl.enabled == 0){
        if(fs.existsSync("./configs/ssl.txt")){
            serverconfig.serverinfo.ssl.enabled = 1;
            saveConfig(serverconfig)
            fs.unlinkSync("./configs/ssl.txt");
        }
    }

    if(serverconfig.serverinfo.ssl.enabled == 1){
        setServer(https.createServer({
            key: fs.readFileSync(serverconfig.serverinfo.ssl.key),
            cert: fs.readFileSync(serverconfig.serverinfo.ssl.cert),
            ca: fs.readFileSync(serverconfig.serverinfo.ssl.chain),

            requestCert: false,
            rejectUnauthorized: false },app));

        Logger.success("Running Server in public (production) mode with SSL.");
    }
    else{
        Logger.warn("Running Server in localhost (testing) mode.");
        Logger.warn("If accessed via the internet, SSL wont work and will cause problems");

        setServer(http.createServer(app))
    }
}

export function extractHost(url){
    if(!url) return null;
    const s = String(url).trim();

    const looksLikeBareIPv6 = !s.includes('://') && !s.includes('/') && s.includes(':') && /^[0-9A-Fa-f:.]+$/.test(s);
    const withProto = looksLikeBareIPv6 ? `https://[${s}]` : (s.includes('://') ? s : `https://${s}`);

    try {
        const u = new URL(withProto);
        const host = u.hostname; // IPv6 returned without brackets
        const port = u.port;
        if (host.includes(':')) {
            return port ? `[${host}]:${port}` : host;
        }
        return port ? `${host}:${port}` : host;
    } catch (e) {
        const re = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?([^:\/?#]+)(?::(\d+))?(?:[\/?#]|$)/i;
        const m = s.match(re);
        if (!m) return null;
        const hostname = m[1].replace(/^\[(.*)\]$/, '$1');
        const port = m[2];
        if (hostname.includes(':')) return port ? `[${hostname}]:${port}` : hostname;
        return port ? `${hostname}:${port}` : hostname;
    }
}