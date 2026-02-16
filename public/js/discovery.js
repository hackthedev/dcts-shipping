async function getDiscoveredHosts(){
    return new Promise(async (resolve, reject) => {
        let servers = await fetch("/servers");
        resolve(servers.json())
    })
}

async function syncHostData(){
    let serverSyncResponse = await fetch(`${window.location.origin}/discover`);

    if(serverSyncResponse.status === 200){
        let json = await serverSyncResponse.json();

        if(isLauncher() && json){
            let server = await Client().GetServer(window.location.host);
            await Client().SaveServer(window.location.host, JSON.stringify(json), server?.IsFavourite);
        }
    }
}

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

async function testHost(host){
    try{
        // test host
        let testHost = await fetch(`https://${extractHost(host)}/discover`);

        // is a valid host so we conenct
        if(testHost.status === 200){
            return true;
        }
        else{
            return false;
        }
    }catch(e){
        console.warn(e)
        return false;
    }
}

async function NavigateHome(){
    if(isLauncher()){
        Client().NavigateHome();
    }
}

async function displayDiscoveredHosts(){
    let discoveredHosts = await getDiscoveredHosts();
    let discoveredHostList = document.querySelector("#networkServerList");

    discoveredHostList.innerHTML = "";

    // add local servers to the list too
    if(Client()){
        let localServers = await Client().GetServers();

        for(let localServerKey in localServers){
            let localServer = localServers[localServerKey];
            discoveredHosts.servers.push({
                address: localServer.Address,
                favourite: localServer.IsFavourite || false
            });
        }

        discoveredHosts.servers = [
            ...new Map(
                discoveredHosts.servers.map(s => [
                    (s.address || s.Address)?.toLowerCase(),
                    s
                ])
            ).values()
        ];

    }

    if(discoveredHosts?.error == null){
        // add main button to go home
        discoveredHostList.insertAdjacentHTML("beforeend",
            `<a class="networkServerEntry" href="/serverlist" title="Discovery" style="border: none;">
                    <img class="home" src="/img/discover.png">
                </a><hr style="width: 100%;">`)



        for(let server of discoveredHosts.servers){
            let host = extractHost(server.address);
            if(!host) continue;

            let externalServerInfo = null;
            let externalServerData = null;

            try{
                externalServerInfo = await fetch(`https://${host}/discover`);
                externalServerData = await externalServerInfo.json();
            }
            catch(error){
                console.warn(error);
                continue;
            }

            if(await testHost(host) === false){
                console.warn(`Host ${host} wasnt reachable`);
                continue;
            }

            if(isLauncher()){
                Client().SaveServer(host, server?.favourite);
            }

            discoveredHostList.insertAdjacentHTML("beforeend",
        `<a class="networkServerEntry" href="https://${host}" title="${externalServerData?.serverinfo?.name}">
                    <img class="networkServerEntryImage" data-fav="${!!server?.IsFavourite}" data-host="${host}" src="https://${host}/${externalServerData?.serverinfo?.icon}">
                    <div class="networkIndicator">50</div>
                </a>`)

        }

        // if any server was found display the network server list
        if(discoveredHosts?.servers.length > 0){
            let networkServerContainer = document.querySelector("#networkServers");
            if(!networkServerContainer) {
                console.error("Couldnt show network server container!")
                return;
            }

            networkServerContainer.style.display = "flex";
        }
    }
    else{
        console.error("Wasnt able to get discovered hosts")
        console.error(discoveredHosts?.error)
    }
}

async function changeFavouriteNetworkServer(address){
    if(!isLauncher()){
        console.warn("Servers can only be marked as fav in the desktop client")
        return;
    }

    let server = await Client().GetServer(address)
    if(!server){
        console.warn("Couldnt get server and mark server as fav");
        return;
    }

    server.IsFavourite = !server.IsFavourite;
    await Client().SaveServer(address, server.IsFavourite);
}