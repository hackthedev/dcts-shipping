function Client() {
    return isLauncher() ? TauriProxy : null;
}

function isLauncher() {
    return !!window?.__TAURI__?.core;
}


const TauriProxy = new Proxy({}, {
    get(target, prop) {
        return async (...args) => {
            if(!isLauncher()) return;

            let params = {};
            if (args.length === 1 && typeof args[0] === "object") {
                params = args[0];
            } else {
                args.forEach((a, i) => {
                    params["arg" + i] = a;
                });
            }
            
            return await window?.__TAURI__?.core?.invoke(prop?.toString(), params);
        };
    }
});
