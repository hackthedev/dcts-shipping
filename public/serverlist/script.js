let customPrompts = null;

function isLocal(){
    return window.location.origin.startsWith("file://");
}

async function getDiscoveredHosts(){
    return new Promise(async (resolve, reject) => {
        let servers = await fetch("/servers");
        resolve(servers.json())
    })
}


async function getSavedServers(container) {
    if (!container) return console.warn("No container supplied!");

    container.innerHTML = `<div class="serverList"></div>`;

    let servers = isLauncher() ? await Client().GetServers() : {};
    let remoteServers = [];

    // if not connected to an instance. using file:// url...
    if (!isLocal()) {
        const discovered = await getDiscoveredHosts();
        remoteServers = Array.isArray(discovered?.servers) ? discovered.servers : [];
    }

    const mergedServers = { ...(servers || {}) };

    for (const server of remoteServers) {
        if (!server?.address) continue;

        if (!mergedServers[server.address]) {
            mergedServers[server.address] = {
                address: server.address
            };
        }
    }

    renderServersList(container.querySelector(".serverList"), mergedServers);
}

function submitServerUI(){
    customPrompts.showPrompt(
        `Submit Server`,
        `
         <div class="prompt-form-group">
             <p>
                You can submit servers and if valid and verified they will be added to the discovery list.
             </p>
         </div>
         
         <div class="prompt-form-group">
            <input class="prompt-input" autocomplete="off" type="text" name="address" id="address" placeholder="Enter the server url" value="">
         </div>
        `,
        async function (values) {
            let address = values?.address;

            if (address && address.length > 0) {
                submitServer(address)
            }

            if (!address) {
                submitServerUI();
            }
        }
    )
}

async function submitServer(host){
    if(!host || isLocal()) return;
    let extractedHost = extractHost(host);

    // lets give the user some feedback
    showSystemMessage({
        title: "Checking server...",
        text: "",
        icon: "info",
        img: null,
        type: "info",
        duration: 4000
    });
    let isValidHost = await testHost(extractedHost);

    if(isValidHost){
        let submitInfo = await fetch(`/servers/add/${encodeURIComponent(extractedHost)}`, {
            method: "POST"
        })

        let submitData = await submitInfo.json();

        if(submitInfo.status === 200){
            showSystemMessage({
                title: "Server submitted!",
                text: "",
                icon: "success",
                img: null,
                type: "success",
                duration: 4000
            });

            getSavedServers();
        }
        else{
            showSystemMessage({
                title: "Server not submitted",
                text: submitData?.error,
                icon: "error",
                img: null,
                type: "error",
                duration: 10000
            });
        }
    }
    else{
        showSystemMessage({
            title: "Server not found",
            text: "The url doesnt seem to be a DCTS server or discovery was disabled",
            icon: "error",
            img: null,
            type: "error",
            duration: 10000
        });
    }
}

async function renderServersList(container, servers) {
    const list = container;
    if (!list) throw new Error("No list found to display items in");
    list.innerHTML = "";

    for (let server in servers) {
        let serverObj = servers[server];
        serverObj.serverinfo = null;

        let address = server;
        let isFav = serverObj?.fav;

        let serverInfoRequest = null;
        let serverInfoJson = null;

        if (!serverObj || serverObj.length <= 0) {
            list.innerHTML = "<p>No servers found :(</p>"
            continue;
        }

        const idx = list.children.length;
        if (serverObj?.serverinfo?.error && !showOwnerActions) continue;

        const versionText = encodePlainText(String(String(serverObj?.serverinfo?.version || "?").split("")).replaceAll(",", "."));
        const card = document.createElement("div");

        card.className = "server-card";
        card.setAttribute("address", address)
        card.style.setProperty("--reveal-delay", `${idx * 200}ms`);

        card.innerHTML = `
             <div class="banner" style="background-image:url('${serverObj?.serverinfo?.banner?.includes("://") ? serverObj.serverinfo.banner : `https://${address}${serverObj?.serverinfo?.banner}`}')">
                <p class="name">${encodePlainText(truncateString(serverObj?.serverinfo?.name || address, 25))}</p>
                
                 <div class="features">
                    ${serverObj?.serverinfo?.voip === true ? `<div id="turn-vc" class="feature" title="Voice chat suported">${Icon.display("mic")}</div>` : ""}
                    ${serverObj?.serverinfo?.voip === true ? `<div id="turn-ss" class="feature" title="Screensharing supported">${Icon.display("screenshare")}</div>` : ""}
                    <div class="feature" title="Version ${versionText}">${Icon.display("tag")}</div>
                  </div>
              </div>        
        
              <div class="about">${sanitizeHtmlForRender(serverObj?.serverinfo?.about ?? "No info found.")}</div>
        
              <div class="footer">
                <label class="online">
                    ${serverObj?.serverinfo?.slots?.online ? encodePlainText(serverObj?.serverinfo?.slots?.online) : "0"} / ${encodePlainText(serverObj?.serverinfo?.slots?.limit)} Online • ${encodePlainText(serverObj?.serverinfo?.slots?.reserved)} reserved
                </label>
                                
                <div class="buttons">
                    <a class="joinButton" href="http://${address}">Join</a>
                    <a class="joinButton delete" onclick="deleteServer('${extractHost(address)}')"">&#128465;</a>
                </div>
                
              </div>
            `;

        list.appendChild(card);

        // if no data found fetch it async but DONT wait for it
        if(Object.keys(serverObj?.serverinfo ?? {})?.length === 0){
            lazyFetchAndUpdateServerCard(address)
        }

        setTimeout(() => card.classList.add("reveal"), idx * 200);
    }
}

async function deleteServer(ip) {
    await Client().DeleteServer(ip)
    getSavedServers(document.querySelector('.serverlistingContainer'))
}

document.addEventListener('DOMContentLoaded', async () => {
    customPrompts = new Prompt();

    ensureDomPurify();
    buildNavHTML(true);
    getSavedServers(getContentElement())
});

function truncateString(value, length) {
    // should update it at some point to use .substring instead lol was easier when i think about it
    if (typeof value === "string" && value.length > 0 && length > 0) {
        let splitted = value.split("")
        let newText = "";

        let difference = value.length - length;
        let iterateLength = 0;

        if (difference <= 0) iterateLength = value.length;
        if (difference > 0) iterateLength = value.length - difference;

        for (let i = 0; i < iterateLength; i++) {
            newText += `${splitted[i]}`
        }

        if (iterateLength !== value.length) {
            newText += "..";
        }

        return newText;
    }

    return value;
}