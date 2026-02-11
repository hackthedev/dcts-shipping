/*
DEPRECATED AND LEFT FOR LEGACY
 */

function upload(files) {
    const fileArray = Array.isArray(files) ? files : [files];

    const uploadPromises = fileArray.map((file, index) => uploadFileInChunks(file, index));

    return Promise.all(uploadPromises)
        .then((urls) => {
            console.log("All files uploaded successfully:", urls);
            let processedFiles = files instanceof File ? urls[0] : urls;
            return { status: "done", urls: processedFiles };
        })
        .catch((errorMsg) => {
            console.error("Error during upload:", errorMsg);
            return { error: errorMsg };
        });
}

function uploadFileInChunks(file, fileIndex) {
    showSystemMessage({
        title: `Uploading file...`,
        text: ``,
        icon: "info",
        type: "neutral",
        duration: 10000
    });

    const chunkSize = 5 * 1024 * 1024; // 5 MB per chunk
    const totalChunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    const fileIdValue = UserManager.generateId(12);
    return new Promise((resolve, reject) => {
        async function sendChunk() {
            const start = currentChunk * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            const arrayBuffer = await chunk.arrayBuffer();
            const uint8ArrayChunk = new Uint8Array(arrayBuffer);

            const metadata = {
                filename: file.name,
                id: UserManager.getID(),
                token: UserManager.getToken(),
                totalChunks: totalChunks,
                chunkIndex: currentChunk,
                fileId: fileIdValue
            };

            console.log(`Sending chunk ${currentChunk + 1}/${totalChunks} of file: ${file.name}`);

            socket.emit("fileUpload", { chunk: uint8ArrayChunk, metadata: metadata }, (response) => {
                if (response?.type === "success") {
                    currentChunk++;
                    const progress = Math.round((currentChunk / totalChunks) * 100);
                    console.log(`File ${fileIndex + 1} Progress: ${progress}%`);
                    showUploadProgress(fileIndex, progress);

                    if (currentChunk < totalChunks) {
                        sendChunk();
                    } else {
                        console.log(`File ${fileIndex + 1} upload complete`);

                        showSystemMessage({
                            title: "Uploaded file!",
                            text: ``,
                            icon: "success",
                            img: null,
                            type: "success",
                            duration: 2000
                        });

                        resolve(response.msg);
                    }
                } else {
                    console.log("Error uploading chunk:", response?.msg);
                    showSystemMessage({
                        title: response?.msg || "Error",
                        text: "",
                        icon: response?.type || "error",
                        type: response?.type || "error",
                        duration: 4000,
                    });
                    reject(response?.msg || "Upload error");
                }
            });
        }

        sendChunk();
    });
}

function showUploadProgress(fileIndex, progressPercent) {
    console.log(`File ${fileIndex + 1}: ${progressPercent}%`);
    showSystemMessage({
        title: `Uploading file: ${progressPercent}% complete`,
        text: ``,
        icon: "info",
        type: "neutral",
        duration: 10000
    });
}

function generateId(length) {
    let result = '1';
    const characters = '0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length-1) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}
