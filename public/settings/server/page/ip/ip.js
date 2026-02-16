document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "ip") return;

    initIpSettings();
});

let originalIpData;

async function saveIpSettings(jsonData){
    socket.emit("saveIpInfoSettings", {id: UserManager.getID(), token: UserManager.getToken(), ip: jsonData.ip }, function (response) {
        if(response.error){
            showSystemMessage({
                title: "Error while saving settings",
                text: response.error,
                type: "error",
                icon: "error"
            })
        }
    });
}

async function initIpSettings(){
    socket.emit("checkPermission", {id: UserManager.getID(), token: UserManager.getToken(), permission: "manageIpSettings" }, function (response) {

        if(response.permission == "denied"){
            window.location.href = window.location.origin + "/settings/server";
        }
        else{
            document.getElementById("pagebody").style.display = "block";
        }
    });

    let ipSettings = document.getElementById("ipSettings");
    ipSettings.innerHTML = "";

    let ipData = await getIpSettings();
    if(!ipData.error){
        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blockAbuser,
                "Block Abuser",
                "Block IPs that have been linked to online abuse",
                v => {
                    ipData.ip.blockAbuser = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blockBogon,
                "Block Bogon IPs",
                "Block IPs that shouldnt be on the internet",
                v => {
                    ipData.ip.blockBogon = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blockCrawler,
                "Block Crawlers",
                "Block IPs from Crawlers",
                v => {
                    ipData.ip.blockCrawler = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blockDataCenter,
                "Block Datacenters",
                "Block IPs from Datacenters. Will likely break external embeds from other servers.",
                v => {
                    ipData.ip.blockDataCenter = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blockProxy,
                "Block Proxies",
                null,
                v => {
                    ipData.ip.blockProxy = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blockSatelite,
                "Block Satelites",
                null,
                v => {
                    ipData.ip.blockSatelite = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blockTor,
                "Block Tor",
                "Will block IPs from Tor.",
                v => {
                    ipData.ip.blockTor = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blockVPN,
                "Block VPNs",
                "Will block IPs from VPNs which can be helpful against spam and ban evading.",
                v => {
                    ipData.ip.blockVPN = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        // some lists
        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blockedCountryCodes,
                "Blocked Countries",
                "You can block entire countries by adding their Alpha-2 Code, like Germany -> DE, USA -> US, ....",
                v => {
                    ipData.ip.blockedCountryCodes = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.urlWhitelist,
                "URL Whitelist",
                "Allow specific urls to bypass filters. Supports regex.",
                v => {
                    ipData.ip.urlWhitelist = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.companyDomainWhitelist,
                "Company Domain Whitelist",
                "Allows specific company domains to bypass restrictions, like cloudflare.",
                v => {
                    ipData.ip.companyDomainWhitelist = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.whitelist,
                "IP Whitelist",
                "Allow IPs to bypass restrictions",
                v => {
                    ipData.ip.whitelist = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );

        ipSettings.insertAdjacentElement("beforeend",
            JsonEditor.getSettingElement(
                ipData.ip.blacklist,
                "IP Blacklist",
                "Block IPs",
                v => {
                    ipData.ip.blacklist = v;
                    if(checkJsonChanges(ipData, originalIpData)){
                        showSaveSettings( async () => {
                            await saveIpSettings(ipData);
                        })
                    }
                }
            )
        );
    }

}

async function getIpSettings(){
    return new Promise((resolve, reject) => {
        socket.emit("getIpInfoSettings", {id: UserManager.getID(), token: UserManager.getToken(), permission: "manageIpSettings" }, function (response) {
            resolve(response);
        });
    })
}
