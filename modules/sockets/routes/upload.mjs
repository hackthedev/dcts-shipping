import path from "path";
import crypto from "crypto";

import multer from "multer";
import { fileTypeFromBuffer, fs, serverconfig } from "../../../index.mjs";
import { getMemberHighestRole } from "../../functions/chat/helper.mjs";
import { hasPermission } from "../../functions/chat/main.mjs";
import { getFolderSize, sanitizeFilename, generateId } from "../../functions/main.mjs";
import Logger from "../../functions/logger.mjs";
import { app } from "../../../index.mjs";

const UPLOAD_DIR = "./public/uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({ storage: multer.memoryStorage() });

function sha256(buf) {
    return crypto.createHash("sha256").update(buf).digest("hex");
}

app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const { id, type = "upload" } = req.body;
        const file = req.file;

        if (!file) return res.status(400).json({ ok: false, error: "no_file" });

        const sanitizedFilename = sanitizeFilename(file.originalname || "file");
        const localUploadPath = type === "emoji" ? "./public/emojis" : UPLOAD_DIR;
        fs.mkdirSync(localUploadPath, { recursive: true });

        // perm check
        if (type === "upload") {
            if (!hasPermission(id, "uploadFiles"))
                return res.status(403).json({ ok: false, error: "No permission to upload files" });
        }

        if (type === "emoji") {
            if (!hasPermission(id, "manageEmojis"))
                return res.status(403).json({ ok: false, error: "No permission to manage emojis" });
        }


        // individual file size upload limit from role
        const role = getMemberHighestRole(id);
        const maxFileSizeMB = role?.permissions?.maxUpload || 10;
        const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

        if (file.size > maxFileSizeBytes) return res.status(413).json({ ok: false, error: "file_too_large", limitMB: maxFileSizeMB });

        // storage limit check
        const maxStorageBytes = serverconfig.serverinfo.maxUploadStorage * 1024 * 1024;
        const currentFolderSize = getFolderSize(localUploadPath);
        if (currentFolderSize >= maxStorageBytes) return res.status(507).json({ ok: false, error: "storage_limit_reached" });

        // check mime
        const { mime } = (await fileTypeFromBuffer(file.buffer)) || {};
        if (!mime || !serverconfig.serverinfo.uploadFileTypes.includes(mime)) return res.status(415).json({ ok: false, error: "mime_not_allowed", mime });

        // file name setup etc
        const hash = sha256(file.buffer);
        const idSuffix = generateId(6);
        const ext = path.extname(sanitizedFilename) || "";
        const filename = `${hash}_${sanitizedFilename}`;
        const filepath = path.join(localUploadPath, filename);

        // we wanna avoid duplciates because storage aint cheap
        const existing = fs.readdirSync(localUploadPath).find(f => f.startsWith(hash + "_"));
        if (existing) {
            const existingUrl = `/uploads/${existing}`;
            Logger.debug(`Duplicate detected: ${existingUrl}`);
            return res.json({ ok: true, exists: true, path: existingUrl });
        }

        // finally save the fucking file
        fs.writeFileSync(filepath, file.buffer);
        const fileUrl = filepath.replace(/\\/g, "/").replace("./public", "").replace("public", "");

        Logger.debug(`File uploaded: ${fileUrl}`);
        res.json({
            ok: true,
            exists: false,
            path: fileUrl,
            file_hash: hash,
            size_bytes: file.size,
            mime,
            limit_MB: maxFileSizeMB
        });
    } catch (err) {
        Logger.error("Upload error:", err);
        res.status(500).json({ ok: false, error: "server_error" });
    }
});

export default (io) => (socket) => {};
