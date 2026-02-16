document.addEventListener("pagechange", e => {
    if (e.detail.page !== "group-info") return;
    initGroupSettings();
});


let originalGroupInfo
function initGroupSettings(){
    socket.emit("getGroupInfo", {id: UserManager.getID(), token: UserManager.getToken(), group: getUrlParams("id")}, function (response) {
        try{
            if(response?.data?.channels) delete response.data.channels;
            if(response?.data?.permissions) delete response.data.permissions;

            originalGroupInfo = JSON.stringify(response.data);
            console.log(response);

            showChannelSettings(response.data);
        }
        catch(err){
            console.log("Unable to get Group Information");
            console.log(err);

            alert("Unable to get channel info. Please try to reload slowly until it works. Known bug!");
        }

    });
}

function showChannelSettings(response) {
    let groupSettings = document.getElementById("group_settings");
    groupSettings.innerHTML = "";

    groupSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.info.name,
            "Channel Name",
            "",
            v => {
                response.info.name = v;
                if (checkJsonChanges(response, originalGroupInfo)) {
                    showSaveSettings(async () => {
                        saveGroupInfo(response);
                    })
                }
            }
        )
    );
}


