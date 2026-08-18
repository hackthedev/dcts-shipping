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

export function getFileHash(path){
    const finalBuf = fs.readFileSync(path);
    return sha256(finalBuf);
}



export default (io) => (socket) => {


};
