console.log("%c" + "WAIT!", "color: #FF0000; -webkit-text-stroke: 2px black; font-size: 72px; font-weight: bold;");
console.log("%c" + "People can use the console to steal your account xo !", "color: #FF0000; -webkit-text-stroke: 0px black; font-size: 20px; font-weight: bold;");

document.addEventListener("DOMContentLoaded", async () => {
    doInit(() => {
        socket.emit("checkPermission", { id: UserManager.getID(), token: UserManager.getToken(), permission: "manageChannels" }, function (response) {
            if (response.permission == "denied") {
                window.location.href = window.location.origin;
            }
            else {
                document.getElementById("pagebody").style.display = "block";
            }
        });

        var page = getUrlParams("page") || "channel-info";
        loadPageContent(page)
    })

    PermUI.init();

})

function saveChannelInfo(data){
    socket.emit("updateChannel", {id: UserManager.getID(), token: UserManager.getToken(), channelId: getUrlParams("id"), data }, function (response) {
        if(response?.error){
            showSystemMessage(
                {
                    title: "Error while saving settings",
                    text: response?.error || null,
                    type: "error",
                }
            )
        }
        console.log(response);
    });
}