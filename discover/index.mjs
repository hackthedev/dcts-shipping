import {pathToFileURL} from "node:url";

console.clear();

import express from "express";
import {fileURLToPath} from "url";
import path from "path";

const app = express();
import fs from "node:fs";
import mariadb from "mariadb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

if(!fs.existsSync("./config.json")){
    if(fs.existsSync("./config.json.example")){
        fs.cpSync("./config.json.example", "./config.json")
    }
}

export var config = JSON.parse(fs.readFileSync("./config.json", {encoding: "utf-8"}));

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

const port = config?.port || 3000

const pool = mariadb.createPool({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port ?? 3306,
    connectionLimit: config.db.connectionLimit ?? 5
});

export async function dbQuery(sql, params = []) {
    let conn;
    try {
        conn = await pool.getConnection();
        const res = await conn.query(sql, params);
        return res;
    } finally {
        if (conn) conn.release();
    }
}

// db helpers
async function getSettingRaw(key) {
    const rows = await dbQuery("SELECT `value` FROM settings WHERE `name` = ? LIMIT 1", [key]);
    return rows && rows.length ? rows[0].value : null;
}

async function getSettingInt(key, fallback = 0) {
    const v = await getSettingRaw(key);
    if (v == null) return fallback;
    const n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : fallback;
}

async function getSettingFloat(key, fallback = 0.0) {
    const v = await getSettingRaw(key);
    if (v == null) return fallback;
    const n = parseFloat(String(v).trim());
    return Number.isFinite(n) ? n : fallback;
}

async function setSetting(key, value) {
    await dbQuery("INSERT INTO settings (`name`,`value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = NOW()", [key, String(value)]);
}


async function findServersToAutoUnapprove() {
    const maxReports = await getSettingInt('unapprove_max_reports', 5);
    const minRatings = await getSettingInt('unapprove_min_ratings', 10);
    const maxAvgRating = await getSettingFloat('unapprove_avg_rating', 2.0);

    const rows = await dbQuery(`
        SELECT s.id,
               COALESCE(rp.cnt, 0)        AS open_reports,
               COALESCE(rr.cnt, 0)        AS ratings_count,
               COALESCE(rr.avg_rating, 0) AS avg_rating
        FROM servers s
                 LEFT JOIN (SELECT server_id, COUNT(*) AS cnt
                            FROM server_reports
                            WHERE status = 'open'
                            GROUP BY server_id) rp ON rp.server_id = s.id
                 LEFT JOIN (SELECT server_id, COUNT(*) AS cnt, AVG(rating) AS avg_rating
                            FROM server_ratings
                            GROUP BY server_id) rr ON rr.server_id = s.id
        WHERE s.status = 'approved'
    `);

    const toUnapprove = rows.filter(r => {
        if ((r.open_reports || 0) >= maxReports) return true;
        const ratingsCnt = Number(r.ratings_count || 0);
        const avg = Number(r.avg_rating || 0);
        if (ratingsCnt >= minRatings && avg <= maxAvgRating) return true;
        return false;
    });

    return toUnapprove;
}

async function autoUnapproveViolators() {
    const violators = await findServersToAutoUnapprove();
    for (const v of violators) {
        await dbQuery("UPDATE servers SET status = 'pending', updated_at = NOW() WHERE id = ? AND disable_review_unlist=0 OR disable_report_unlist=0", [v.id]);
    }
    return violators.length;
}

export async function createSystemMsg(userId, message, type = "system", meta = null) {
    if (!userId) throw new Error("missing userId");
    if (!message) throw new Error("missing message");

    const res = await dbQuery(
        `INSERT INTO system_messages (user_id, type, message, meta) VALUES (?, ?, ?, ?)`,
        [userId, type, message, meta]
    );
    return res && res.insertId ? res.insertId : null;
}

export async function getOwnerFromServerId(serverId) {
    if (!serverId) throw new Error("missing serverId");
    const rows = await dbQuery(
        `SELECT u.*
         FROM servers s
         JOIN users u ON u.id = s.owner_id
         WHERE s.id = ?
         LIMIT 1`,
        [serverId]
    );
    return rows?.[0] ?? null;
}


export async function markSystemMsgRead(messageId) {
    if (!messageId) throw new Error("missing messageId");
    await dbQuery(`UPDATE system_messages SET is_read = 1 WHERE id = ?`, [messageId]);
    return true;
}

