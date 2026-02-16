class UserManager {

    static isLoadingDonators = false;

    static updateUsernameOnUI(username, sync = false) {
        try {
            document.getElementById("profile-qa-info-username").innerText = username;

            if (sync == true) {
                socket.emit("setUsername", {
                    token: UserManager.getToken(),
                    id: UserManager.getID(),
                    username: UserManager.getUsername(),
                    icon: UserManager.getPFP()
                });
            }
        } catch {
        }

    }

    static async resolveMemberGid(memberId){
        if(!memberId || memberId?.length !== 12) throw new Error("Member ID not set or length invalid!");

        let member = await ChatManager.resolveMember(memberId);
        if(!member){
            console.warn("Member not found for Gid resolving");
            return null
        }

        if(!member?.publicKey){
            console.warn("Member has no public key!");
            return null;
        }

        return await Crypto.GenerateGid(member.publicKey);
    }

    static async getMemberProfileHTML(memberObj) {

        let roleCode = "";
        for (let i = 0; i < memberObj?.roles.length; i++) {
            var role = memberObj?.roles[i];
            var roleColor = role.color;
            var roleName = role.name;

            roleCode += `<code class="role" id="profile-role-entry-${role.id}"><div class="role_color" style="background-color: ${roleColor};"></div>${roleName}</code>`;
        }

        let isMuted = memberObj?.isMuted;
        let isBanned = memberObj?.isBanned;


        // if someone is muted etc
        let mutedCode = "";
        let bannedCode = "";

        if (isMuted) {
            mutedCode = `<div style="color: indianred; border: 1px solid indianred;" class="info mutedMember">
                            <h1>Muted</h1>
                        </div>`
        }
        if (isBanned) {
            bannedCode = `<div style="color: indianred; border: 1px solid indianred;" class="info">
                            <h1>Banned</h1>
                        </div>`
        }

        if(memberObj?.status === "null") memberObj.status = null;

        return `
            <div id="profile_banner" draggable="false" style="background-image: url('${ChatManager.proxyUrl(memberObj?.banner)}')"></div>
        
            <div id="profile_pfp_container">
                <div id="profile_icon" draggable="false" style="background-image: url('${ChatManager.proxyUrl(memberObj?.icon)}');"></div>                
                <div id="profile_badge_container" data-gid="${isLauncher() ? await Crypto.GenerateGid(memberObj?.publicKey) : ""}"></div>                
            </div>
            
        
            <div id="profile_content">       
                <div id="profile_username"><h2 style="margin: 0 !important;">${memberObj?.name}</h2></div>                
                <div id="profile_status">${ChatManager.countryCodeToEmoji(memberObj?.country_code)} <i>${memberObj?.status ? memberObj?.status : ""}</i></div>  
                                
                <hr>
                <div class="profile_aboutme">       
                    ${memberObj?.aboutme?.trim()?.length > 0 ? `<h2 class="profile_headline">About Me</h2>${sanitizeHtmlForRender(memberObj.aboutme)}` : ""}
                    
                    
                    <div class="profile_meta_container">
                        ${
                            mutedCode || bannedCode ?
                                `<div class="profile_meta">
                                    ${mutedCode}
                                    ${bannedCode}   
                                </div>` : ""
                        }   
                    </div>        
                </div>
            <hr>
                       
            <a id="dm_action" href="/home.html?dm=${memberObj?.id}">&#10149; Send Message</a>

            <div class="profile_meta">
                <div class="info">
                    <h1>Joined</h1>
                    <div class="value">
                        ${new Date(memberObj?.joined).toLocaleString("narrow", {
                            dateStyle: "short",
                            timeStyle: "short",
                            hour12: true
                        }).replace(",", "<br>")}
                        </div>
                    </div>
                                            
                    <div class="info">
                        <h1>Last online</h1>
                        <div class="value">
                            ${new Date(memberObj?.lastOnline).toLocaleString("narrow", {
                                dateStyle: "short",
                                timeStyle: "short",
                                hour12: true
                            }).replace(",", "<br>")}
                    </div>
                </div>                 
            </div>
            
            <hr>
            
            <div id="profile_roles">
                <h2 class="profile_headline">Roles</h2>
                ${roleCode}
                <code style="cursor: pointer;" onclick="ModActions.addRoleFromProfile('${memberObj.id}');" class="role addRoleMenuTrigger" data-member-id="${memberObj.id}" id="addRole-${memberObj.id}">+</code>
            </div>`;
    }

    static async getPublicKey() {
        return await Crypto.getPublicKey();
    }

    static async getUserBadges(id, beta = false) {
        if (!id) return null;
        return await getBadges("users", id, beta)
    }

    static async getServerBadges(id, beta = false) {
        if (!id) return null;
        return await getBadges("servers", id, beta)
    }

    static async getServerGid() {
        return Crypto.GenerateGid(window.location.host)
    }

    static async displayServerBadges(beta = false) {
        if (!isLauncher()) return

        let badgeElement = document.querySelector("#header #badges");
        if (!badgeElement) {
            console.warn("Couldnt find badge element")
            return;
        }

        let gid = await this.getServerGid();
        if (!gid) return;

        return await this.getServerBadges(gid, beta).then(result => {
            if (result != null) {
                let badgeData = JSON.parse(result?.data || "{}")
                console.log(badgeData)

                for(let badgeKey of Object.keys(badgeData)){
                    let badge = badgeData[badgeKey];
                    badgeElement.insertAdjacentHTML('beforeend',
                        `<img 
                                    class="profile_badge" 
                                    src="/img/badges/${badge.icon}.png" 
                                    title="${badge.display}" 
                                />`
                    );
                }
            }
        });
    }

    static async displayUserBadges(beta = false) {
        if (!isLauncher()) return

        let badgeElement = document.querySelector("#profile_container #profile_badge_container");
        badgeElement.innerHTML = "";

        if (!badgeElement) {
            console.warn("Couldnt find badge element")
            return null;
        }

        let gid = badgeElement.getAttribute("data-gid");
        if (!gid || gid === "null") {
            console.warn("Couldnt find gid")
            return null;
        }

        return await this.getUserBadges(gid, beta).then(result => {
            if (result != null) {
                let badgeData = JSON.parse(result?.data || "{}")

                for(let badgeKey of Object.keys(badgeData)){
                    let badge = badgeData[badgeKey];
                    badgeElement.insertAdjacentHTML('beforeend',
                        `<img 
                                    class="profile_badge" 
                                    src="/img/badges/${badge.icon}.png" 
                                    title="${badge.display}" 
                                />`
                    );
                }

                return true;
            }
        });
    }

    static updateStatusOnUI(status, sync = false) {
        try {
            document.getElementById("profile-qa-info-status").innerText = status;

            if (sync == true) {
                socket.emit("setStatus", {
                    id: UserManager.getID(),
                    username: UserManager.getUsername(),
                    icon: UserManager.getPFP(),
                    status: UserManager.getStatus()
                });
            }
        } catch {
        }
    }

    static updatePFPOnUI(url, sync = false) {
        try {
            document.getElementById("profile-qa-img").src = url;

            if (sync == true) {
                socket.emit("setPFP", {
                    id: UserManager.getID(),
                    username: UserManager.getUsername(),
                    icon: UserManager.getPFP()
                });
            }
        } catch {
        }
    }

    static changeStatus() {
        var status = prompt("What should your new status be?", getStatus());

        if (status.length > 0) {
            CookieManager.setCookie("status", status, 360);
            UserManager.updateStatusOnUI(status, true);
        } else {
            alert("Your status was too short");
        }
    }

    static changePFP() {
        var pfp = prompt("Enter the url of your new pfp", getPFP());

        if (pfp.length > 0) {
            CookieManager.setCookie("pfp", pfp, 360);
            UserManager.updatePFPOnUI(pfp, true);
        } else {

            var reset = confirm("Your pfp url was too short. Want to reset your pfp?");

            if (reset) {
                pfp = "/img/default_pfp.png";
                setPFP(pfp);
            } else {
                return;
            }
        }

        if (pfp == null || isImage(pfp) == false) {
            pfp = "/img/default_pfp.png";
        }

        CookieManager.setCookie("pfp", pfp, 360);
        UserManager.updatePFPOnUI(pfp, true);
    }

    static changeUsername() {
        //promptForUsername(true);
    }

    static getRoom() {
        return getUrlParams("group") + "-" + getUrlParams("category") + "-" + getUrlParams("channel");
    }

    static getCategory() {

        var url = window.location.search;
        var urlParams = new URLSearchParams(url);
        var urlChannel = urlParams.get("category");

        if (urlChannel == null) {
            return null;
        } else {
            return urlChannel;
        }
    }

    static getChannel() {

        var url = window.location.search;
        var urlParams = new URLSearchParams(url);
        var urlChannel = urlParams.get("channel");

        if (urlChannel == null) {
            return null;
        } else {
            return urlChannel;
        }
    }

    static getPassword() {
        let passprompt = prompt("Please enter your account password:");
        if (passprompt) return passprompt;
    }

    static getTheme() {
        var theme = CookieManager.getCookie("theme");

        if (theme == null || theme.length <= 0) {
            return "default.css";
        } else {
            return theme;
        }
    }

    static setThemeAccent(color) {
        CookieManager.setCookie("theme_accent", color);
    }

    static getThemeAccent() {
        var themeAccent = CookieManager.getCookie("theme_accent");
        if (themeAccent == null || themeAccent.length <= 0) {
            console.error("Couldnt get theme accent")
            return "#131415";
        } else {
            return CookieManager.getCookie("theme_accent");
        }
    }

    static resetTheme() {
        CookieManager.setCookie("theme", "default.css");
    }

    static setTheme(themeFileName) {
        if (themeFileName == null || themeFileName.length <= 0) {
            console.error("Couldnt set theme as theme file name wasnt supplied")
            return null;
        } else {
            CookieManager.setCookie("theme", themeFileName);
        }
    }

    static getToken() {
        var token = CookieManager.getCookie("token");
        if(!token && CookieManager.getCookie("dcts_token")) {
            token = CookieManager.getCookie("dcts_token");
            localStorage.setItem("token", token);
        }

        if (token == null || token.length <= 0) {
            return null;
        } else {
            return token;
        }
    }

    static getID() {
        var id = CookieManager.getCookie("id");

        if (id == null || id.length !== 12) {
            id = UserManager.generateId(12);
            CookieManager.setCookie("id", id, 360);
            return id;
        } else {
            return id;
        }
    }

    static getPFP() {
        var pfp = localStorage.getItem("pfp");

        if (pfp == null || pfp.length <= 0) {
            //pfp = prompt("Please enter the url to your profile picture.");

            //if(pfp.length <= 0){
            pfp = "/img/default_pfp.png";
            //}
            CookieManager.setCookie("pfp", pfp, 360);
            UserManager.updatePFPOnUI(pfp);
            return pfp;
        }

        UserManager.updatePFPOnUI(pfp);
        return pfp;
    }

    static getStatus() {
        var status = CookieManager.getCookie("status");

        if (status == null || status.length <= 0) {
            return status;
        } else {
            UserManager.updateStatusOnUI(status);
            return status;
        }
    }

    static getGroup() {

        var url = window.location.search;
        var urlParams = new URLSearchParams(url);
        var urlChannel = urlParams.get("group");

        if (urlChannel == null) {
            return "0";
        } else {
            return urlChannel;
        }
    }

    static pickRandomFromArray(array){
        return array[Math.floor(Math.random() * array.length)];
    }

    static getRandomUsername(){
        let randomUsernames = [
            "Billy",
            "Arnold",
            "John Connor",
            "Kenny"
        ];

        return UserManager.pickRandomFromArray(randomUsernames);
    }

    static getUsername() {

        var username = CookieManager.getCookie("username");

        if (username == null || username.length <= 0) {
            return UserManager.getRandomUsername();
        } else {
            try {
                UserManager.updateUsernameOnUI(username);
            } catch {
            }
            return username;
        }
    }

    static getAboutme() {
        var aboutme = CookieManager.getCookie("aboutme");

        if (aboutme == null || aboutme.length <= 0) {
            return "";
        } else {
            try {
                updateUsernameOnUI(aboutme);
            } catch {
            }
            return aboutme;
        }
    }

    static getBanner() {
        var banner = localStorage.getItem("banner");

        if (banner == null || banner.length <= 0) {
            return "";
        } else {
            try {
                updateUsernameOnUI(aboutme);
            } catch {
            }
            return banner;
        }
    }

    static getLoginName() {
        let loginName = CookieManager.getCookie("loginName");

        if (!loginName) {
            // NO LOGIN NAME FOUND; DO ACCOUNT LOGIN
        }

        return loginName;
    }

    static importToken() {
        /* DEPRECATED */
        var combinedInput = prompt("Please paste your exported token here.")

        var token = combinedInput.split(":")[0];
        var id = combinedInput.split(":")[1];

        console.log(token)

        if (token.length != 48) {
            alert("This token was invalid. If you forgot your token please contact the server admin");
            return;
        }
        if (id.length != 12) {
            alert("The ID in your token string was invalid. Format: token:id (48, 12)");
            return;
        }

        alert("Token successfully set!\nPlease save it if you havent already");
        CookieManager.setCookie("dcts_token", token, 365);
        CookieManager.setCookie("id", id, 365);
    }

    static resetAccount() {
        var reset = confirm("Do you really want to reset your account? EVERYTHING will be reset.")

        if (reset) {
            CookieManager.setCookie("id", null, 365);
            CookieManager.setCookie("username", null, 365);
            CookieManager.setCookie("status", null, 365);
            CookieManager.setCookie("pfp", null, 365);
            CookieManager.setCookie("dcts_token", null, 365);
            CookieManager.setCookie("banner", null, 365);
            CookieManager.setCookie("pow_challenge", null, 365);
            CookieManager.setCookie("pow_solution", null, 365);

            alert("Your account has been reset. Please refresh the page if you want to continue");

            window.location.reload();
        }
    }

    static setUser(username) {
        // renamed setUser. May be used. legacy function lol
        UserManager.setUsername(username)
    }

    static setUsername(username) {
        CookieManager.setCookie("username", username, 360);
        UserManager.updateUsernameOnUI(username);
    }

    static setBanner(banner) {
        CookieManager.setCookie("banner", banner, 360);
        localStorage.setItem("banner", banner);
    }

    static setStatus(status) {
        CookieManager.setCookie("status", status, 360);
        UserManager.updateUsernameOnUI(status);
    }

    static setPFP(pfp) {
        localStorage.setItem("pfp", pfp);
        UserManager.updateUsernameOnUI(pfp);
    }

    static setAboutme(aboutme) {
        CookieManager.setCookie("aboutme", aboutme, 360);
        UserManager.updateUsernameOnUI(aboutme);
    }

    static setLoginName(loginName) {
        CookieManager.setCookie("loginName", loginName, 360);
    }

    static generateId(length, strings = false) {
        let result = '1';
        let characters = '0123456789';
        if(strings === true) characters += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length - 1) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    }

    static doAccountLogin() {
        customPrompts.showPrompt(
            "Login",
            `
            
            <div style="
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 40px;
            ">
                <div>
                    <div class="prompt-form-group" id="loginNameContainer">
                        <label class="prompt-label" for="loginName">Login name</label>
                        <input class="prompt-input" type="text" name="loginName" onkeyup="UserManager.handleLoginNameInput(this)" id="loginName" placeholder="Enter login name" value="">
                        <label style="color: indianred;" class="prompt-label error-text"></label>
                    </div>
                    <div class="prompt-form-group" id="passwordContainer" style="margin-bottom: 20px;">
                        <label class="prompt-label" for="password">Password</label>
                        <input class="prompt-input" type="password" name="password" id="password" placeholder="Enter password">
                    </div>
                </div>
                
                <div style="
                    position: relative;
                    border-bottom: 2px solid gray;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    z-index: 1;
                ">
                    <label style="
                        position: absolute;
                        background-color: rgb(36, 41, 46);
                        color: #b1b1b1;
                        padding: 0 10px;
                        top: -10px;
                        z-index: 2;
                    ">
                        or
                    </label>      
                </div>
    
                <div style="margin-bottom: 20px; cursor: pointer;">
                    <a style="color: white; text-decoration: underline;" onclick="UserManager.doAccountOnboarding();" >Create new account</a>
                </div>
            </div>
            
            `,
            async (values) => {

                // check login name
                if (values.loginName) {

                    if (UserManager.validateLoginname(values.loginName)) {
                        socket.emit("userLogin", {
                            loginName: values.loginName,
                            password: values.password
                        }, function (response) {

                            console.log(response)
                            if (response?.error === null && response.member) {
                                console.log("Setting cookies")
                                CookieManager.setCookie("dcts_token", response.member.token, 365);
                                CookieManager.setCookie("id", response.member.id, 365);
                                CookieManager.setCookie("username", response.member.name, 365);

                                UserManager.setPFP(response.member.icon);
                                UserManager.setBanner(response.member.banner);
                                UserManager.setAboutme(response.member.aboutme);
                                UserManager.setStatus(response.member.status);

                                window.location.reload();
                            } else {
                                customAlerts.showAlert("error", response.error)
                                if (response.error) {
                                    UserManager.doAccountLogin();
                                }
                            }
                        });
                    } else {
                        customAlerts.showAlert("error", "Your login name contains illegal characters")
                        customPrompts.closePrompt();
                        return;
                    }
                }

                customPrompts.closePrompt();
            },
            ["Login", null],
            null,
            null,
            null,
            (data) => {
                if(data?.canceled){
                    this.doAccountLogin()
                }
            }
        );
    }

    static async showDonatorList(urlBase) {
        try {
            if (UserManager.isLoadingDonators) return;
            UserManager.isLoadingDonators = true;

            let effect = null;
            let stopEffect;
            let musicToken = 0;

            const txtUrl = `${urlBase}donators.txt?v=${this.generateId(5)}`;
            let mp3Url;
            let songName;

            // Load donators.txt
            const response = await fetch(txtUrl);
            if (!response.ok) throw new Error("Failed to fetch donator list.");
            const text = await response.text();

            // split lines
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            const seen = new Set();
            const totals = {};
            const order = {}; // to remember

            // setup music and potentially song name
            if (lines[0].startsWith("# ") && lines[0].includes(".mp3")) {
                mp3Url = urlBase + lines[0].split(";")[0].replace("# ", "");
                effect = lines[0].split(";")[1] || "confetti";

                if (lines[1].startsWith("# ")) {
                    songName = lines[1].replace("# ", "");
                }
            }

            for (let i = 0; i < lines.length; i++) {
                if (!lines[i].startsWith("#")) {
                    const parts = lines[i].split(',').map(part => part.trim());
                    const user = parts[0];
                    const amount = parseFloat(parts[1]) || 0;

                    if (!seen.has(user)) {
                        order[user] = i; // save first seen (lower = more recent in reversed list)
                        seen.add(user);
                    }

                    totals[user] = (totals[user] || 0) + amount;
                }
            }


            // Test if audio file exists
            let hasAudio = false;
            try {
                const audioTest = await fetch(mp3Url);
                hasAudio = audioTest.ok;
            } catch (e) {
            }

            // make array
            let donators = Object.keys(totals).map(user => ({
                user,
                amount: totals[user],
                order: order[user],
            }));

            // sort by amount DESC then order ASC
            donators.sort((a, b) => {
                if (b.amount !== a.amount) return b.amount - a.amount;
                return a.order - b.order;
            });

            const donatorHTML = donators.map(d => `
                <div style="
                    padding: 10px 14px;
                    background: #ffe6eb;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 500;
                    color: #c2185b;
                    box-shadow: inset 0 0 4px rgba(0,0,0,0.05);
                    width: fit-content;                    
                    cursor: pointer;
                ">
                ❤️ ${d.user}${d.amount > 0 ? ` &bull; ${d.amount}€` : ''}
                </div>
            `).join('');


            // audio
            const audioHTML = hasAudio
                ? `<audio id="donatorAudio" autoplay loop style="display: none;"><source src="${mp3Url}" type="audio/mpeg"></audio>`
                : '';

            // final final stuff
            const finalHTML = `
                ${audioHTML}
                <a href="http://ko-fi.com/shydevil/tip/" target="_blank"
                style="                
                    display: flex;
                    justify-content: center;
                    width: 100% !important; 
                    margin: 20px 0; 
                    font-size: 24px;
                    font-weight: bold;
                    color: #ffe6eb;
                    text-decoration: none;"
                >
                    » Become a Donator ! «
                </a>
                <div style="
                    max-height: 300px; 
                    max-width: 800px;
                    overflow-y: auto; 
                    margin-top: 20px;
                    margin-bottom: 20px;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    gap: 10px;
                    justify-content: center;
                ">
                    ${donatorHTML || '<i>No donators found.</i>'}
                </div>

                <!-- Some infos -->
                <li class="info" style="margin: 0px 10px;">
                    <span class="bullet"></span>The amount shown is the total of all donations made by the user
                </li>

                 <li class="info" style="margin: 0px 10px;">
                    <span class="bullet"></span>These are project donations, not server donations
                </li>
                
                ${songName ?
                    `
                    <li class="info" style="margin: 0px 10px;">
                        <span class="bullet"></span>Song: ${songName}
                    </li>
                    `
                    :
                    ""
                }
            `;

            customPrompts.showPrompt(
                "Thanks to our Donators ",
                finalHTML,
                () => {
                    manageMusic("fadeOut")
                },
                ["<3", "#c2185b"],
                null,
                null,
                null,
                () => {
                    manageMusic("fadeOut")
                }
            );

            await manageMusic("play", 0.75)

            try {
                if (typeof window[effect] === "function") {
                    stopEffect = window[effect](document.getElementById('promptContainer').querySelector('div'));
                }
            } catch (effectErr) {
                console.log("Effect error");
                console.log(effectErr)
            }

            function manageMusic(action, value) {
                const audio = document.getElementById("donatorAudio");
                if (!audio) return;

                if (action === "stop") {
                    musicToken++;
                    if (stopEffect) stopEffect();
                    UserManager.isLoadingDonators = false;
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 0;
                    return;
                }

                if (action === "play" && value != null) {
                    const token = ++musicToken;
                    return new Promise(async (resolve, reject) => {
                        try {
                            const targetVolume = Math.min(1, Math.max(0, value));
                            audio.volume = 0;
                            await audio.play();

                            const fade = setInterval(() => {
                                if (token !== musicToken) {
                                    clearInterval(fade);
                                    return;
                                }
                                if (audio.volume < targetVolume) {
                                    audio.volume = Math.min(targetVolume, audio.volume + 0.05);
                                } else {
                                    clearInterval(fade);
                                    resolve();
                                }
                            }, 100);
                        } catch (e) {
                            reject(e);
                        }
                    });
                }

                if (action === "fadeOut") {
                    const token = ++musicToken;
                    return new Promise(resolve => {
                        const fade = setInterval(() => {
                            if (token !== musicToken) {
                                clearInterval(fade);
                                return;
                            }
                            if (audio.volume > 0.05) {
                                audio.volume -= 0.05;
                            } else {
                                clearInterval(fade);
                                manageMusic("stop");
                                resolve();
                            }
                        }, 100);
                    });
                }
            }


        } catch (err) {
            customAlerts.showAlert("error", "Could not load donator list: " + err.message);
            console.log(err);
            UserManager.isLoadingDonators = false;
        }
    }

    static async checkPermission(perms, any = false) {
        return new Promise(resolve => {
            socket.emit("checkPermission", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                permission: perms,
                any
            }, function (response) {

                if(response?.permission === "granted"){
                    resolve(true)
                }
                else if(response?.permission === "denied"){
                    resolve(false)
                }

                resolve(response?.permission)
            });
        })
    }


    static doAccountOnboarding(defaultValues = null) {
        customPrompts.showPrompt(
            "Register Account",
            `
            <div style="width: 100%; float :left;">
                <a id="doAccountOnBoardingLoginButton" style="
                    margin-bottom: 60px;
                    display: block; 
                    float: left;
                    font-size: 14px; 
                    font-style: italic;
                    text-align: left; 
                    border-radius: 2px;
                    padding: 6px 12px;
                    color: #34383C;
                    text-decoration: none;
                    cursor: pointer;
                    " 
                onclick="UserManager.doAccountLogin()">Log into existing account</a>
            </div>
            
            <div id="tt_accountOnboardingUserDialog"> <!-- silly lil space helper -->
                <div style="width: 100%;display: block;float: left; margin-right: 100px; margin-bottom: 20px;">
                    
                    <div class="prompt-form-group" id="usernameContainer">
                        <label class="prompt-label" for="username">Display Name</label>
                        <input class="prompt-input" type="text" name="username" id="username" ${UserManager.getUsername() ? `value='${UserManager.getUsername()}'` : ""} placeholder="Enter Display name">
                    </div>
                    <div class="prompt-form-group" id="loginNameContainer">
                        <label class="prompt-label" for="loginName">Login Name</label>
                        <input class="prompt-input" type="text" name="loginName" onkeyup="UserManager.handleLoginNameInput(this)" ${UserManager.getLoginName() ? `value='${UserManager.getLoginName()}'` : ""} id="loginName" placeholder="Enter login name" value="">
                        <label style="color: indianred;" class="prompt-label error-text"></label>
                    </div>
                    <div class="prompt-form-group" id="passwordContainer">
                        <label class="prompt-label" for="password">Password</label>
                        <input class="prompt-input" type="password" name="password" id="password" placeholder="Enter password">
                    </div>
                    <div class="prompt-form-group" id="repeatedPasswordContainer">
                        <label class="prompt-label" for="repeatedPassword">Repeated Password</label>
                        <input class="prompt-input" type="password" name="repeatedPassword" id="repeatedPassword" placeholder="Repeat password">
                    </div>
                </div>
                
                <!--
                <div style="float: left; width: 250px;">
                    <div class="prompt-form-group">
                        <label class="prompt-label" for="profileImage">Profile Image</label>
                        <div class="profile-image-container" id="profileImageContainer" onclick="document.getElementById('profileImage').click()" 
                        ${UserManager.getPFP() ? `style="background-image: url('${UserManager.getPFP()}` : ""}'); background-size: cover;">
                            <img id="profileImagePreview" src="${UserManager.getPFP() ? `${UserManager.getPFP()}` : ""}" alt="Profile Image" class="profile-image-preview">
                        </div>
                        <input class="prompt-input" type="file" name="profileImage" id="profileImage" accept="image/*" style="display: none;" onchange="customPrompts.previewImage(event)">
                    </div>
                    <div class="prompt-form-group">
                        <label class="prompt-label" for="bannerImage">Banner Image</label>
                        <div class="profile-image-container" id="bannerImageContainer" onclick="document.getElementById('bannerImage').click()" style="width: 100% !important; border-radius: 8px !important;${UserManager.getBanner() ? `background-image: url('${UserManager.getBanner()}` : ""}'); background-size: cover;">
                            <img id="bannerImagePreview" src="${UserManager.getBanner() ? `${UserManager.getBanner()}` : ""}" alt="Banner Image" class="profile-image-preview">
                        </div>
                        <input class="prompt-input" type="file" name="bannerImage" id="bannerImage" accept="image/*" style="display: none;" onchange="customPrompts.previewImage(event)">
                    </div>
                </div>-->
            </div>
            `,
            async (values) => {
                console.log('Username:', values.username);
                console.log('Login Name:', values.loginName);
                console.log('Password:', values.password);
                console.log('Repeated Password:', values.repeatedPassword);

                // validate password
                if (values.repeatedPassword !== values.password) {
                    customAlerts.showAlert("error", "Your repeated password is incorrect");
                    UserManager.doAccountOnboarding();
                    return;
                }

                /*
                // check profile picture
                if (values.profileImage) {
                    const profileUrl = await upload(values.profileImage);

                    if (!profileUrl.error) {
                        console.log('Profile Image :', profileUrl.urls);
                        UserManager.setPFP(profileUrl.urls)
                    }
                } else {
                    console.log('No profile image selected.');
                }

                // check banner
                if (values.bannerImage) {
                    const bannerUrl = await upload(values.bannerImage);

                    if (!bannerUrl.error) {
                        console.log('Banner Image :', bannerUrl.urls);
                        UserManager.setBanner(bannerUrl.urls)
                    }
                } else {
                    console.log('No banner image selected.');
                }

                 */

                // check username
                if (values.username) {
                    CookieManager.setCookie("username", values.username, 360);
                } else {
                    await customAlerts.showAlert("error", "Your username was too short");
                    await UserManager.doAccountOnboarding(values);
                    return;
                }

                // check login name
                if (values.loginName) {

                    if (UserManager.validateLoginname(values.loginName)) {
                        CookieManager.setCookie("loginName", values.loginName, 360);
                    } else {
                        await customAlerts.showAlert("error", "Your login name contains illegal characters")
                        await UserManager.doAccountOnboarding(values);
                        return;
                    }
                } else {
                    await customAlerts.showAlert("error", "Your login name was too short");
                    await UserManager.doAccountOnboarding(values);
                    return;
                }


                // resubmit userjoin but with onboarding done
                await userJoined(true, values.password, values.loginName)
            },
            null,
            null,
            null,
            () => {
                doAccountOnboardingTooltip();
            },
            (data) => {
                if(data?.canceled){
                    this.doAccountOnboarding()
                }
            }

        );

        applyHoverEffect(document.getElementById("doAccountOnBoardingLoginButton"), [["black", "gold"], ["black", "white"]])
    }

    static handleLoginNameInput(element) {
        if (!element.value) return;

        if (UserManager.validateLoginname(element.value)) {
            element.parentNode.querySelector(".error-text").innerText = "";
            element.style.border = "1px solid transparent";
        }

        if (!UserManager.validateLoginname(element.value)) {
            element.parentNode.querySelector(".error-text").innerText = "Only supports . | _ | 0-9 | a-z | A-Z";
            element.style.border = "1px solid red";
        }

    }

    static validateLoginname(loginName) {
        const regex = /^[a-zA-Z0-9._]+$/;
        return regex.test(loginName);
    }


    static async requestPublicKey(target) {
        return new Promise((resolve, reject) => {
            socket.emit("getMemberPublicKey", {
                id: UserManager.getID(),
                token: UserManager.getToken(),
                target: target,
            }, async function (response) {
                resolve(response);
            });

        })
    }
}