class FileManager {
    static async saveFile(content, filename) {
        const blob = new Blob([content], {type: 'text/plain'}); // or 'application/json' if it's JSON
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    static async pickFile(filter = "*") {
        return new Promise((resolve) => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = filter;

            input.onchange = () => {
                resolve(input.files?.[0] || null);
            };

            input.click();
        });
    }

    static async readFile(callback, filter = ".txt,.json") {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = filter; // optional, filters file types

        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                callback(reader.result);
            };
            reader.readAsText(file);
        };

        input.click();
    }

    static async fileToBase64(input) {
        // if its already a base64 string
        if (typeof input === "string" && input.startsWith("data:")) return input;

        // if its a url
        if (typeof input === "string") {
            const res = await fetch(input);
            const blob = await res.blob();
            return await FileManager.fileToBase64(blob);
        }

        // if its a file or blob
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(input);
        });
    }

    static generateId(length) {
        let result = '1';
        const characters = '0123456789';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length - 1) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    }

    static async srcToFile(src) {
        if (!src || typeof src !== "string")
            return {ok: false, error: "invalid_src"};

        try {
            const r = await fetch(src);
            if (!r.ok)
                return {ok: false, error: "fetch_failed", status: r.status};

            const blob = await r.blob();
            const ext = blob.type.split("/")[1] || "bin";
            const filename = `${this.generateId(16)}.${ext}`;
            const file = new File([blob], filename, {type: blob.type});

            const res = await this.uploadFile([file]);
            return res;
        } catch (err) {
            console.error("srcToFile error:", err);
            return {ok: false, error: "srcToFile_failed"};
        }
    }

    static async uploadFile(files, {
        accountId = null,
        accountToken = null,
        onProgress = null,
        params = {}
    } = {}) {
        const file = files[0] || files;
        const chunkSize = 1024 * 256; // 256kb
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileId = crypto.randomUUID();

        const filename = file.name;

        let lastPercent = -1;

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = start + chunkSize;
            const chunk = file.slice(start, end);

            const arrayBuf = await chunk.arrayBuffer();

            const search = new URLSearchParams({
                filename,
                chunkIndex: i,
                totalChunks,
                fileId,
                ...params
            });

            const url = `/upload?${search.toString()}`;


            const res = await fetch(url, {
                method: "POST",
                body: arrayBuf,
                headers: {
                    "x-user-id": accountId,
                    "x-auth-token": accountToken
                },
            });

            const json = await res.json();

            if (!json.ok)
                return json;

            const percent = Math.round(((i + 1) / totalChunks) * 100);
            if (percent !== lastPercent) {
                lastPercent = percent;

                if(onProgress && typeof onProgress === "function"){
                    await onProgress(percent);
                }
            }

            if (json.ok && json.path) {
                return json;
            }
        }

        return {ok: false, error: "unknown_upload_error"};
    }
}