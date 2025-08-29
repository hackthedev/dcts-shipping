class FileManager {
    static async saveFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' }); // or 'application/json' if it's JSON
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
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


}