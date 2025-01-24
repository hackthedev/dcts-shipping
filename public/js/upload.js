function upload(files) {
    // Handle both single file and array of files
    const fileArray = Array.isArray(files) ? files : [files];

    // Map over each file and start the upload, returning an array of promises
    const uploadPromises = fileArray.map((file, index) => uploadFileInChunks(file, index));

    // Wait until all uploads are done and return the result
    return Promise.all(uploadPromises)
        .then((urls) => {
            console.log("All files uploaded successfully:", urls);
            // Return a single URL if only one file, otherwise an array of URLs
            let processedFiles = files instanceof File ? urls[0] : urls; // Single file returns the URL directly
            return { status: "done", urls: processedFiles };
        })
        .catch((errorMsg) => {
            console.error("Error during upload:", errorMsg);
            return { error: errorMsg };
        });
}

/*
function upload(files) {
    // Map over each file and start the upload, returning an array of promises
    const uploadPromises = Array.from(files).map((file, index) => uploadFileInChunks(file, index));

    // Wait until all uploads are done and return an array of URLs
    return Promise.all(uploadPromises)
        .then((urls) => {
            console.log("All files uploaded successfully:", urls);
            return { status: "done", urls };
        })
        .catch((error) => {
            console.error("Error during upload:", error);
            return { status: "error", error };
        });
}
        */

function uploadFileInChunks(file, fileIndex) {
    const chunkSize = 5 * 1024 * 1024; // 5 MB per chunk
    const totalChunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    const fileIdValue = generateId(12);

    // Return a promise that resolves with the final URL when upload is complete
    return new Promise((resolve, reject) => {
        async function sendChunk() {
            const start = currentChunk * chunkSize;
            const end = Math.min(start + chunkSize, file.size);
            const chunk = file.slice(start, end);

            // Convert the chunk to ArrayBuffer, then to Uint8Array for compatibility
            const arrayBuffer = await chunk.arrayBuffer();
            const uint8ArrayChunk = new Uint8Array(arrayBuffer);

            const metadata = {
                filename: file.name,
                id: getID(),
                token: getToken(),
                totalChunks: totalChunks,
                chunkIndex: currentChunk,
                fileId: fileIdValue
            };

            console.log(`Sending chunk ${currentChunk + 1}/${totalChunks} of file: ${file.name}`);

            // Send the chunk with metadata
            socket.emit("fileUpload", { chunk: uint8ArrayChunk, metadata: metadata }, (response) => {
                if (response?.type === "success") {
                    currentChunk++;
                    const progress = Math.round((currentChunk / totalChunks) * 100);
                    console.log(`File ${fileIndex + 1} Progress: ${progress}%`);
                    showUploadProgress(fileIndex, progress); // Update the UI

                    if (currentChunk < totalChunks) {
                        sendChunk(); // Send the next chunk
                    } else {
                        console.log(`File ${fileIndex + 1} upload complete`);
                        resolve(response.msg); // Resolve with the URL after all chunks are sent
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
                    reject(response?.msg || "Upload error"); // Reject on error
                }
            });
        }

        sendChunk(); // Start sending the first chunk
    });
}

function showUploadProgress(fileIndex, progressPercent) {
    console.log(`File ${fileIndex + 1}: ${progressPercent}%`); // Replace with UI code for each file's progress
    showSystemMessage({
        title: `Uploading file: ${progressPercent}% complete`,
        text: ``,
        icon: "info",
        type: "neutral",
        duration: 0
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