export async function getUserSystemMessages(userId, { unreadOnly = false } = {}) {
    if (!userId) throw new Error("missing userId");
    const rows = await dbQuery(
        unreadOnly
            ? `SELECT * FROM system_messages WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC`
            : `SELECT * FROM system_messages WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );
    return rows;
}



async function initSchema() {
    const conn = await pool.getConnection();
    try {
        await conn.query("SET NAMES utf8mb4");
        await conn.query("SET time_zone = '+00:00'");

        // users
        await conn.query(`
            CREATE TABLE IF NOT EXISTS users (
                id            INT(11) NOT NULL AUTO_INCREMENT,
                email         VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role          ENUM('user','admin') NOT NULL DEFAULT 'user',
                created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                can_review    INT(11) NOT NULL DEFAULT 1,
                can_report    INT(11) NOT NULL DEFAULT 1,
                PRIMARY KEY (id),
                UNIQUE KEY email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        // servers
        await conn.query(`
            CREATE TABLE IF NOT EXISTS servers (
                id                   INT(11) NOT NULL AUTO_INCREMENT,
                owner_id             INT(11) NOT NULL,
                url                  VARCHAR(512) NOT NULL,
                tags                 VARCHAR(255) NOT NULL,
                status               ENUM('approved','pending','rejected','blocked') NOT NULL DEFAULT 'pending',
                status_reason        VARCHAR(500) NOT NULL,
                current_data         LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(current_data)),
                last_checked         TIMESTAMP NULL DEFAULT NULL,
                created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                disable_review_unlist INT(11) NOT NULL DEFAULT 0,
                disable_report_unlist INT(11) NOT NULL DEFAULT 0,
                PRIMARY KEY (id),
                UNIQUE KEY uniq_url (url),
                KEY status_idx (status),
                KEY owner_idx (owner_id),
                CONSTRAINT fk_server_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        // server_ratings
        await conn.query(`
            CREATE TABLE IF NOT EXISTS server_ratings (
                id         INT(11) NOT NULL AUTO_INCREMENT,
                server_id  INT(11) NOT NULL,
                user_id    INT(11) NOT NULL,
                rating     TINYINT(4) NOT NULL CHECK (rating BETWEEN 1 AND 5),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY ux_server_user (server_id,user_id),
                KEY user_id (user_id),
                CONSTRAINT server_ratings_ibfk_1 FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE,
                CONSTRAINT server_ratings_ibfk_2 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        // server_reports
        await conn.query(`
            CREATE TABLE IF NOT EXISTS server_reports (
                id          INT(11) NOT NULL AUTO_INCREMENT,
                server_id   INT(11) NOT NULL,
                reporter_id INT(11) DEFAULT NULL,
                reason      VARCHAR(100) NOT NULL,
                details     TEXT DEFAULT NULL,
                status      ENUM('open','in_progress','closed') NOT NULL DEFAULT 'open',
                handled_by  INT(11) DEFAULT NULL,
                created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                handled_at  TIMESTAMP NULL DEFAULT NULL,
                PRIMARY KEY (id),
                KEY idx_server_reports_server (server_id),
                KEY idx_server_reports_reporter (reporter_id),
                KEY fk_sr_handled_by (handled_by),
                CONSTRAINT fk_sr_server FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE,
                CONSTRAINT fk_sr_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE SET NULL,
                CONSTRAINT fk_sr_handled_by FOREIGN KEY (handled_by) REFERENCES users (id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        // settings
        await conn.query(`
            CREATE TABLE IF NOT EXISTS settings (
                name       VARCHAR(100) NOT NULL,
                value      TEXT NOT NULL,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

        // Default settings
        await conn.query(`
            INSERT IGNORE INTO settings (name, value)
            VALUES 
                ('unapprove_avg_rating', '2.0'),
                ('unapprove_max_reports', '3'),
                ('unapprove_min_ratings', '5')
        `);

        // system_messages
        await conn.query(`
            CREATE TABLE IF NOT EXISTS system_messages (
                id         INT(11) NOT NULL AUTO_INCREMENT,
                user_id    INT(11) NOT NULL,
                type       ENUM('system','info','warning','error') NOT NULL DEFAULT 'system',
                message    TEXT NOT NULL,
                is_read    TINYINT(1) NOT NULL DEFAULT 0,
                meta       LONGTEXT DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_sysmsg_user (user_id),
                CONSTRAINT fk_sysmsg_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);

    } finally {
        conn.release();
    }
}

await initSchema();












app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const JWT_SECRET = makeid(48);
const JWT_EXPIRES_IN = config.auth?.expiresIn || "7d";

function _normalizeBigInt(x) {
    if (x === null || x === undefined) return x;
    if (typeof x === "bigint") {
        const n = Number(x);
        return Number.isSafeInteger(n) ? n : String(x);
    }
    if (Array.isArray(x)) return x.map(_normalizeBigInt);
    if (typeof x === "object") {
        const out = {};
        for (const k of Object.keys(x)) out[k] = _normalizeBigInt(x[k]);
        return out;
    }
    return x;
}

function signToken(payload) {
    const p = _normalizeBigInt(payload);
    return jwt.sign(p, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN});
}


const requireAuth = asyncHandler(async (req, res, next) => {
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
    if (!token) return res.status(401).json({ok: false, error: "Unauthorized"});
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch {
        return res.status(401).json({ok: false, error: "Unauthorized"});
    }
    let id = decoded.id;
    if (typeof id === "string" && /^\d+$/.test(id)) id = Number(id);
    if (typeof id === "bigint") {
        const n = Number(id);
        id = Number.isSafeInteger(n) ? n : String(id);
    }
    req.user = {id, role: decoded.role || "user"};
    next();
});

async function isAdmin(userId){
    if(!userId) return false;

    const rows = await dbQuery("SELECT role FROM users WHERE id = ?", [userId]); /* db */
    const row = rows[0];
    const isAdmin = row?.role === "admin"
    return isAdmin;
}

async function getUser(userId){
    if(!userId) return false;

    const rows = await dbQuery("SELECT * FROM users WHERE id = ?", [userId]); /* db */
    const row = rows[0];
    return row;
}

const requireAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user?.id) return res.status(401).json({ok: false, error: "Unauthorized"});
    const rows = await dbQuery("SELECT role FROM users WHERE id = ?", [req.user.id]); /* db */
    const row = rows[0];
    const isAdmin = row?.role === "admin"
    if (!isAdmin) return res.status(403).json({ok: false, error: "Forbidden"});
    next();
});

function sanitizeForJson(value) {
    if (value === null || value === undefined) return value;

    if (value instanceof Date) return value.toISOString();

    if (typeof value === "bigint") {
        const n = Number(value);
        if (Number.isSafeInteger(n)) return n;
        return value.toString();
    }

    if (Buffer && Buffer.isBuffer && Buffer.isBuffer(value)) {
        return value.toString("base64");
    }

    if (Array.isArray(value)) return value.map(sanitizeForJson);

    if (typeof value === "object") {
        const out = {};
        for (const k of Object.keys(value)) out[k] = sanitizeForJson(value[k]);
        return out;
    }

    return value;
}


app.use((req, res, next) => {
    const _json = res.json.bind(res);
    res.json = (body) => _json(sanitizeForJson(body));
    next();
});

let tagLength = 25;

async function loadRouteFiles(dir = path.join(__dirname, "routes")) {
    async function walk(current) {
        const entries = await fs.promises.readdir(current, {withFileTypes: true}).catch(() => []);
        for (const ent of entries) {
            const full = path.join(current, ent.name);
            if (ent.isDirectory()) {
                await walk(full);
                continue;
            }
            if (!ent.isFile()) continue;
            if (!(/\.(js|mjs)$/i).test(ent.name)) continue;
            if (ent.name.includes("template")) continue;

            try {
                const mod = await import(pathToFileURL(full).toString());
                if (typeof mod.default === "function") {
                    mod.default(app, {
                        dbQuery,
                        pool,
                        asyncHandler,
                        requireAuth,
                        requireAdmin,
                        signToken,
                        sanitizeForJson,
                        tagLength,
                        autoUnapproveViolators,
                        createSystemMsg,
                        getUserSystemMessages,
                        markSystemMsgRead,
                        getOwnerFromServerId,
                        isAdmin,
                        getUser
                    });
                }
            } catch (err) {
                console.error("Failed to load route:", full, err);
            }
        }
    }

    await walk(dir);
}

await loadRouteFiles();


app.use((req, res) => {
    res.status(404).json({ok: false, error: "Not Found"});
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
