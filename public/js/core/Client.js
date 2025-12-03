function Client() {
    return TauriProxy;
}

function isLauncher() {
    return !!window.__TAURI__;
}


const TauriProxy = new Proxy({}, {
    get(target, prop) {
        return async (...args) => {
            let params = {};
            if (args.length === 1 && typeof args[0] === "object") {
                params = args[0];
            } else {
                args.forEach((a, i) => {
                    params["arg" + i] = a;
                });
            }

            return await window.__TAURI__.invoke(prop.toString(), params);
        };
    }
});
