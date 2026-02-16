document.addEventListener("pagechange", e => {
    console.log(e.detail.page);
    if (e.detail.page !== "network-servers") return;

    initNetworkServers();
});

async function initNetworkServers() {
    setupNotify();

// check perms. its checked server side anyway but just for ux
    if (await UserManager.checkPermission("manageNetworkServers") === false) {
        window.location.href = window.location.origin + "/settings/server";
    } else {
        document.getElementById("pagebody").style.display = "block";
    }

// handle search
    let searchTimeout = null;
    getSearchInputElement().addEventListener("input", function (event) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(renderServers, 500);
    })

// load initially
    renderServers();
}

async function renderServers() {
    await createServerTable(document.getElementById("verifiedServersContainer"), "verified", "Verified Servers");
    await createServerTable(document.getElementById("pendingServersContainer"), "pending", "Pending Servers");
    await createServerTable(document.getElementById("blockedServersContainer"), "blocked", "Blocked Servers");
}

function getSearchInputTextt() {
    return getSearchInputElement().value || null
}

function getSearchInputElement() {
    return document.getElementById("serverSearch")
}

async function getNetworkServers() {
    return new Promise((resolve, reject) => {
        socket.emit("getNetworkServers", {id: UserManager.getID(), token: UserManager.getToken()}, function (response) {
            resolve(response);
        });
    })
}

function createRowHMTL(server, serverData, index) {
    let serverBanner = serverData?.banner ?
        serverData?.banner.startsWith("/uploads") === true ? `https://${server.address}${serverData?.banner}` : serverData?.banner
        :
        null;

    const rowClass = index % 2 === 0 ? "settings_banlist_even_row" : "settings_banlist_odd_row";

    return `
            <tr class="${rowClass} row-entry" data-address="${server.address}">
                <td>
                    ${unescapeHtmlEntities(serverData?.name)}
                </td>
                <td>
                    <a href="https://${server?.address}" target="_blank">${server?.address}</a>
                </td>
                <td>
                    ${server?.status}
                </td>
                <td>
                    ${new Date(server?.last_sync).toLocaleString()}
                </td>
                <td>
                    <button class="settings_banlist_details_button" onclick="toggleDetails(this)">Details</button>
                </td>
            </tr>
            <tr class="rowDetails ${rowClass}" data-address="${server?.address}">
                <td><img style="max-width: 200px;border-radius: 4px;" src="${ChatManager.proxyUrl(serverBanner)}"></td>
                <td><div style="max-width: 350px;">${sanitizeHtmlForRender(serverData.about)}</div></td>
                <td>
                    <div class="details-status-action">
                        <button onclick="changeServerStatus(this, 'verified')">Verify Server</button>
                        <button onclick="changeServerStatus(this, 'pending')">Set pending</button>
                        <button onclick="changeServerStatus(this, 'blocked')">Block Server</button> 
                    </div>
                </td>
                <td><p> </p></td>
                <td></td>
            </tr>
        `;
}

async function changeServerStatus(element, status) {
    if (!element) {
        console.error("Couldnt find server to change status for")
        return;
    }

    if (!status) {
        console.error("Couldnt find status to change server to")
        return;
    }

    let address = element?.closest(".rowDetails")?.getAttribute("data-address");
    if (!address) {
        console.error("Couldnt find server address for status change")
        return;
    }

    socket.emit("changeNetworkServerStatus",
        {id: UserManager.getID(), token: UserManager.getToken(), address, status},
        function (response) {
            if (response.error) {
                showSystemMessage({
                    title: response.error,
                    text: ``,
                    icon: "error",
                    type: "error",
                    duration: 8000
                });
            } else {
                showSystemMessage({
                    title: `Status updated!`,
                    text: ``,
                    icon: "success",
                    type: "success",
                    duration: 1000
                });
                renderServers();
            }
        })
}

async function createServerTable(container, status, summary) {
    if (!container) {
        console.error("Couldnt find container to add table to")
        return;
    }

    container.innerHTML = ""; // Clear previous entries

    let servers = await getNetworkServers();
    if (servers.error) {
        console.error(servers.error)
        return
    }

    let filteredServers = servers.servers.filter(server => {
        return server.status === status
    })

    // Create the table structure
    let table = `
        ${summary ? `<details open>
            <summary>${summary} (${Object.keys(filteredServers).length})</summary>` : ""}
        
            <table class="settings_banlist_table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Last sync</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Add rows for each banned user
    let index = 0;
    for (let server of filteredServers) {
        let serverData = (JSON.parse(server.data))?.serverinfo;
        if (!serverData) {
            console.warn("Couldnt find server data for server", server.address)
            continue
        }

        // okay so this is simple yet cool imo.
        // if the search input text isnt empty we only wanna display servers that match the name or address,
        // if a server doesnt fit the criteria we skip em. if we dont have any search text, we just display all servers.
        if (getSearchInputTextt() &&
            (serverData.name.toLowerCase().includes(getSearchInputTextt().toLowerCase()) ||
                server.address.toLowerCase().includes(getSearchInputTextt().toLowerCase())
            )
        ) {
            table += createRowHMTL(server, serverData, index);
        } else if (!getSearchInputTextt()) {
            table += createRowHMTL(server, serverData, index);
        }


        index++;
    }



    // Close the table
    table += `
                </tbody>
            </table>
        ${summary ? `</details>` : ""}
    `;

    container.insertAdjacentHTML("beforeend", table);
}

function toggleDetails(element) {
    let serverAddress = element?.closest(".row-entry")?.getAttribute("data-address");
    if (!serverAddress) {
        console.warn("Couldnt find server address for details", serverAddress)
        return;
    }

    let detailsRow = element.closest(".row-entry").parentNode.querySelector(`.rowDetails[data-address="${serverAddress}"]`);
    if (!detailsRow) {
        console.warn("Couldnt find details row for server address", serverAddress)
        return;
    }

    if (detailsRow.style.display === "none" || !detailsRow.style.display) {
        detailsRow.style.display = "table-row";
    } else {
        detailsRow.style.display = "none";
    }
}

function getReadableDuration(untilTimestamp) {
    const remainingTime = untilTimestamp - Date.now();
    if (remainingTime <= 0) return "Expired";

    const seconds = Math.floor(remainingTime / 1000) % 60;
    const minutes = Math.floor(remainingTime / (1000 * 60)) % 60;
    const hours = Math.floor(remainingTime / (1000 * 60 * 60)) % 24;
    const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}
