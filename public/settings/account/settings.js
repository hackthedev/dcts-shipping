console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

document.addEventListener("DOMContentLoaded", async () => {
    doInit(() => {
        var page = getUrlParams("page") || "profile";
        loadPageContent(page)
    });

    ContextMenu.init();
})

function setUrl(param) {
    window.history.replaceState(null, null, param); // or pushState
    let page = param.replace("?page=", "");
    loadPageContent(page)
}

function getUrlParams(param) {
    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get(param);

    return urlChannel;
}

function closeSettings(){
    let pagePopup = window.parent.document.querySelector('#settingsPopup');
    if(pagePopup) {
        pagePopup.remove()
    }
    else {
        throw new Error("No page popup to be closed is present!");
    }
}
