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

async function getPackageInfo(packageName, customObj = null) {
    if (!packageName) throw new Error("No Package name provided!");
    let url = `https://dist.dcts.community/api/package/${packageName}`

    let packageRes = await fetch(url, {
        signal: AbortSignal.timeout(2500)
    })

    if (packageRes.status !== 200) {
        console.error("Unable to get package from server")
        console.error(packageRes.status, packageRes.statusText)

        if (customObj) return {
            ...customObj
        };

        return {
            name: packageName,
            title: packageName,
        };
    }

    return (await packageRes.json())?.package ?? {};
}

function getSanitizedPluginInfo(pluginObj){
    if(!pluginObj) throw new Error("No Plugin obj provided!");

    let image = ChatTools.Sanitize.stripHTML(pluginObj?.image?.trim() ?? "/img/default_banner.png");
    let title = pluginObj?.title ? ChatTools.Sanitize.stripHTML(pluginObj?.title) : null;
    let name = pluginObj?.name ? ChatTools.Sanitize.stripHTML(pluginObj?.name) : null;
    let description = pluginObj?.description ? ChatTools.Sanitize.truncateText(ChatTools.Sanitize.stripHTML(pluginObj?.about ?? pluginObj?.description), 150) : null;
    let authorName = ChatTools.Sanitize.stripHTML(pluginObj?.account?.username ?? pluginObj?.author ?? "Unkown") ?? null;
    let readme = pluginObj?.meta?.readme ? ChatTools.Sanitize.forRender(markdownit().render(pluginObj?.meta?.readme)) : null;

    return{
        readme,
        image,
        title,
        name,
        description,
        authorName
    }
}

async function getPluginCardElement(pluginObj) {
    if (!pluginObj?.name) {
        console.warn(`No plugin info found`);
        return "";
    }

    let info = getSanitizedPluginInfo(pluginObj);

    let pluginCard = document.createElement("div");
    pluginCard.className = "plugin-card";
    pluginCard.innerHTML =
        `
        <div class="image" style="${info.image ? `background-image: url('${info.image}');` : ""}"></div>
        <h1 class="title">${info.title ?? info.name}</h1>
        <p class="description">${info.description ?? ""}</p>
        
        <hr>            
        <p class="authorInfo">
             Created by <span class="highlight">@${info.authorName}</span>
        </p>
    `

    pluginCard.addEventListener("click", async e => {
        await renderLocalPluginPage(pluginObj);
    })

    return pluginCard
}

async function getInstalledPlugins() {
    let res = await fetch("/plugins/list", {
        headers: {
            "x-member-id": UserManager.getID(),
            "x-member-token": UserManager.getToken(),
        }
    })

    if (res.status !== 200) {
        return console.error("Unable to get local plugins! ", res.status, res.statusText)
    }

    return (await res.json())?.plugins ?? [];
}

function getPluginListContainerElement() {
    return document.querySelector(".plugin-list-container")
}

function getPluginPanelContentElement() {
    return document.querySelector(".plugin-page-content")
}

async function getPluginCardListElement(customPluginsObj = null) {
    await ChatTools.Dom.hideElement(getPluginListContainerElement())

    // get packages aka plugins in this case
    let plugins = customPluginsObj ? [customPluginsObj] : await getRemoteServerPlugins();
    if (plugins?.length === 0) return console.warn("No plugins found!");

    getPluginListContainerElement().innerHTML = "";

    let listElement = document.createElement("div")
    listElement.classList.add("plugin-list");

    for (let plugin of plugins) {
        let pluginName = customPluginsObj ? Object.keys(plugin)[0] : plugin?.name ?? plugin ?? null;
        let pluginObj = customPluginsObj ? customPluginsObj[pluginName] : {}

        if (!pluginName) {
            console.warn("no plugin name found");
            continue;
        }

        let pluginInfoObj = await getPackageInfo(pluginName, pluginObj);
        listElement.insertAdjacentElement("beforeend", await getPluginCardElement(pluginInfoObj))
    }

    // insert entire list into dom
    getPluginListContainerElement().insertAdjacentElement("beforeend", listElement);

    // if no plugin cards exist
    if (getPluginListContainerElement()?.querySelectorAll(".plugin-card")?.length === 0) {
        listElement.insertAdjacentHTML("beforeend", "<p>No plugins found :/</p>")
    }

    await ChatTools.Dom.showElement(getPluginListContainerElement())
}

