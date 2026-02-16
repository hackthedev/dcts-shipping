import { fetch, fileTypeFromBuffer, FormData, fs, path, serverconfig, xssFilters, crypto } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId, sanitizeFilename, getFolderSize, mimeTypesCache, fileSizeCache, generateId } from "../functions/main.mjs";

function computeMD5(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("md5");
        const s = fs.createReadStream(filePath);
        s.on("data", d => hash.update(d));
        s.on("error", reject);
        s.on("end", () => resolve(hash.digest("hex")));
    });
}


export default (io) => (socket) => {
    // socket.on code here
    socket.on("fileUpload", async ({ chunk, metadata }, response) => {


        let { id, token, filename, type, totalChunks, chunkIndex, fileId } = metadata; // Expect fileId in metadata
        
        if (validateMemberId(id, socket, token) !== true) {
            response({ type: "error", msg: "Invalid authentication" });
            return;
        }

        const sanitizedFilename = sanitizeFilename(filename);
        

        let localUploadPath;
        if (type === "emoji") {
            if (!hasPermission(id, "manageEmojis")) {
                response({ type: "error", msg: "You don't have permissions to manage Emojis" });
                return;
            }
            localUploadPath = "./public/emojis";
        } else {
            if (!hasPermission(id, "uploadFiles")) {
                response({ type: "error", msg: "You don't have permissions to upload files" });
                return;
            }
            localUploadPath = "./public/uploads";
        }

        var userRole = getMemberHighestRole(id);
        var userUpload = userRole.permissions.maxUpload;

        let maxFileSizeMB = userUpload;
        const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024; // Convert MB to bytes
        const maxStorageBytes = serverconfig.serverinfo.maxUploadStorage * 1024 * 1024; // Convert MB to bytes

        const finalFilename = `${type === "emoji" ? "emoji" : "upload"}_${fileId}_${sanitizedFilename}`;
        const tempFilePath = path.join(localUploadPath, finalFilename);

        // Check server storage limit on the first chunk only
        if (chunkIndex === 0) {
            const currentFolderSize = getFolderSize(localUploadPath);
            if (currentFolderSize >= maxStorageBytes) {
                response({ type: "error", msg: "Server's max storage limit reached." });
                return;
            }
        }

        // track file size
        const chunkSize = chunk.length;
        const currentFileSize = (fileSizeCache.get(fileId) || 0) + chunkSize;
        fileSizeCache.set(fileId, currentFileSize);

        if (currentFileSize > maxFileSizeBytes) {
            response({ type: "error", msg: `File exceeds max size of ${maxFileSizeMB} MB.` });

            // Schedule deletion of any partial file
            setTimeout(() => {
                fs.unlink(tempFilePath, (err) => {
                    if (err) {
                        Logger.error(`Error deleting file ${tempFilePath}:`);
                        Logger.error(err)
                    }
                });
            }, 5000);
            return;
        }

        // validate MIME type on the first chunk only
        if (chunkIndex === 0) { 
            try { 
                const { mime } = await fileTypeFromBuffer(chunk); // Check MIME type from the first chunk
                if (!mime || !serverconfig.serverinfo.uploadFileTypes.includes(mime)) {
                    response({ type: "error", msg: `File type ${mime} is not allowed on the server` });
                    return;
                }
                mimeTypesCache.set(fileId, mime); // Cache the MIME type after validation
            } catch (error) {
                Logger.error("Error determining file type:");
                Logger.error(error);

                response({ type: "error", msg: "Unable to determine file type" });
                return;
            }
        } else {
            // For subsequent chunks, check if the MIME type was validated
            if (!mimeTypesCache.has(fileId)) {
                response({ type: "error", msg: "File type validation required on the first chunk" });
                return;
            }
        }

        // Append chunk to file
        try {
            fs.appendFileSync(tempFilePath, chunk, "binary");
            Logger.debug(`Chunk ${chunkIndex + 1}/${totalChunks} appended to ${tempFilePath}`);
        } catch (error) {
            Logger.error("Error writing chunk to file:");
            Logger.error(error)

            response({ type: "error", msg: "Error writing file chunk" });
            return;
        }

        // Handle last chunk and finalize upload
        if (chunkIndex + 1 === totalChunks) {
            mimeTypesCache.delete(fileId); // Clean up cache after upload completes
            fileSizeCache.delete(fileId); // Clean up file size cache

            // find duplicate files
            try {
                const ext = path.extname(sanitizedFilename).toLowerCase();
                const size = fs.statSync(tempFilePath).size;
                const hash = await computeMD5(tempFilePath);

                const files = fs.readdirSync(localUploadPath);
                for (const name of files) {
                    if (name === path.basename(tempFilePath)) continue;
                    if (path.extname(name).toLowerCase() !== ext) continue;

                    const candidate = path.join(localUploadPath, name);
                    const st = fs.statSync(candidate);
                    if (st.size !== size) continue;

                    const cHash = await computeMD5(candidate);
                    if (cHash === hash) {
                        try { fs.unlinkSync(tempFilePath); } catch {}
                        const existingUrl = candidate
                            .replace(/\\/g, "/")
                            .replace("./public", "")
                            .replace("public", "");
                        Logger.debug(`Duplicate MD5 ${existingUrl}`);
                        response({ type: "success", msg: existingUrl });
                        return;
                    }
                }
            } catch (e) {
                Logger.error(e)
            }


            if (serverconfig.serverinfo.useCloudflareImageCDN === 1 && type !== "emoji") {
                const form = new FormData();
                const cloudname = `uploaded_${generateId(34)}`; 
                form.append('file', fs.createReadStream(tempFilePath));
                form.append('id', cloudname); 

                try {
                    const cloudflareResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${serverconfig.serverinfo.cfAccountId}/images/v1`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${serverconfig.serverinfo.cfAccountToken}` },
                        body: form
                    });

                    if (cloudflareResponse.status === 200) {
                        const cloudflareUrl = `https://imagedelivery.net/${serverconfig.serverinfo.cfHash}/${cloudname}/public`;
                        Logger.debug("Uploaded to Cloudflare:");
                        Logger.debug(cloudflareUrl)

                        fs.unlinkSync(tempFilePath); // Remove local temp file
                        response({ type: "success", msg: cloudflareUrl });
                    } else {
                        response({ type: "error", msg: `Cloudflare upload failed with code: ${cloudflareResponse.status}` });
                    }
                } catch (error) {
                    Logger.error("Error uploading to Cloudflare:");
                    Logger.error(error);

                    response({ type: "error", msg: "Error uploading to Cloudflare" });
                }
            } else {
                // Return local file URL
                const fileUrl = tempFilePath.replace(/\\/g, '/').replace("./public", "").replace("public", "");
                response({ type: "success", msg: fileUrl });
                Logger.debug("File uploaded locally at", fileUrl);
            }
        } else {
            // Progress update for each chunk
            const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
            socket.emit("uploadProgress", { filename, progress });
            response({ type: "success", msg: "Chunk received" });
        }
    });
}
