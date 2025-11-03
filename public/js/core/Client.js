function Client() {
    return window.chrome.webview.hostObjects.dcts;
}

function isLauncher() {
    try {
        return !!(
            window.chrome &&
            typeof window.chrome.webview !== "undefined" &&
            window.chrome.webview !== null
        );
    } catch {
        return false;
    }
}
