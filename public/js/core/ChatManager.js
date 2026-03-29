class ChatManager {

    static showedGlitch = false;
    static connectionLost = false;
    static wasConnected = false;

    static chance(percent) {
        return Math.random() < percent / 100;
    }

    static closePagePopup(id){
        let pagePopup = window.parent.document.querySelector(`#${id}`);
        if(pagePopup) {
            pagePopup.remove()
        }
    }

    static isPopupShown(id){
        return !!document.querySelector(`.popupPageContainer#${id}`);
    }

    static extractHost(url){
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

    static openPagePopup(elementId, url){
        if(!url) throw new Error("No url supplied bitch", url); // lol
        MobilePanel.close()

        let pagePopup = document.querySelector('#' + elementId);
        let iframe = pagePopup?.querySelector('iframe');

        // if no shit found make it
        if(!pagePopup) {
            pagePopup = document.createElement('div');
            pagePopup.classList.add('popupPageContainer');
            pagePopup.id = elementId;

            // some styling for it to seam "real
            pagePopup.style.width = "92%";
            pagePopup.style.height = "92%"

            // this is how you center shit easily with css
            pagePopup.style.position = "fixed";
            pagePopup.style.top = "50%";
            pagePopup.style.left = "50%";
            pagePopup.style.transform = "translate(-50%, -50%)";

            // if not visible it may be transparent or behind other shit
            // i have some other css where i used it too in case
            pagePopup.style.backgroundColor = "black";
            pagePopup.style.zIndex = "2";

            pagePopup.style.borderRadius = "8px";
            pagePopup.style.overflow = "hidden";

            pagePopup.style.border = "1.25px solid var(--border-color-bright)";
            pagePopup.style.boxShadow = "0 0 60px rgba(0,0,0,1)";
            pagePopup.style.backdropFilter = "blur(10px)";
            pagePopup.style.display = "flex";

            // then add it to the document
            document.body.appendChild(pagePopup);
        }
        else{
            pagePopup.id = elementId;
            pagePopup.style.display = "flex";
        }

        if(!iframe){
            iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.border = "none";
            pagePopup.appendChild(iframe);
        }
        else{
            iframe.src = url
        }
    }

    static waitForSocket(socket) {
        return new Promise((resolve, reject) => {
            if (socket.connected) {
                return resolve(socket);
            }

            const onConnect = () => {
                cleanup();
                resolve(socket);
            };

            const onError = (err) => {
                cleanup();
                reject(err);
            };

            function cleanup() {
                socket.off("connect", onConnect);
                socket.off("connect_error", onError);
            }

            socket.on("connect", onConnect);
            socket.on("connect_error", onError);
        });
    }

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

    static async userJoined(onboardingFlag = false, passwordFlag = null, loginNameFlag = null, accessCode = null, initial = false, callback = null) {
        if (UserManager.getUsername() != null) {
            var username = UserManager.getUsername();

            let knownServers = "";
            if (isLauncher() && initial) {
                await syncHostData()
                knownServers = await Client().GetServers();
            }

            socket.emit("userConnected", {
                id: UserManager.getID(),
                name: username,
                icon: UserManager.getPFP(),
                status: UserManager.getStatus(),
                token: UserManager.getToken(),
                password: passwordFlag,
                onboarding: onboardingFlag,
                aboutme: UserManager.getAboutme(),
                banner: UserManager.getBanner(),
                loginName: loginNameFlag,
                publicKey: await UserManager.getPublicKey(),
                knownServers,
                code: accessCode,
                pow: {
                    challenge: localStorage.getItem("pow_challenge"),
                    solution: localStorage.getItem("pow_solution")
                }
            }, async function (response) {

                // sync data
                if (response?.token) CookieManager.setCookie("token", response.token);
                if (response?.icon) CookieManager.setCookie("pfp", response.icon);
                if (response?.banner) CookieManager.setCookie("banner", response.banner);
                if (response?.aboutme) CookieManager.setCookie("aboutme", response.aboutme);
                if (response?.status) CookieManager.setCookie("status", response.status);
                if (response?.loginName) CookieManager.setCookie("loginName", response.loginName);
                if (response?.name) CookieManager.setCookie("username", response.name);
                if (response?.id) CookieManager.setCookie("id", response.id);

                // account manager soon?
                if (await isLauncher()) {
                    if (await Client().setAccountCredentials) {
                        await Client().setAccountCredentials(
                            ChatManager.extractHost(window.location.origin),
                            UserManager.getID(),
                            UserManager.getToken()
                        );
                    }

                    UserManager.saveAccount()
                }

                if(callback) await callback(response);

                // if we finished onboarding
                if (!response?.error && response.finishedOnboarding === true && initial) {
                    socket.emit("setRoom", {
                        id: UserManager.getID(),
                        room: UserManager.getRoom(),
                        token: UserManager.getToken()
                    });
                    getGroupBanner();
                    socket.emit("getGroupList", {
                        id: UserManager.getID(),
                        group: UserManager.getGroup(),
                        token: UserManager.getToken(),
                        username: UserManager.getUsername(),
                        icon: UserManager.getPFP()
                    });

                    socket.emit("getCurrentChannel", {
                        id: UserManager.getID(),
                        token: UserManager.getToken(),
                        username: UserManager.getUsername(),
                        icon: UserManager.getPFP(),
                        group: UserManager.getGroup(),
                        category: UserManager.getCategory(),
                        channel: UserManager.getChannel()
                    });
                    socket.emit("setRoom", {
                        id: UserManager.getID(),
                        room: UserManager.getRoom(),
                        token: UserManager.getToken()
                    });

                    if (initial) {
                        /* Quill Emoji Autocomplete */
                        initializeEmojiAutocomplete(document.querySelector('.ql-editor'));
                        initializeMentionAutocomplete(document.querySelector('.ql-editor'));

                        await ChatManager.getServerInfo();
                        getChatlog(document.getElementById("content"));

                        getMemberList()
                        getChannelTree()
                        showGroupStats();
                        focusEditor()
                    }

                    socket.emit("checkPermission", {
                        id: UserManager.getID(),
                        token: UserManager.getToken(),
                        permission: "manageReports"
                    }, function (response) {
                        if (response.permission === "granted" && initial) {
                            ModView.init();
                            UserReports.getReports();
                        }
                    });

                } else {
                    if (response.error) {
                        splash.hide()
                        if(response.error.includes("banned")){
                            ChatManager.showInstanceInfo(response.error, "indianred");
                            return;
                        }


                        showSystemMessage({
                            title: response.title || "",
                            text: response.msg || response.error || "",
                            icon: "error",
                            img: null,
                            type: "error",
                            duration: response.displayTime || 3000
                        });

                        if (response?.registration === false) {
                            // show registration prompt
                            customPrompts.showPrompt(
                                `Invite Code`,
                                `
                             <div class="prompt-form-group">
                                 <p>
                                    This server is an invite-only server. <br>
                                    Please enter an invite code to join the server.
                                 </p>
                                 <p>
                                 Already have an account? <a href="#" onclick="UserManager.doAccountLogin()">Log in instead</a>
                                </p>
                             </div>

                             <div class="prompt-form-group">
                                <input class="prompt-input" autocomplete="off" type="text" name="inviteCode" id="inviteCode" placeholder="Enter an invite code" value="">
                                <label style="color: indianred;" class="prompt-label error-text"></label>
                             </div>
                            `,
                                async function (values) {
                                    let inviteCode = values?.inviteCode;

                                    if (inviteCode && inviteCode.length > 0) {
                                        requestAnimationFrame(function () {
                                            UserManager.doAccountOnboarding(null, inviteCode)
                                        })
                                        //userJoined(false, null, null, inviteCode);
                                    }

                                    if (!inviteCode) {
                                        ChatManager.userJoined();
                                    }
                                }
                            )
                        }
                    }
                }
            });
        }
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

    static setUrl(param) {
        window.history.replaceState(null, null, param); // or pushState
        let page = param.replace("?page=", "");
        if(typeof loadPageContent === "function") loadPageContent(page)
    }

    static setUrlParam(key, value, { replace = true } = {}) {
        const url = new URL(window.location.href);
        const params = url.searchParams;

        if (params.has(key)) {
            params.set(key, value);
        } else {
            params.append(key, value);
        }

        if (replace) {
            window.history.replaceState({}, '', url);
        } else {
            window.history.pushState({}, '', url);
        }
    }

    static getUrlParams(param) {
        var url = window.location.search;
        var urlParams = new URLSearchParams(url);
        var value = urlParams.get(param);
        return value;
    }


    static getDMFromUrl() {
        return this.getUrlParams("dm") || null;
    }

    static async getServerInfo(returnData = false) {
        return new Promise((resolve, reject) => {

            // reject if we get disconnected or something
            setTimeout(() => {
                if(!socket.connected){
                    resolve(null);
                }
            }, 1000)

            //Official <span style="font-weight: bold; color: skyblue;">DCTS <span style="font-weight: bold; color: cadetblue;">Community</span></span>
            socket.emit("getServerInfo", {id: UserManager.getID(), token: UserManager.getToken()}, async function (response) {
                if(returnData) return resolve(response);
                var headline = document.getElementById("header");

                let servername = response.serverinfo.name;
                let serverdesc = response.serverinfo.description;
                let countryCode = response.serverinfo.countryCode;

                headline.innerHTML = `
                    <div id="main_header">
                        ${countryCode ? `${ChatManager.countryCodeToEmoji(countryCode)} ` : ""}${sanitizeHtmlForRender(servername, false)} ${serverdesc ? ` - ${sanitizeHtmlForRender(serverdesc, false)}` : ""}
                    </div>
        
                    <div id="badges"></div>          
                    <div id="headerRight">
                        <div class="headerIcon help" onclick="ChatManager.showInstanceInfo()"></div>
                        <div class="headerIcon donators" onclick="UserManager.showDonatorList('https://shy-devil.me/app/dcts/');"></div>
                        <div class="headerIcon inbox">
                            <span id="inbox-indicator"></span>
        
                            ${await Inbox.getContentHTML()}
                        </div>
                    </div>
                    `;

                UserManager.displayServerBadges();
                displayDiscoveredHosts()
                resolve(null)
            });
        })
    }

    static async showInstanceInfo(notice = null, noticeColor = "transparent"){
        let infoData;
        if(socket.connected){
            infoData = await this.getServerInfo(true);
            if(infoData) infoData = infoData.serverinfo
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
                    ${contactData.owner.name ? `<p style="margin-top: 8px;">This instance is run by:<br> ${contactData.owner.name}</p>`: ""}
                    
                    <ul style="padding-left: 20px;line-height: 1.5;">
                        ${contactData.email ? `<li>Email: <a href=mailto:"${contactData.email}" target="_blank">${contactData.email}</a></li>` : ""}
                        ${contactData.website ? `<li>Website: <a href="${contactData.website}" target="_blank">${contactData.website}</a></li>` : ""}
                        ${contactData.reddit ? `<li>Reddit: <a href="${contactData.reddit}" target="_blank">${shortRedditUrl}</a></li>` : ""}
                        ${contactData.github ? `<li>Github: <a href="${contactData.github}" target="_blank">${shortGithubUrl}</a></li>` : ""}
                        ${contactData.discord ? `<li>Discord: <a href="${contactData.discord}" target="_blank">${shortDiscordUrl}</a></li>` : ""}
                        ${contactData.signal ? `<li>Signal: ${contactData.signal}</li>` : ""}
                    </ul>                    
                    
                </div>
                
                <div style="display: flex; flex-direction: column; margin-left: auto; gap: 4px;">
                    <h3 style="margin-bottom: 6px;">Instance Information</h3>
                    
                    <a onclick="Docs.open('/Web Client/Main/Instance Info.md')"><u>Documentation</u></a>
                    <a href="https://github.com/hackthedev/dcts-shipping/releases/tag/${versionText}" target="_blank">Version ${versionText}</a>               
                </div>
            </div>    
             
            `,
            async function (values) {
                let inviteCode = values?.inviteCode;

                if (inviteCode && inviteCode.length > 0) {
                    ChatManager.userJoined(false, null, null, inviteCode);
                }

                if (!inviteCode) {
                    ChatManager.userJoined();
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
                    console.error("Couldnt resolve message", messageId);
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
            return console.error("couldnt increase channel marker count as the channel element wasnt found");
        }

        let msgCount = Number(channelElement.getAttribute("data-message-count"));
        if (!msgCount) {
            return console.error("Couldnt increase channel marker counter as counter attribute wasnt found")
        }

        // increase counter and update
        msgCount++;
        channelElement.setAttribute("data-message-count", String(msgCount))
    }

    static setChannelMarker(channelId, mark = false) {
        let channelElement = ChatManager.getChannelElementById(channelId);
        if (!channelElement) {
            return console.error("couldnt set channel marker as the channel element wasnt found", channelId);
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