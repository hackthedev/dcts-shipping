function Client() {
    return window?.chrome?.webview?.hostObjects?.dcts;
}

function isLauncher() {
    try {
        return !!Client()
    } catch {
        return false;
    }
}
