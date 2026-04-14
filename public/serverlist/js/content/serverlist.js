async function lazyFetchAndUpdateServerCard(address) {
    let serverCard = getServerCardElementFromAddress(address)

    let serverObj = await fetchServerInfo(address);
    if(!serverObj) return;

    let rawBannerUrl = serverObj?.serverinfo?.banner;
    let bannerUrl;

    if (rawBannerUrl?.startsWith("/uploads"))  bannerUrl = `https://${extractHost(address)}${rawBannerUrl}`;
    if(rawBannerUrl.startsWith("https://")) bannerUrl = rawBannerUrl;

    setServerCardName(serverCard, serverObj?.serverinfo?.name ?? address)
    setServerCardAbout(serverCard, serverObj?.serverinfo?.about ?? "")
    setServerCardBanner(serverCard, bannerUrl)
    setServerOnline(serverCard, serverObj)
    setServerCardFeatures(serverCard, getServerCardFeaturesHTML(serverObj))
}

function getServerCardElementFromAddress(address) {
    if (!address) throw new Error("No address provided");

    return document.querySelector(`.layout > .content-container > .content > .serverList .server-card[address="${address}"]`)
}

function setServerCardAbout(serverCardElement, about) {
    serverCardElement.querySelector(".about").innerHTML = about
}

function setServerCardBanner(serverCardElement, url) {
    serverCardElement.querySelector(".banner").style.backgroundImage = `url('${url}')`;
}

function setServerOnline(serverCardElement, serverObj) {
    serverCardElement.querySelector(".footer .online").textContent =
        `${serverObj?.serverinfo?.slots?.online ? 
            encodePlainText(serverObj?.serverinfo?.slots?.online) : "0"} / ${encodePlainText(serverObj?.serverinfo?.slots?.limit)} Online • 
            ${encodePlainText(serverObj?.serverinfo?.slots?.reserved)} reserved`;
}

function setServerCardName(serverCardElement, name) {
    serverCardElement.querySelector(".banner .name").textContent = name;
}

function setServerCardFeatures(serverCardElement, html){
    serverCardElement.querySelector(".features").innerHTML = html
}

async function fetchServerInfo(address){
    try{
        let res = await fetch(`https://${extractHost(address)}/discover`)
        if(res.status !== 200) return console.warn("Discovery check failed for host ", address);
        return await res.json()
    }
    catch(err){
        console.warn(err)
    }
}

function getServerCardFeaturesHTML(serverObj) {
    const versionText = encodePlainText(String(String(serverObj?.serverinfo?.version || "?").split("")).replaceAll(",", "."));

    return ` ${serverObj?.serverinfo?.voip === true ? `<div id="turn-vc" class="feature" title="Voice chat suported">${Icon.display("mic")}</div>` : ""}
            ${serverObj?.serverinfo?.voip === true ? `<div id="turn-ss" class="feature" title="Screensharing supported">${Icon.display("screenshare")}</div>` : ""}
            <div class="feature" title="Version ${versionText}">${Icon.display("tag")}</div>`
}