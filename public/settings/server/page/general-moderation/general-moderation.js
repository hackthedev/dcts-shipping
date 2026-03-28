document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "general-moderation") return;

    initGeneralModSettings();
});

let originalGeneralModSettings = null;

async function initGeneralModSettings(){
    socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "generalModeration" }, function (response) {

        if(response.permission == "denied"){
            window.location.href = window.location.origin + "/settings/server";
        }
        else{
            document.getElementById("pagebody").style.display = "block";
        }
    });

    let modSettings = document.getElementById("modSettings");
    modSettings.innerHTML = "";

    let serverinfoData = await getServerInfo();
    originalGeneralModSettings = serverinfoData

    if(!serverinfoData.error){
        modSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                serverinfoData.serverinfo.moderation.bans.memberListHideBanned,
                "Hide banned members",
                "Will hide banned members from things like the member list",
                v => {
                    serverinfoData.serverinfo.moderation.bans.memberListHideBanned = v;
                    if(checkJsonChanges(serverinfoData, originalGeneralModSettings)){
                        showSaveSettings( async () => {
                            await saveServerInfoSettings(serverinfoData);
                        })
                    }
                }
            )
        );

        modSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                serverinfoData.serverinfo.moderation.bans.ipBanDuration,
                "Auto Ban Duration",
                "The amount of time someone gets auto banned, like when failing to login multiple times.",
                v => {
                    serverinfoData.serverinfo.moderation.bans.ipBanDuration = v;
                    if(checkJsonChanges(serverinfoData, originalGeneralModSettings)){
                        showSaveSettings( async () => {
                            await saveServerInfoSettings(serverinfoData);
                        })
                    }
                }
            )
        );
    }

}