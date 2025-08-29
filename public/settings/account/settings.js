console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

// IMPORTANT! By default, socket.io() connects to the host that
// served the page, so we dont have to pass the server url
var socket = io.connect();

initPow(() => {
    socket.emit("userConnected", {
        id: UserManager.getID(), name: UserManager.getUsername(), icon: UserManager.getPFP(), status: UserManager.getStatus(), token: UserManager.getToken(),
        aboutme: UserManager.getAboutme(), banner: UserManager.getBanner()
    }, function (response) {

    });


    var page = getUrlParams("page") || "profile";
    loadPageContent(page)

});
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
