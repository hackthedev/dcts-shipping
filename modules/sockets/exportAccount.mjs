import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto";
import { serverconfig } from "../../index.mjs";
import Logger from "../functions/logger.mjs";
import { validateMemberId } from "../functions/main.mjs";

function withAbsoluteAssetUrl(assetPath, origin) {
    if (typeof assetPath !== "string") return assetPath;
    if (!assetPath.startsWith("/") || !origin) return assetPath;
    return `${origin}${assetPath}`;
}

function encryptExportedAccount(account, passphrase) {
    const salt = randomBytes(16);
    const iv = randomBytes(12);
    const iterations = 250000;
    const key = pbkdf2Sync(passphrase, salt, iterations, 32, "sha256");
    const cipher = createCipheriv("aes-256-gcm", key, iv);

    const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(account), "utf8"),
        cipher.final(),
        cipher.getAuthTag()
    ]);

    return {
        encrypted: true,
        version: 1,
        algorithm: "AES-GCM",
        kdf: "PBKDF2",
        hash: "SHA-256",
        iterations,
        salt: salt.toString("base64"),
        iv: iv.toString("base64"),
        ciphertext: ciphertext.toString("base64")
    };
}

export default (io) => (socket) => {
    // socket.on code here
    socket.on('exportAccount', async function(member, response) {
        if (await validateMemberId(member?.id, socket, member?.token)
        ) {
            try{
                const account = JSON.parse(JSON.stringify(serverconfig?.servermembers[member?.id] || {}));
                const origin = typeof member?.origin === "string" ? member.origin : "";

                account.icon = withAbsoluteAssetUrl(account.icon, origin);
                account.banner = withAbsoluteAssetUrl(account.banner, origin);

                if (typeof member?.passphrase === "string" && member.passphrase.length > 0) {
                    response({ account: encryptExportedAccount(account, member.passphrase), encrypted: true, error: null });
                    return;
                }

                response({ account, encrypted: false, error: null })
            }
            catch (exception){
                Logger.error(exception);
                response({ account: null, encrypted: false, error: "Unable to export account" });
            }
        }

    });
}
