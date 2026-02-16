function Client() {
    return window?.dcts
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