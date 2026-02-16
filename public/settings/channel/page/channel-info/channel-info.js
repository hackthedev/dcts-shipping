document.addEventListener("pagechange", e => {
    if (e.detail.page !== "channel-info") return;
    initChannelSettings();
});


let originalChannelInfo;
function initChannelSettings(){
    if(!getUrlParams("id")){
        showSystemMessage({
            title: "Error getting channel infos",
            text: "No channel id provided.",
            type: "error",
        })
        return;
    }

    socket.emit("getChannelInfo", {id: UserManager.getID(), token: UserManager.getToken(), channel: getUrlParams("id")}, function (response) {
        try{
            console.log(response)
            if(response?.error){
                showSystemMessage(
                    {
                        title: "Error getting channel infos",
                        text: response?.error || null,
                        type: "error",
                    }
                )
            }
            else{
                if(response?.data?.permissions) delete response.data.permissions;
                if(response?.data?.msgCount) delete response.data.msgCount;
                if(response?.data?.sortId) delete response.data.sortId;
                if(response?.data?.type) delete response.data.type;

                originalChannelInfo = JSON.stringify(response.data);
                showChannelSettings(response.data);
            }
        }
        catch(err){
            console.log("Unable to get Channel Information");
            console.log(err);

            alert("Unable to get channel info. Please try to reload slowly until it works. Known bug!");
        }

    });
}

function showChannelSettings(response){
    let channelSettings = document.getElementById("channel_settings");
    channelSettings.innerHTML = "";

    channelSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.name,
            "Channel Name",
            "",
            v => {
                response.name = v;
                if (checkJsonChanges(response, originalChannelInfo)) {
                    showSaveSettings(async () => {
                        saveChannelInfo(response);
                    })
                }
            }
        )
    );

    channelSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.description,
            "Channel Description",
            "",
            v => {
                response.description = v;
                if (checkJsonChanges(response, originalChannelInfo)) {
                    showSaveSettings(async () => {
                        saveChannelInfo(response);
                    })
                }
            }
        )
    );
}
