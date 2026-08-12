document.addEventListener("pagechange", e => {
    if (e.detail.page !== "plugins") return;

    displayPlugins();
});

async function getCollectionData() {
    let url = "https://dist.dcts.community/api/collection/dcts-plugins";

    let pluginRes = await fetch(url, {
        signal: AbortSignal.timeout(2500)
    })

    if (pluginRes.status !== 200) {
        console.error("Unable to get plugins from server")
        console.error(pluginRes.status, pluginRes.statusText)
        return null;
    }

    return await pluginRes.json();
}

async function getRemoteServerPlugins() {
    let collectionData = await getCollectionData();
    return collectionData?.packages;
}

async function getPackageInfo(packageName){
    if(!packageName) throw new Error("No Package name provided!");
    let url = `https://dist.dcts.community/api/package/${packageName}`

    let packageRes = await fetch(url, {
        signal: AbortSignal.timeout(2500)
    })

    if (packageRes.status !== 200) {
        console.error("Unable to get package from server")
        console.error(packageRes.status, packageRes.statusText)
        return null;
    }

    return (await packageRes.json())?.package ?? {};
}

async function getPluginCardHTML(pluginObj){
    if(!pluginObj?.name) throw new Error("Missing plugin obj or data");

    let pluginImage = ChatTools.Sanitize.stripHTML(pluginObj?.image);
    let pluginName = ChatTools.Sanitize.stripHTML(pluginObj?.name);
    let pluginDescription = ChatTools.Sanitize.truncateText(ChatTools.Sanitize.stripHTML(pluginObj?.about), 150);

    return `
        <div class="plugin-card">
            <div class="image" style="background-image: url('${pluginImage}');"></div>
            <h1 class="title">${pluginName}</h1>
            <p class="description">${pluginDescription}</p>
        </div>
    `
}

function getPluginListContainerElement(){
    return document.querySelector(".plugin-list-container")
}

async function getPluginCardListElement(){
    await ChatTools.Dom.hideElement(getPluginListContainerElement())

    // get packages aka plugins in this case
    let plugins = await getRemoteServerPlugins();
    if(plugins?.length === 0) return console.warn("No plugins found!");

    getPluginListContainerElement().innerHTML = "";

    let listElement = document.createElement("div")
    listElement.classList.add("plugin-list");

    for(let plugin of plugins){
        let pluginName = plugin?.name ?? null;
        if(!pluginName) continue;

        let pluginInfoObj = await getPackageInfo(pluginName);
        console.log(pluginInfoObj)
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
        listElement.insertAdjacentHTML("beforeend", await getPluginCardHTML(pluginInfoObj))
    }

    getPluginListContainerElement().insertAdjacentElement("beforeend", listElement);
    await ChatTools.Dom.showElement(getPluginListContainerElement())
}

async function displayPlugins(){
    await getPluginCardListElement();
}