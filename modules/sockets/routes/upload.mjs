import { app } from "../../../index.mjs";
import { fileTypeFromBuffer, fs, serverconfig } from "../../../index.mjs";
import { getMemberHighestRole } from "../../functions/chat/helper.mjs";
import { hasPermission } from "../../functions/chat/main.mjs";
import { sanitizeFilename, validateMemberId } from "../../functions/main.mjs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import { Transform } from "stream";
import Logger from "../../functions/logger.mjs";

const UPLOAD_DIR = "./public/uploads";
const EMOJI_DIR = "./public/emojis";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(EMOJI_DIR, { recursive: true });

export function getFileHash(filePath){
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const stream = fs.createReadStream(filePath);
        stream.on("data", (chunk) => hash.update(chunk));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", reject);
    });
}

async function getFolderSizeAsync(folderPath) {
    const files = await fs.promises.readdir(folderPath);
    let totalSize = 0;
    for (const file of files) {
        const stat = await fs.promises.stat(path.join(folderPath, file));
        totalSize += stat.size;
    }
    return totalSize;
}

app.post("/upload", async (req, res) => {
    try {
        const {
            id,
            token,
            type = "upload",
            filename,
            chunkIndex,
            totalChunks,
            fileId
        } = req.query || {};

        const numericChunkIndex = Number(chunkIndex);
        const numericTotalChunks = Number(totalChunks);
        const normalizedType = String(type || "upload");

        if (!id || !token || !filename || !fileId || Number.isNaN(numericChunkIndex) || Number.isNaN(numericTotalChunks) || numericTotalChunks <= 0) {
            return res.status(400).json({ ok: false, error: "invalid_request" });
        }

        if (validateMemberId(id, null, token) !== true) {
            return res.status(401).json({ ok: false, error: "unauthorized" });
        }

        if (normalizedType !== "upload" && normalizedType !== "emoji") {
            return res.status(400).json({ ok: false, error: "invalid_type" });
        }

        if (normalizedType === "upload" && !hasPermission(id, "uploadFiles")) {
            return res.status(403).json({ ok: false, error: "no_permission" });
        }

        if (normalizedType === "emoji" && !hasPermission(id, "manageEmojis")) {
            return res.status(403).json({ ok: false, error: "no_permission" });
        }

        const role = getMemberHighestRole(id);
        const maxBytes = (role?.permissions?.maxUpload || 10) * 1024 * 1024;
        const dir = normalizedType === "emoji" ? EMOJI_DIR : UPLOAD_DIR;
        const baseUrl = normalizedType === "emoji" ? "/emojis" : "/uploads";
        const clean = sanitizeFilename(filename);
        const temp = path.join(dir, `${fileId}_${clean}`);

        if (numericChunkIndex === 0 &&
            await getFolderSizeAsync(dir) >= serverconfig.serverinfo.maxUploadStorage * 1024 * 1024) {
            return res.status(507).json({ ok: false, error: "storage_full" });
        }

        const currentSize = await fs.promises.stat(temp).then((s) => s.size).catch(() => 0);
        let nextSize = currentSize;
        let headerBuf = Buffer.alloc(0);

        const limiter = new Transform({
            transform(chunk, encoding, callback) {
                if (headerBuf.length < 5000) {
                    const remaining = 5000 - headerBuf.length;
                    headerBuf = Buffer.concat([headerBuf, chunk.subarray(0, remaining)]);
                }

                nextSize += chunk.length;
                if (nextSize > maxBytes && role?.info?.id !== 1111) {
                    callback(new Error("file_too_large"));
                    return;
                }

                callback(null, chunk);
            }
        });

        try {
            await pipeline(req, limiter, fs.createWriteStream(temp, { flags: numericChunkIndex === 0 ? "w" : "a" }));
        } catch (err) {
            if (err?.message === "file_too_large") {
                await fs.promises.unlink(temp).catch(() => null);
                return res.status(413).json({ ok: false, error: "file_too_large" });
            }
            throw err;
        }

        if (numericChunkIndex === 0) {
            const { mime } = (await fileTypeFromBuffer(headerBuf)) || {};
            if (!mime || !serverconfig.serverinfo.uploadFileTypes.includes(mime)) {
                await fs.promises.unlink(temp).catch(() => null);
                return res.status(415).json({ ok: false, error: "mime_not_allowed" });
            }
        }

        if (numericChunkIndex + 1 < numericTotalChunks) {
            return res.json({ ok: true, part: true });
        }

        const hash = await getFileHash(temp);
        const existing = (await fs.promises.readdir(dir)).find((name) => name.startsWith(`${hash}_`) && name !== path.basename(temp));
        if (existing) {
            await fs.promises.unlink(temp);
            return res.json({ ok: true, exists: true, path: `${baseUrl}/${existing}` });
        }

        const finalName = `${hash}_${clean}`;
        await fs.promises.rename(temp, path.join(dir, finalName));
        return res.json({ ok: true, exists: false, path: `${baseUrl}/${finalName}` });

    } catch (err) {
        Logger.error("Upload Error", err);
        return res.status(500).json({ ok: false, error: "server_error" });
    }
});




export default (io) => (socket) => {


};
