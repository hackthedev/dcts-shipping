class ChatManager {

    static showedGlitch = false;
    static connectionLost = false;
    static wasConnected = false;

    static countryCodeToEmoji(code) {
        if (!code || code.length !== 2) {
            return `<img src="/img/default_emojis/1f30d.svg" class="inline-text-emoji">`;
        }

        const codepoints = code
            .toUpperCase()
            .split("")
            .map(c => (0x1F1E6 + c.charCodeAt(0) - 65).toString(16).toUpperCase())
            .join("-");

        return `<img src="/img/default_emojis/${codepoints.toLowerCase()}.svg" title="${code?.toUpperCase()}" class="inline-text-emoji">`;
    }

    static async showThemePage(){
        initThemePageContext();

        let themesRes = await fetch("/themes/list");
        let themes;
        if(themesRes.status === 200){
            let responseJson = await themesRes.json();
            themes = responseJson?.themes
        }

        if(!themes) return console.warn("No themes found")

        await PageRenderer.renderHTML(document.body,
            `
                <style>
                .theme-page{
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                    
                    width: 100%;
                    max-height: 100%;
                    margin: 20px auto;
                    padding: 0 20px;
                    
                    justify-content: center;
                    align-items: center;
                }
                
                .theme-page .theme-entries{
                    display: flex;
                    flex-direction: row;
                    justify-content: center;
                    
                    gap: 40px;
                    flex-shrink: 0;
                    flex-wrap: wrap;
                }
                                
                .theme-page .theme-entry {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    overflow: hidden;
                    cursor: pointer;
                    border-radius: 10px;
                    
                    background-color: hsl(from var(--main) h s calc(l * 3));
                    border: 2px solid hsl(from var(--main) h s calc(l * 3) / 20%);
                }
                .theme-page .theme-entry .name{
                    font-weight: bold;
                    color: hsl(from var(--main) h s calc(l * 12) / 100%);;
                }
                .theme-page .theme-entry .thumbnail-container{
                    overflow: hidden;
                    width: 300px;
                    height: 150px;
                    background-color: black;
                }
                .theme-page .theme-entry p{
                    margin: 10px auto;
                }
                .theme-page .theme-entry img{
                    width: 300px;
                    height: 150px;                    
                    
                    object-fit: cover;
                    background-position: center center;
                    transition: all 200ms ease-in-out;
                    overflow: hidden;
                }
                
                .theme-page .theme-entry:hover .name{
                    font-weight: bold;
                    color: hsl(from var(--main) h s calc(l * 0.5) / 100%);;
                }  
                .theme-page .theme-entry:hover  {
                    background-color: hsl(from var(--main) h s calc(l * 12) / 100%);
                    color: hsl(from var(--main) h s calc(l * 4) / 100%);
                    font-weight: bold;
                }
                .theme-page .theme-entry:hover img {
                    transform: scale(1.1);
                }
                </style>

                <div class="theme-page">
                    <h1>Available Themes</h1>
                    <p onclick="window.location.reload()" style="margin-top: -2rem; cursor: pointer">« Back</p>
                    
                    <div class="theme-entries">
                    </div>
                </div>`
        )


        let themeList = PageRenderer.Element().querySelector(".theme-entries");
        await buildThemeEntryBodyHTML(themes, themeList)

        async function buildThemeEntryBodyHTML(themes, element){
            if(themes.length > 0){
                for(let theme of themes){
                    element.insertAdjacentHTML("beforeend", await getThemeEntryHTML(theme));
                }
            }
        }

        async function getThemeEntryHTML(theme){
            let themeResponse = await fetch(`https://raw.githubusercontent.com/DCTS-Project/themes/refs/heads/main/theme/${theme}/config.json`);
            let themeMeta = null;
            if(themeResponse.status === 200) themeMeta = await themeResponse.json();
            if(!themeMeta){
                console.error(`No theme meta found for theme ${theme}`)
                return "";
            }

            console.log(themeMeta)

            return `
                <div class="theme-entry" data-theme="${theme}">
                    <div class="thumbnail-container">
                        <img src="https://raw.githubusercontent.com/DCTS-Project/themes/refs/heads/main/theme/${theme}/thumbnail.png">
                    </div>
                    <p><span class="name">${themeMeta?.name}</span> by ${themeMeta?.author}</p>
                </div>
            
            `
        }

        function initThemePageContext(){
            if(window.didInitthemePageContext) return;

            ContextMenu.registerClickEvent(
                "theme page selector",
                [
                    ".theme-page .theme-entries .theme-entry"
                ],
                async (data) => {
                    let theme = findAttributeUp(data.element, "data-theme");
                    if (!theme) {
                        console.warn("Couldnt get theme from element");
                        return;
                    }

                    if(!await downloadTheme(theme)){
                        return showSystemMessage({
                            title: `Error setting theme`,
                            text: "It seems to be currently unavailable",
                            type: "error"
                        })
                    }

                    UserManager.setTheme(theme)
                    showSystemMessage({
                        title: `Theme changed to '${theme}'`,
                        text: "You'll need to reload to see the new theme!",
                        type: "success"
                    })
                }
            )

            window.didInitthemePageContext = true;
        }

        async function downloadTheme(theme){
            if(!theme) throw new Error("Missing theme name for download");

            let localThemeRes = await fetch(`/css/themes/${theme}/${theme}.css`)
            if(localThemeRes.status === 200) return true;

            showSystemMessage({
                title: `Downloading theme...`,
                text: "",
                type: "info"
            })

            if(localThemeRes.status === 404){
                let downloadRes = await fetch(`/themes/download/${theme}`);
                if(downloadRes.status === 200) return true;
                console.error(downloadRes)
                return false;
            }
        }
    }

    static applyThemeOnLoad(theme, accent) {
        if (!theme) return;

        // if the server theme is not the default theme,
        // and the user has not set his own theme
        // then we apply the server default theme
        let serverDefaultTheme = "{{default_theme}}";
        if(serverDefaultTheme !== "default.css" && theme === "default.css"){
            theme = serverDefaultTheme.split(".css")[0];
        }

        // apply accent before theme
        if(accent) document.documentElement.style.setProperty('--main', accent);

        // dont need to reimport it
        if(theme === "default.css") return;

        let link = document.querySelector('link[data-theme]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.dataset.theme = "active";
            document.head.appendChild(link);
        }

        link.href = `/css/themes/${theme}/${theme}.css`;
        console.log("Applied theme: ", theme)
    }

    static async checkConnection(delay) {
        setInterval(() => {
            if (socket.connected === false && ChatManager.showedGlitch === false && ChatManager.wasConnected === true) {
                ChatManager.showedGlitch = true;
                ChatManager.connectionLost = true;

                hackerGlitch(
                    document.body,
                    {
                        text: "Connection lost",
                        intensity: 0.75,
                        bgAlpha: 1,
                        useSnapshot: false
                    }
                )
            }

            if (socket.connected === true && ChatManager.connectionLost === true) {
                window.location.reload();
            }

            if (socket.connected === true && ChatManager.wasConnected === false) {
                ChatManager.wasConnected = true;
            }
        }, delay)
    }

    static async srcToFile(src) {
        if (!src || typeof src !== "string")
            return { ok: false, error: "invalid_src" };

        try {
            const r = await fetch(src);
            if (!r.ok)
                return { ok: false, error: "fetch_failed", status: r.status };

            const blob = await r.blob();
            const ext = blob.type.split("/")[1] || "bin";
            const filename = `${UserManager.generateId(12)}.${ext}`;
            const file = new File([blob], filename, { type: blob.type });

            const res = await ChatManager.uploadFile([file]);
            return res;
        } catch (err) {
            console.error("srcToFile error:", err);
            return { ok: false, error: "srcToFile_failed" };
        }
    }

    static getDMFromUrl() {
        var url = window.location.search;
        var urlParams = new URLSearchParams(url);
        var urlChannel = urlParams.get("dm");

        if (urlChannel == null) {
            return null;
        } else {
            return urlChannel;
        }
    }

    static async showInstanceInfo(notice = null, noticeColor = "transparent"){
        let infoData;
        if(socket.connected){
            infoData = await getServerInfo(true);
            infoData = infoData.serverinfo
        }

        // fallback to /discover
        if(!infoData){
            try{
                let request = await fetch("/discover");
                if(request.status === 200){
                    let serverInfoData = await request.json();
                    infoData = serverInfoData.serverinfo
                }
                else{
                    console.error(request);
                    return;
                }
            }catch(err){
                console.error(err)
            }
        }

        // everything failed
        if(!infoData) {
            console.error("Couldnt get server info");
            return
        }

        let versionText = `v${String(infoData.version).split("").join(".")}`
        let contactData = infoData.instance.contact;

        let shortRedditUrl = `r/${contactData?.reddit?.split("/r/")[1]}`;
        let shortGithubUrl = `${contactData?.github?.split(".com/")[1]}`;
        let shortDiscordUrl = `gg/${contactData?.discord?.split(".gg/")[1]}`;

        customPrompts.showPrompt(
            `Instance Info`,
            `

            ${notice ? `<div style="
                            padding: 10px;
                            display: flex; 
                            width: 100%; 
                            background-color: hsl(from ${noticeColor} h s l / 40%);
                            border: 1px solid hsl(from ${noticeColor} h s l / 100%);
                            border-radius: 4px;
                            justify-content: center;
                        ">
                            ${notice}
                        </div>`
            : ""}

             <div style="display: flex; gap: 80px;">
                <div style="display: flex; flex-direction: column; justify-content: start;">
                    <h3 style="margin-bottom: 0;">Contact Information</h3>
                    <p style="margin-top: 8px;">This instance is run by:<br> ${contactData.owner.name}</p>
                    
                    <ul style="padding-left: 20px;line-height: 1.5;">
                        ${contactData.email ? `<li>Email: <a href=mailto:"${contactData.email}" target="_blank">${contactData.email}</a></li>` : ""}
                        ${contactData.website ? `<li>Website: <a href="${contactData.website}" target="_blank">${contactData.website}</a></li>` : ""}
                        ${contactData.reddit ? `<li>Reddit: <a href="${contactData.reddit}" target="_blank">${shortRedditUrl}</a></li>` : ""}
                        ${contactData.github ? `<li>Github: <a href="${contactData.github}" target="_blank">${shortGithubUrl}</a></li>` : ""}
                        ${contactData.discord ? `<li>Discord: <a href="${contactData.discord}" target="_blank">${shortDiscordUrl}</a></li>` : ""}
                        ${contactData.signal ? `<li>Signal: ${contactData.signal}</li>` : ""}
                    </ul>                    
                    
                </div>
                
                <div style="display: flex; flex-direction: column; margin-left: auto;">
                    <h3 style="margin-bottom: 6px;">Instance Information</h3>
                    
                    <a onclick="Docs.open('/Web Client/Main/Instance Info.md')">Documentation</a>
                    <a href="https://github.com/hackthedev/dcts-shipping/releases/tag/${versionText}" target="_blank">Version ${versionText}</a>
                    
                </div>
            </div>    
             
            `,
            async function (values) {
                let inviteCode = values?.inviteCode;

                if (inviteCode && inviteCode.length > 0) {
                    userJoined(false, null, null, inviteCode);
                }

                if (!inviteCode) {
                    userJoined();
                }
            },
            ["Ok", null],
            null
        )
    }

    static async uploadFile(files, type = "upload") {
        const file = files[0];
        const chunkSize =  1024 * 256; // 256kb
        const totalChunks = Math.ceil(file.size / chunkSize);
        const fileId = crypto.randomUUID();

        const filename = file.name;
        const id = UserManager.getID();

        let lastPercent = -1;

        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = start + chunkSize;
            const chunk = file.slice(start, end);

            const arrayBuf = await chunk.arrayBuffer();

            const url = `/upload?` +
                `id=${id}` +
                `&type=${type}` +
                `&filename=${encodeURIComponent(filename)}` +
                `&chunkIndex=${i}` +
                `&totalChunks=${totalChunks}` +
                `&fileId=${fileId}`;

            const res = await fetch(url, {
                method: "POST",
                body: arrayBuf
            });

            const json = await res.json();

            if (!json.ok)
                return json;

            const percent = Math.round(((i + 1) / totalChunks) * 100);
            if (percent !== lastPercent) {
                lastPercent = percent;

                if(window?.showSystemMessage){
                    showSystemMessage({
                        title: `Uploading file... ${percent}%`,
                        text: ``,
                        icon: "info",
                        type: "neutral",
                        duration: 1500
                    });
                }
            }

            if (json.ok && json.path) {
                if(window?.showSystemMessage){
                    showSystemMessage({
                        title: "File uploaded",
                        text: "",
                        icon: "info",
                        type: "success",
                        duration: 2000
                    });
                }
                return json;
            }
        }

        return { ok: false, error: "unknown_upload_error" };
    }

    static async resolveMemberRoles(memberId) {
        return new Promise((resolve, reject) => {
            socket.emit("resolveMemberRoles", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                target: memberId
            }, function (response) {
                resolve(response);
            })
        })
    }

    static proxyUrl(url){
        if(!url) return null;
        if(url.startsWith(window.location.origin)) return url;
        if(url.startsWith(encodeURIComponent(window.location.origin))) return decodeURIComponent(url);
        if(url.startsWith("data:")) return url;
        if(url.startsWith("/uploads")) return url;
        if(url.startsWith("/img")) return url;
        if(url.startsWith("/emojis")) return url;
        return `/proxy?url=${encodeURIComponent(url)}`
    }

    static async resolveMember(memberId) {
        return new Promise((resolve, reject) => {
            socket.emit("resolveMember", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                target: memberId
            }, function (response) {
                resolve(response?.data);
            })
        })
    }

    static async resolveServerMembers() {
        return new Promise((resolve, reject) => {
            socket.emit("getServerMembers", {
                id: UserManager.getID(),
                token: UserManager.getToken()
            }, function (response) {
                resolve(response);
            })
        })
    }

    static async resolveServerRoles() {
        return new Promise((resolve, reject) => {
            socket.emit("getServerRoles", {
                id: UserManager.getID(),
                token: UserManager.getToken()
            }, function (response) {
                resolve(response);
            })
        })
    }

    static async resolveRole(roleId) {
        return new Promise((resolve, reject) => {
            socket.emit("resolveRole", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                target: String(roleId)
            }, function (response) {
                resolve(response?.data);
            })
        })
    }

    static async resolveChannel(roleId) {
        return new Promise((resolve, reject) => {
            socket.emit("resolveChannel", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                channelId: String(roleId)
            }, function (response) {
                resolve(response);
            })
        })
    }

    static getChannelMarkerCounter(channelId) {
        if (!String(channelId)) {
            console.error("Couldnt get channel marker as channel id wasnt set")
            return;
        }
        return Number(localStorage.getItem(`message-marker-${channelId}`))
    }

    static async resolveMessage(messageId) {
        return new Promise((resolve, reject) => {
            socket.emit("resolveMessage", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                messageId
            }, async (response) => {
                if (response?.error != null) {
                    console.error("Couldnt resolve message");
                    console.error(response.error);
                    resolve(null)
                } else {
                    resolve(response)
                }
            })
        })
    }

    static setChannelMarkerCounter(channelId, counter) {
        if (!String(channelId)) {
            console.error("Couldnt save channel marker as channel id wasnt set")
            return;
        }

        // if we supply nothing lets just set the current channel msg count
        if (!counter) {
            let channelElement = ChatManager.getChannelElementById(channelId);
            if (!channelElement) {
                console.error("couldnt udpate channel marker count as the channel element wasnt found");
                return
            }

            counter = channelElement.getAttribute("data-message-count");
        }

        localStorage.setItem(`message-marker-${channelId}`, counter)
    }

    static decreaseChannelMarkerCount(channelId) {
        let channelElement = ChatManager.getChannelElementById(channelId);
        if (!channelElement) {
            console.error("couldnt decrease channel marker count as the channel element wasnt found");
            return
        }

        let msgCount = Number(channelElement.getAttribute("data-message-count"));
        if (!msgCount) {
            console.error("Couldnt decrease channel marker counter as counter attribute wasnt found")
            return;
        }

        // decrease counter and update
        msgCount--;
        channelElement.setAttribute("data-message-count", String(msgCount))
    }

    static increaseChannelMarkerCount(channelId) {
        let channelElement = ChatManager.getChannelElementById(channelId);
        if (!channelElement) {
            console.error("couldnt increase channel marker count as the channel element wasnt found");
            return
        }

        let msgCount = Number(channelElement.getAttribute("data-message-count"));
        if (!msgCount) {
            console.error("Couldnt increase channel marker counter as counter attribute wasnt found")
            return;
        }

        // increase counter and update
        msgCount++;
        channelElement.setAttribute("data-message-count", String(msgCount))
    }

    static setChannelMarker(channelId, mark = false) {
        let channelElement = ChatManager.getChannelElementById(channelId);
        if (!channelElement) {
            console.error("couldnt set channel marker as the channel element wasnt found", channelId);
            return
        }

        let indicator = channelElement.querySelector(".message-marker-icon");

        if (!channelElement || !indicator) {
            console.error("Couldnt set channel marker because channelelement wasnt found");
        }

        if (mark === true) {
            if (!channelElement.classList.contains("markChannelMessage")) channelElement.classList.add("markChannelMessage");
            indicator.style.display = "block";
        } else {
            if (channelElement.classList.contains("markChannelMessage")) channelElement.classList.remove("markChannelMessage");
            indicator.style.display = "none";
        }
    }

    static getChannelElementById(channelId) {
        if (!String(channelId)) {
            console.error("Couldnt get channel element from id");
            return;
        }

        return document.querySelector(`#channeltree a.channelTrigger[data-channel-id='${channelId}']`);
    }
}