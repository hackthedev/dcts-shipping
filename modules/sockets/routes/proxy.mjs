import path from "path";
import crypto from "crypto";
import fetch from "node-fetch";
import { app, fs } from "../../../index.mjs";

const CACHE_DIR = "./cache/proxy";
const TTL = 1000 * 60 * 60 * 24;

// delete all cache files after some time if age expired,
// because otherwise its gonna turn into a junk folder
setInterval(() => {
    const now = Date.now();
    for (const f of fs.readdirSync(CACHE_DIR)) {
        if (f.endsWith(".type")) continue;
        const file = path.join(CACHE_DIR, f);

        try {
            const age = now - fs.statSync(file).mtimeMs;
            if (age > TTL) {
                fs.unlinkSync(file);
                const type = file + ".type";
                if (fs.existsSync(type)) fs.unlinkSync(type);
            }
        } catch {}
    }
}, 1000 * 60 * 30);

app.get("/proxy", async (req, res) => {
    const url = req.query.url;
    if (!url || !/^https?:\/\//.test(url)) return res.status(400).send("Invalid URL");
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

    const hash = crypto.createHash("sha1").update(url).digest("hex");
    const file = path.join(CACHE_DIR, hash);
    const typefile = file + ".type";

    try {
        if (fs.existsSync(file)) {
            const age = Date.now() - fs.statSync(file).mtimeMs;
            if (age < TTL) {
                const type = fs.existsSync(typefile) ? fs.readFileSync(typefile, "utf8") : "application/octet-stream";
                res.setHeader("Content-Type", type);
                return fs.createReadStream(file).pipe(res);
            } else {
                fs.unlinkSync(file);
                if (fs.existsSync(typefile)) fs.unlinkSync(typefile);
            }
        }

        const r = await fetch(url, { timeout: 7000 });
        if (!r.ok) return res.status(500).send("Fetch failed");

        const type = r.headers.get("content-type") || "application/octet-stream";
        const ws = fs.createWriteStream(file);
        await new Promise((resolve, reject) => {
            r.body.pipe(ws);
            r.body.on("error", reject);
            ws.on("finish", resolve);
        });
        fs.writeFileSync(typefile, type);
        res.setHeader("Content-Type", type);
        fs.createReadStream(file).pipe(res);
    } catch {
        res.status(500).send("Proxy error");
    }
});

export default (io) => (socket) => {};
