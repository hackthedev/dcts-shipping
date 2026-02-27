let originalRateLimitServerInfo = null;

document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "rate-limit") return;

    initRateLimits();
});

async function initRateLimits(){
    socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "manageRateSettings" }, async function (response) {

        if(response.permission === "denied"){
            window.location.href = window.location.origin + "/settings/server";
        }
        else{
            document.getElementById("pagebody").style.display = "block";
        }

        let serverInfo = await getServerInfo();
        originalRateLimitServerInfo = JSON.stringify(serverInfo)
        displayRateLimitSettings(serverInfo);

        // chart shit
        let channels = await getChannelTree();
        let channelConfigPath = getChannelPathFromGroupConfig(channels, serverInfo.serverinfo.defaultChannel);
        let defaultChannelRoom = `${channelConfigPath.groupId}-${channelConfigPath.categoryId}-${channelConfigPath.channelId}`;
        if(!defaultChannelRoom) throw new Error("Somehow unable to contruct room string?", defaultChannelRoom)

        let charts = await getRoomCharts(defaultChannelRoom);
        if(charts?.daily){
            displayGraph("daily", charts.daily, document.querySelector("#chart-example-daily"))
        }
        if(charts?.daily){
            displayGraph("hourly", charts.hourly, document.querySelector("#chart-example-hourly"))
        }
    });


}

function displayRateLimitSettings(response) {
    let mainSettings = document.getElementById("main_settings");
    mainSettings.innerHTML = "";

    mainSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.moderation.ratelimit.actions.user_slowmode,
            "User Slowmode",
            "This setting is a multiplier based off the baseline and will enable a slow mode for everyone.",
            v => {
                response.serverinfo.moderation.ratelimit.actions.user_slowmode = v;
                if (checkJsonChanges(response, originalRateLimitServerInfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    mainSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.moderation.ratelimit.actions.ratelimit,
            "Rate limit",
            "Also based off of the baseline, once this limit is reached users will be rate limited.",
            v => {
                response.serverinfo.moderation.ratelimit.actions.ratelimit = v;
                if (checkJsonChanges(response, originalRateLimitServerInfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    mainSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.moderation.ratelimit.record_history,
            "Record History",
            "Will determine the data to be used as reference for the base line from the current date going backwards.",
            v => {
                response.serverinfo.moderation.ratelimit.record_history = v;
                if (checkJsonChanges(response, originalRateLimitServerInfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );
}