document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "server-info") return;

    initServerInfo();
});

let originalnfo;
function initServerInfo(){

    socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "manageServer" }, function (response) {

        if(response.permission == "denied"){
            window.location.href = window.location.origin + "/settings/server";
        }
        else{
            document.getElementById("pagebody").style.display = "block";
        }
    });


    socket.emit("getServerInfo", {id: UserManager.getID(), token: UserManager.getToken() }, function (response) {
        try{
            originalnfo = JSON.stringify(response);
            console.log(response);

            if(!response?.error) {
                displayServerInfoSettings(response);
            }
        }
        catch(err){
            console.log("Unable to get Server Information");
            console.log(err);
        }

    });
}

function displayServerInfoSettings(response){
    let mainSettings = document.getElementById("main_settings");
    let contact_settings = document.getElementById("contact_settings");
    mainSettings.innerHTML = "";

    mainSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.name,
            "Server Name",
            "",
            v => {
                response.serverinfo.name = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    mainSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.description,
            "Server Description",
            "",
            v => {
                response.serverinfo.description = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    mainSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.countryCode,
            "Community Country Code",
            "Alpha-2 Code of your community, like US, DE, GB, FR, ...",
            v => {
                response.serverinfo.countryCode = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    mainSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.discovery.enabled,
            "Enable Discovery",
            "If other servers can discover your server or not.",
            v => {
                response.serverinfo.discovery.enabled = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    mainSettings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            !response.serverinfo.registration.enabled,
            "Invite Only",
            "If new members need an invite code to be able to register a new account.",
            v => {
                response.serverinfo.registration.enabled = !v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    contact_settings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.instance.contact.email,
            "Email Contact",
            "",
            v => {
                response.serverinfo.instance.contact.email = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    contact_settings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.instance.contact.website,
            "Website URL",
            "",
            v => {
                response.serverinfo.instance.contact.website = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    contact_settings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.instance.contact.discord,
            "Discord Invite",
            "",
            v => {
                response.serverinfo.contact.discord = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    contact_settings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.instance.contact.reddit,
            "Subreddit",
            "Must be an URL containing r/",
            v => {
                response.serverinfo.instance.contact.reddit = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    contact_settings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.instance.contact.signal,
            "Signal Username",
            "Messaging app Signal.",
            v => {
                response.serverinfo.instance.contact.signal = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    contact_settings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.instance.contact.github,
            "Github Repo",
            "May not be relevant for you.",
            v => {
                response.serverinfo.instance.contact.github = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );

    contact_settings.insertAdjacentElement("beforeend",
        JsonEditor.getSettingElement(
            response.serverinfo.instance.contact.owner.name,
            "Instance Owner(s)",
            "You can put your name or multiple names here. It also supports HTML",
            v => {
                response.serverinfo.instance.contact.owner.name = v;
                if (checkJsonChanges(response, originalnfo)) {
                    showSaveSettings(async () => {
                        saveServerInfoSettings(response);
                    })
                }
            }
        )
    );
}

async function saveServerInfoSettings(jsonData){
    socket.emit("saveServerInfo", {id: UserManager.getID(), token: UserManager.getToken(), serverinfo: jsonData.serverinfo }, function (response) {
        if(response.error){
            showSystemMessage({
                title: "Error while saving settings",
                text: response.error,
                type: "error",
                icon: "error"
            })
        }
        else{
            originalnfo = jsonData;
        }
    });
}


