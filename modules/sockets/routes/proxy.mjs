import path from "path";
import crypto from "crypto";
import fetch from "node-fetch";
import dns from "dns/promises";
import net from "net";
import { app, fs } from "../../../index.mjs";

const CACHE_DIR = "./cache/proxy";
const TTL = 1000 * 60 * 60 * 24;
const MAX_BYTES = 10 * 1024 * 1024;

setInterval(() => {
    if (!fs.existsSync(CACHE_DIR)) return;

    const now = Date.now();
    for (const f of fs.readdirSync(CACHE_DIR)) {
        if (f.endsWith(".type")) continue;

        const file = path.join(CACHE_DIR, f);

        try {
            const age = now - fs.statSync(file).mtimeMs;
            if (age > TTL) {
                fs.unlinkSync(file);
                if (fs.existsSync(file + ".type")) fs.unlinkSync(file + ".type");
            }
        } catch {}
    }
}, 1000 * 60 * 30);

function isBlockedIp(ip) {
    if (net.isIP(ip) === 4) {
        const p = ip.split(".").map(Number);
        if (p[0] === 10) return true;
        if (p[0] === 127) return true;
        if (p[0] === 0) return true;
        if (p[0] === 169 && p[1] === 254) return true;
        if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
        if (p[0] === 192 && p[1] === 168) return true;
        return false;
    }

    if (net.isIP(ip) === 6) {
        const v = ip.toLowerCase();
        if (v === "::1" || v === "::") return true;
        if (v.startsWith("fc") || v.startsWith("fd")) return true;
        if (v.startsWith("fe80:")) return true;
        if (v.startsWith("::ffff:")) {
            const mapped = v.slice(7);
            if (net.isIP(mapped) === 4) return isBlockedIp(mapped);
            return true;
        }
        return false;
    }

    return true;
}

async function assertSafeHost(hostname) {
    if (!hostname) throw new Error("Invalid host");

    if (net.isIP(hostname)) {
        if (isBlockedIp(hostname)) throw new Error("Blocked host");
        return;
    }

    const records = await dns.lookup(hostname, { all: true });
    if (!records.length) throw new Error("DNS failed");

    for (const record of records) {
        if (isBlockedIp(record.address)) throw new Error("Blocked host");
    }
}

function normalizeType(type) {
    return String(type || "").split(";")[0].trim().toLowerCase();
}

function isAllowedImageType(type) {
    if (!type.startsWith("image/")) return false;
    if (type === "image/svg+xml") return false;
    return true;
}

app.get("/proxy", async (req, res) => {
    const url = req.query.url;
    if (!url || typeof url !== "string") return res.status(400).send("Invalid URL");

    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        return res.status(400).send("Invalid URL");
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        return res.status(400).send("Invalid URL");
    }

    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    const hash = crypto.createHash("sha1").update(parsed.toString()).digest("hex");
    const file = path.join(CACHE_DIR, hash);
    const typefile = file + ".type";

    try {
        await assertSafeHost(parsed.hostname);

        if (fs.existsSync(file) && fs.existsSync(typefile)) {
            const age = Date.now() - fs.statSync(file).mtimeMs;

            if (age < TTL) {
                const type = normalizeType(fs.readFileSync(typefile, "utf8"));
                if (!isAllowedImageType(type)) {
                    try { fs.unlinkSync(file); } catch {}
                    try { fs.unlinkSync(typefile); } catch {}
                    return res.status(415).send("Blocked content type");
                }

                res.setHeader("Content-Type", type);
                res.setHeader("X-Content-Type-Options", "nosniff");
                return fs.createReadStream(file).pipe(res);
            }

            try { fs.unlinkSync(file); } catch {}
            try { fs.unlinkSync(typefile); } catch {}
        }

        const r = await fetch(parsed.toString(), {
            timeout: 7000,
            redirect: "error",
            size: MAX_BYTES
        });

        if (!r.ok) return res.status(500).send("Fetch failed");

        const type = normalizeType(r.headers.get("content-type"));
        if (!isAllowedImageType(type)) {
            return res.status(415).send("Blocked content type");
        }

        const ws = fs.createWriteStream(file);
        await new Promise((resolve, reject) => {
            r.body.pipe(ws);
            r.body.on("error", reject);
            ws.on("error", reject);
            ws.on("finish", resolve);
        });

        fs.writeFileSync(typefile, type);

        res.setHeader("Content-Type", type);
        res.setHeader("X-Content-Type-Options", "nosniff");
        fs.createReadStream(file).pipe(res);
    } catch {
        res.status(500).send("Proxy error");
    }
});

export default (io) => (socket) => {};