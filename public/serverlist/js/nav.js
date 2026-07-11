function getNavElement(){
    return document.querySelector(`.layout > .content-container .navigation`)
}

async function buildNavHTML(initial = false){
    getNavElement().innerHTML =
        `
        <div class="entry ${initial === true ? "selected" : ""}" onclick="selectNavEntry(this);getSavedServers(getContentElement())">
            ${Icon.display("server")}
        </div>
        
        ${isLocal() ? `
        <div class="entry" onclick="selectNavEntry(this);loadMessages()">
            ${Icon.display("message")}
        </div>
        
        <div class="entry" onclick="selectNavEntry(this);loadAccount()">
            ${Icon.display("account")}
        </div>
        
        <div class="entry" onclick="selectNavEntry(this);loadSettings();">
            ${Icon.display("edit")}
        </div>
        ` : ""}
        
        `;
}

function selectNavEntry(targetEntry){
    if(!targetEntry) throw new Error("No element passed");

    let entries = getNavElement().querySelectorAll(`.entry`)

    entries.forEach(entry => {
        if(entry.classList.contains("entry")) entry.classList.remove("selected");
    })

    targetEntry.classList.add("selected");
}