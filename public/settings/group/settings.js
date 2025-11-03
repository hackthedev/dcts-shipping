console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");


doInit(() => {
    socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageGroups" }, function (response) {
        if (response.permission == "denied") {
            window.location.href = window.location.origin;
        }
        else {
            document.getElementById("pagebody").style.display = "block";
        }
    });


    var page = getUrlParams("page") || "group-info";
    loadPageContent(page)
});


var page = getUrlParams("page") || "group-info";
loadPageContent(page)

function setUrl(param) {
    window.history.replaceState(null, null, param); // or pushState
}

function getUrlParams(param) {
    var url = window.location.search;
    var urlParams = new URLSearchParams(url);
    var urlChannel = urlParams.get(param);

    return urlChannel;
}
