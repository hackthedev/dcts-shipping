import crypto from "crypto";
import fs from "fs";

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
