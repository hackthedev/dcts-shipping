async function getDiscoveredHosts(){
    return new Promise((resolve, reject) => {
        socket.emit("getDiscoveredHosts", {id: UserManager.getID(), token: UserManager.getToken()}, function(response) {
            resolve(response);
        });
    })
}

async function syncHostData(){
    let serverSyncResponse = await fetch(`${window.location.origin}/discover`);

    if(serverSyncResponse.status === 200){
        let json = await serverSyncResponse.json();

        if(isLauncher() && json){
            let serverRaw = await Client().GetServer(window.location.host);
            let server = JSON.parse(serverRaw);

            await Client().SaveServer(window.location.host, JSON.stringify(json), server?.IsFavourite);
        }
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
    if(isLauncher()){
        let localServers = JSON.parse(await Client().GetServers());

        for(let localServerKey in localServers){
            let localServer = localServers[localServerKey];
            discoveredHosts.servers.push({
                address: localServer.Address,
                data: localServer.JsonData,
                IsFavourite: localServer.IsFavourite || false
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

    if(discoveredHosts?.error === null){

        // add main button to go home
        discoveredHostList.insertAdjacentHTML("beforeend",
            `<a class="networkServerEntry" href="#" title="Go Home" style="border: none;" onclick="NavigateHome();">
                    <img class="home" src="http://${window.location.host}/img/back.png">
                </a><hr style="width: 100%;">`)


        discoveredHosts?.servers.forEach(server => {
            let serverData = JSON.parse(server.data);
            let host = server.address;


            if(isLauncher()){
                Client().SaveServer(host, JSON.stringify(serverData), server?.IsFavourite);
            }

            discoveredHostList.insertAdjacentHTML("beforeend",
        `<a class="networkServerEntry" href="http://${host}" title="${serverData.serverinfo.name}">
                    <img class="networkServerEntryImage" data-fav="${!!server?.IsFavourite}" data-host="${host}" src="http://${host}/${serverData.serverinfo.icon}">
                    <div class="networkIndicator">50</div>
                </a>`)

        })

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

    let server = JSON.parse(await Client().GetServer(address))
    if(!server){
        console.warn("Couldnt get server and mark server as fav");
        return;
    }

    server.IsFavourite = !server.IsFavourite;
    await Client().SaveServer(address, server.JsonData, server.IsFavourite);
}