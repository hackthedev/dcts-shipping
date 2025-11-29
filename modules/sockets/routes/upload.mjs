import { app } from "../../../index.mjs";
import { fileTypeFromBuffer, fs, serverconfig } from "../../../index.mjs";
import { getMemberHighestRole } from "../../functions/chat/helper.mjs";
import { hasPermission } from "../../functions/chat/main.mjs";
import { getFolderSize, sanitizeFilename } from "../../functions/main.mjs";
import path from "path";
import crypto from "crypto";
import Logger from "../../functions/logger.mjs";

const UPLOAD_DIR = "./public/uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function sha256(b) {
    return crypto.createHash("sha256").update(b).digest("hex");
}

app.post("/upload", async (req, res) => {
    try {
        const {
            id,
            type = "upload",
            filename,
            chunkIndex,
            totalChunks,
            fileId
        } = req.query;

        let body = [];
        req.on("data", (c) => body.push(c));

        req.on("end", async () => {
            try {
                const buf = Buffer.concat(body);
                const clean = sanitizeFilename(filename);
                const dir = type === "emoji"
                    ? "./public/emojis"
                    : UPLOAD_DIR;


                if (type === "upload" && !hasPermission(id, "uploadFiles"))
                    return res.status(403).json({ ok: false, error: "no_permission" });

                if (type === "emoji" && !hasPermission(id, "manageEmojis"))
                    return res.status(403).json({ ok: false });


                const role = getMemberHighestRole(id);
                const maxBytes = (role?.permissions?.maxUpload || 10) * 1024 * 1024;

                if (chunkIndex == 0 &&
                    getFolderSize(dir) >= serverconfig.serverinfo.maxUploadStorage * 1024 * 1024)
                    return res.status(507).json({ ok: false, error: "storage_full" });

                const temp = path.join(dir, `${fileId}_${clean}`);

                if (chunkIndex == 0) {
                    const { mime } = (await fileTypeFromBuffer(buf)) || {};
                    if (!mime || !serverconfig.serverinfo.uploadFileTypes.includes(mime))
                        return res.status(415).json({ ok: false, error: "mime_not_allowed" });
                    fs.writeFileSync(temp, Buffer.alloc(0));
                }

                const current = fs.existsSync(temp) ? fs.statSync(temp).size : 0;
                const next = current + buf.length;

                if (next > maxBytes && role?.info.id !== 1111)
                    return res.status(413).json({ ok: false, error: "file_too_large" });

                fs.appendFileSync(temp, buf);

                if (Number(chunkIndex) + 1 < Number(totalChunks))
                    return res.json({ ok: true, part: true });

                const finalBuf = fs.readFileSync(temp);
                const hash = sha256(finalBuf);

                const existing = fs.readdirSync(dir).find(n => n.startsWith(hash + "_"));
                if (existing) {
                    fs.unlinkSync(temp);
                    return res.json({ ok: true, exists: true, path: `/uploads/${existing}` });
                }

                const finalName = `${hash}_${clean}`;
                const finalPath = path.join(dir, finalName);
                fs.renameSync(temp, finalPath);

                return res.json({ ok: true, exists: false, path: `/uploads/${finalName}` });

            } catch (err) {
                Logger.error("Upload Final Err", err);
                return res.status(500).json({ ok: false, error: "server_error" });
            }
        });

    } catch (err) {
        Logger.error("Upload Error", err);
        return res.status(500).json({ ok: false, error: "server_error" });
    }
});
export default (io) => (socket) => {


};