async function displayPlugins() {
    await getPluginCardListElement();
}

async function displayLocalPlugins() {
    await getPluginCardListElement(await getInstalledPlugins())
}

async function renderLocalPluginPage(pluginObj){
    getPluginListContainerElement().innerHTML = `
        <div class="plugin-panel">
            <div class="nav">
                <button class="about">About</button>
            </div>
            
            <div class="plugin-page-content"></div>
        </div>
    `

    let pluginPanelElement = getPluginListContainerElement()?.querySelector(".plugin-panel");
    if(!pluginPanelElement) throw new Error("Plugin panel not found??");

    let pluginPanelNavElement = getPluginListContainerElement()?.querySelector(".nav");
    if(!pluginPanelNavElement) throw new Error("Plugin panel nav not found??");

    // about nav button handle
    let pluginNavButtonAbout = pluginPanelNavElement.querySelector("button.about");
    pluginNavButtonAbout?.addEventListener("click", async e => {
        await showPluginAbout(pluginObj);
    })

    // determine if is local etc
    if(pluginObj?.settings){
        // settings button
        let settingsButton = document.createElement("button");
        settingsButton.classList.add("settings");
        settingsButton.textContent = "Settings";
        settingsButton.addEventListener("click", async e => {
            await showPluginSettings(pluginObj);
        })
        pluginPanelNavElement.appendChild(settingsButton);

        // uninstall button
        let uninstallButton = document.createElement("button");
        uninstallButton.classList.add("uninstall");
        uninstallButton.textContent = "Uninstall";
        uninstallButton.addEventListener("click", async e => {
            // to be implemented
        })
        pluginPanelNavElement.appendChild(uninstallButton);
    }
    // its not locally saved yet!
    else{
        // install button
        let installButton = document.createElement("button");
        installButton.classList.add("install");
        installButton.textContent = "Install";
        installButton.addEventListener("click", async e => {
            // to be implemented
        })
        pluginPanelNavElement.appendChild(installButton);
    }

    await showPluginAbout(pluginObj);
}

async function showPluginAbout(pluginObj){
    if (!pluginObj) throw new Error("No plugin obj provided")

    let pluginInfo = getSanitizedPluginInfo(pluginObj);

    getPluginPanelContentElement().innerHTML =
        `
            <div class="plugin-info">
            
                <div class="banner" style="${pluginInfo.image ? `background-image: url('${pluginInfo.image}');` : ""}"></div>            
             
                <h1 class="title">${pluginInfo.title ?? pluginInfo.name}</h1>
                ${pluginInfo?.description ? `<p class="subtitle">${pluginInfo.description}</p>` : ""}
                ${pluginInfo?.readme ? `<div class="readme">${pluginInfo.readme}</div>` : ""}
                
                
                ${pluginInfo?.authorName ? `<p class="footer">Created by <span class="highlight">@${pluginInfo.authorName}</span></p>` : ""}
        
            </div>
        `
}

async function showPluginSettings(pluginObj) {
    if (!pluginObj?.settings) return console.warn("Plugin has no settings specified - ignored")

    // some funky shit ngl
    let settings = (Object.values(pluginObj.settings))[0]
    getPluginPanelContentElement().innerHTML = "";

    for (let setting in settings) {
        console.log(setting)
        console.log(settings[setting])
        getPluginPanelContentElement().insertAdjacentElement("beforeend", JsonEditor.getSettingElement(
            settings[setting],
            String(setting.toUpperCase()),
            null,
            async(val) => {
                console.log(val)
            }
        ))
    }
}