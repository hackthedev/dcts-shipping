function Client() {
    const client = window?.dcts;
    if (!client) return null;

    if (typeof client.getPlatform === "function" && client.getPlatform() === "android") {
        const wrapper = {};


        for (const key in client) {
            const value = client[key];

            if (typeof value === "function") {
                wrapper[key] = (...args) => {
                    try {
                        return client[key](...args);
                    } catch (e) {
                        console.error("ANDROID METHOD FAILED:", key);
                        console.error("ARGS:", args);
                        console.error("ERROR:", e);
                        throw e;
                    }
                };
            } else {
                wrapper[key] = value;
            }
        }

        wrapper.SignJson = async obj => {
            const res = client.SignJson(JSON.stringify(obj));
            return res ? JSON.parse(res) : null;
        };

        wrapper.VerifyJson = async (obj, publicKey) => {
            const res = client.VerifyJson(JSON.stringify(obj), publicKey);
            return res === "true" || res === true;
        };

        wrapper.SaveServer = async (address, isFav) => {
            return client.SaveServer(String(address), Boolean(isFav));
        };

        wrapper.GetServer = async address => {
            const res = client.GetServer(String(address));
            return res ? JSON.parse(res) : null;
        };

        return wrapper;
    }

    return client;
}

function isLauncher() {
    return !!Client()
}

function downloadClient(){
    openNewTab("https://github.com/hackthedev/dcts-client-shipping/releases/latest")
}

function openNewTab(url) {
    if (url.startsWith("data:")) {
        const blob = dataURLtoBlob(url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
    } else {
        window.open(url, "_blank");
    }
}