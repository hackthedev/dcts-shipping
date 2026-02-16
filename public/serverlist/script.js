let customPrompts = null;
document.addEventListener('DOMContentLoaded', async () => {
    customPrompts = new Prompt();
})

function extractHost(url){
    if(!url) return null;
    const s = String(url).trim();

    const looksLikeBareIPv6 = !s.includes('://') && !s.includes('/') && s.includes(':') && /^[0-9A-Fa-f:.]+$/.test(s);
    const withProto = looksLikeBareIPv6 ? `https://[${s}]` : (s.includes('://') ? s : `https://${s}`);

    try {
        const u = new URL(withProto);
        const host = u.hostname; // IPv6 returned without brackets
        const port = u.port;
        if (host.includes(':')) {
            return port ? `[${host}]:${port}` : host;
        }
        return port ? `${host}:${port}` : host;
    } catch (e) {
        const re = /^(?:https?:\/\/)?(?:[^@\/\n]+@)?([^:\/?#]+)(?::(\d+))?(?:[\/?#]|$)/i;
        const m = s.match(re);
        if (!m) return null;
        const hostname = m[1].replace(/^\[(.*)\]$/, '$1');
        const port = m[2];
        if (hostname.includes(':')) return port ? `[${hostname}]:${port}` : hostname;
        return port ? `${hostname}:${port}` : hostname;
    }
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
    if(!host) return;
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

async function connectToServer(address){
    if(!isLauncher()) return;

    let host = extractHost(address);
    let urlInput = document.getElementById('connectUrl');
    let status = document.getElementById('connectionStatus');

    if(!urlInput){
        console.warn("Couldnt find connect url field")
        return;
    }

    if(!status){
        console.warn("Couldnt find status element")
        return;
    }

    // apply status etc
    status.style.marginTop = "20px";
    status.innerText = "connecting...";

    try{
        // test host
        let testHost = await fetch(`http://${host}/discover`);

        // is a valid host so we conenct
        if(testHost.status === 200){
            await Client().NavigateToUrl(extractHost(address));
            urlInput.value = "";
        }
        else{
            status.innerText = "Host doesnt seem to be a DCTS server";
        }
    }catch(e){
        console.warn(e)
        status.innerText = "Cant connect to host...";
    }
}

async function getSavedServers(container){
    if(!container) return;

    try{
        let servers = Client() ? JSON.parse(await Client().GetServers()) : [];
        let serverSideServers = await getDiscoveredHosts();

        const merged = [...servers, ...serverSideServers.servers];
        renderServersList(merged);
    }
    catch(error){
        console.error(error)
    }
}


async function renderServersList(servers) {
    const list = document.querySelector(".serverlistingContainer");
    if (!list) return;
    list.innerHTML = "";

    if (servers?.length <= 0) {
        list.innerHTML = "<p>No servers found :(</p>"
        return;
    }

    for(let server of servers){
        let externalServerInfo;
        let externalServerData;

        try{
            externalServerInfo = await fetch(`https://${server.address}/discover`);
            externalServerData = await externalServerInfo.json();
        }
        catch(error){
            console.warn(error);
            continue;
        }

        const idx = list.children.length;
        if(externalServerData?.serverinfo?.error) continue;
        if(!externalServerData?.serverinfo) continue;

        const versionText = encodePlainText(String(String(externalServerData?.serverinfo?.version).split("")).replaceAll(",", "."));
        const card = document.createElement("div");

        console.log(externalServerData)

        // cache or some shit
        if(!externalServerData?.serverinfo?.voip && externalServerData?.serverinfo?.turn) {
            externalServerData.serverinfo.voip = externalServerData.serverinfo.turn
        }


        card.className = "server-card";
        card.style.setProperty("--reveal-delay", `${idx * 200}ms`);
        card.innerHTML = `
         <div class="banner" style="${externalServerData?.serverinfo?.banner ? `background-image:url('https://${extractHost(server.address)}/${externalServerData?.serverinfo?.banner}')` : ""}">
            <p class="name">${encodePlainText(unescapeHtmlEntities(truncateString(externalServerData?.serverinfo?.name, 25)))}</p>
          </div>


          <div class="about">${sanitizeHtmlForRender(externalServerData?.serverinfo?.about)}</div>
    
          <div class="features">
            <label>Features</label>
            ${externalServerData?.serverinfo?.ssl ? `<div id="ssl" class="feature">TLS Encryption</div>` : ""}
            ${externalServerData?.serverinfo?.tenor ? `<div id="tenor" class="feature">Tenor GIFs</div>` : ""}
            ${externalServerData?.serverinfo?.voip ? `<div id="turn-vc" class="feature">VC</div>` : ""}
            ${externalServerData?.serverinfo?.voip ? `<div id="turn-ss" class="feature">Screensharing</div>` : ""}
            <div class="feature">Version ${versionText}</div>
          </div>
    
          <div class="footer">
            ${externalServerData?.serverinfo?.slots?.online ? encodePlainText(externalServerData?.serverinfo?.slots?.online) : "0"} / ${encodePlainText(externalServerData?.serverinfo?.slots?.limit)} Online • ${encodePlainText(externalServerData?.serverinfo?.slots?.reserved)} reserved
            <a class="joinButton" href="https://${server?.address}">Join</a>
          </div>
        `;

        list.appendChild(card);
        setTimeout(() => card.classList.add("reveal"), idx * 200);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    ensureDomPurify();
    getSavedServers(document.querySelector('.serverlistingContainer'));
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