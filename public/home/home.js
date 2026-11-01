async function renderHome() {
    ChatManager.setUrl("/home")
    MobilePanel.close()

    // get server info and clear the html in case its being re-rendered
    let server = await ChatManager.getServerInfo(true);
    let serverinfo = server?.serverinfo ?? null;
    let contactData = serverinfo?.instance?.contact

    let shortRedditUrl = `r/${contactData?.reddit?.split("/r/")[1]}`;
    let shortGithubUrl = `${contactData?.github?.split(".com/")[1]}`;
    let shortDiscordUrl = `gg/${contactData?.discord?.split(".gg/")[1]}`;

    let hasAnyContactInfos = Object.values(contactData).filter(value =>
                                            typeof value === "object" && value !== null
                                                ? Object.values(value).some(v => String(v ?? "").trim().length > 0)
                                                : String(value ?? "").trim().length > 0
                                        ).length;

    getContentElement().innerHTML = "";
    getContentElement().insertAdjacentHTML('beforeend',
        `
            <div class="site-banner">            
                <div class="edit-icon" data-ignore-img-error="true" onclick="editHero()">${ICONS.edit}</div>
                <div class="content">
                    <p class="title" data-text="{{server.name}}">${serverinfo?.name ?? ""}</p>
                    <p class="subtitle" data-text="{{server.description}}">${serverinfo?.description ?? ""}</p>  
                </div>
                <img src="${serverinfo?.banner ?? ""}" data-ignore-img-error="true">
            </div>
           
            <div class="home-container">            
                <img class="home-icon" src="${serverinfo?.icon ?? ""}" data-ignore-img-error="true">
                <div class="about">
                    <div class="edit-icon dark" onclick="editHeroAbout()">${ICONS.edit}</div>
                    <div class="about-content">
                        ${serverinfo?.about ?? "No About."}
                    </div>
                </div>
                
                <div class="info">                 
                    
                    <div class="public-key">
                        <label class="hint-label" style="margin: 0;">Server Public Key</label>                    
                        <div class="details">                        
                            <div class="qr-code"></div>
                            
                            <div class="plain">
                                <pre>${serverinfo.public_key}</pre>
                            </div>
                        </div>
                        
                    </div>
                    
                     <div class="contact">                
                       <label class="hint-label" style="margin: 0;">Contact Information</label>     
                       <ul style="padding-left: 20px;line-height: 1.5;">
                            ${contactData.email ? `<li>Email: <a href=mailto:"${contactData.email}" target="_blank">${contactData.email}</a></li>` : ""}
                            ${contactData.website ? `<li>Website: <a href="${contactData.website}" target="_blank">${contactData.website}</a></li>` : ""}
                            ${contactData.reddit ? `<li>Reddit: <a href="${contactData.reddit}" target="_blank">${shortRedditUrl}</a></li>` : ""}
                            ${contactData.github ? `<li>Github: <a href="${contactData.github}" target="_blank">${shortGithubUrl}</a></li>` : ""}
                            ${contactData.discord ? `<li>Discord: <a href="${contactData.discord}" target="_blank">${shortDiscordUrl}</a></li>` : ""}
                            ${contactData.signal ? `<li>Signal: ${contactData.signal}</li>` : ""}
                            ${hasAnyContactInfos ? "" : "<li>None available</li>"}
                        </ul>    
                    </div>
                </div>
            </div>
        `
    )


    new QRCode(getContentElement().querySelector(".public-key .qr-code"), {
        text: serverinfo.public_key,
        correctLevel: QRCode.CorrectLevel.L,
        typeNumber: 40,
    })

    markNavigationButton("home")
}

function markNavigationButton(name){
    getNavContainer()?.querySelectorAll(`.entry`).forEach(x => {
        if(x.classList.contains("selected")) x.classList.remove("selected");
    })

    getNavContainer()?.querySelector(`.entry[data-name='${name}']`).classList.add("selected");
}

function registerHomeContextMenu() {
    ContextMenu.registerContextMenu(
        "serverbanner", // random ass unique name
        [
            "#serverbanner-image" // id or classname. if class start with .
        ],
        [ // ur context items
            {
                icon: "&#9998;",
                text: "Change banner",
                callback: async () => { // what happens on click
                    AdminActions.changeGroupBanner()
                },
                condition: async () => { // condition. can be completely removed
                    return await (await checkPermission("manageGroups")).permission === "granted"
                },
                type: "ok"
            },
            {
                icon: "&#10022;",
                text: "Manage server",
                callback: async () => {
                    AdminActions.editServer()
                },
                condition: async () => {
                    return await (await checkPermission(["manageServer",
                        "manageGroups",
                        "manageChannels",
                        "manageUploads",
                        "manageGroups",
                        "viewLogs",
                        "manageEmojis",
                        "manageBans",
                        "manageServerInfo",
                        "manageRateSettings"], true)).permission === "granted"
                },
                type: "success"
            }
        ])
}


function editHero() {

    let currentHeroTitle = getSiteBannerElement().querySelector(".title").innerHTML;
    let currentHeroSubTitle = getSiteBannerElement().querySelector(".subtitle").innerHTML;
    let currentBannerSrc = getSiteBannerElement().querySelector("img").src;
    let currentIconSrc = getSiteIconElement()?.src;

    customPrompts.showPrompt(
        "Edit Home",
        `
          
            <div class="prompt-form-group">
                <label class="prompt-label">Title</label>
                <input type="text" class="prompt-input" name="homeTitle" value="${currentHeroTitle}">
            </div>

            <div class="prompt-form-group">
                <label class="prompt-label">Subtitle</label>
                <input type="text" class="prompt-input" name="homeSubtitle" value="${currentHeroSubTitle}">
            </div>
            
            <div class="prompt-form-group">
                  <label class="prompt-label" for="iconImage">Icon Image</label>
    
                  <div class="profile-image-container" id="iconImageContainer" onclick="document.getElementById('iconImage').click()" style="width: 120px; height: 120px; !important; border-radius: 50% !important;${currentIconSrc ? `background-image: url('${currentIconSrc}` : ""}'); background-size: cover;">
                      <img id="iconImagePreview" src="${currentBannerSrc ? `${currentBannerSrc}` : ""}" alt="Icon Image" class="profile-image-preview">
                  </div>
                  <input class="prompt-input" type="file" name="iconImage" id="iconImage" accept="image/*" style="display: none;" onchange="customPrompts.previewImage(event)">
              </div>

            <div class="prompt-form-group">
                  <label class="prompt-label" for="bannerImage">Banner Image</label>
    
                  <div class="profile-image-container" id="bannerImageContainer" onclick="document.getElementById('bannerImage').click()" style="width: 100% !important; border-radius: 8px !important;${currentBannerSrc ? `background-image: url('${currentBannerSrc}` : ""}'); background-size: cover;">
                      <img id="bannerImagePreview" src="${currentBannerSrc ? `${currentBannerSrc}` : ""}" alt="Banner Image" class="profile-image-preview">
                  </div>
                  <input class="prompt-input" type="file" name="bannerImage" id="bannerImage" accept="image/*" style="display: none;" onchange="customPrompts.previewImage(event)">
              </div>

          <li class="prompt-note">Click to choose a image and upload it automatically</li>
          <li class="prompt-note">Changes will apply upon pressing "Save"</li>
        `,

        async (values) => {

            let homeTitle = values.homeTitle;
            let homeSubtitle = values.homeSubtitle;
            let homeBannerUrl = "";
            let homeIconUrl = "";

            // check banner and upload new one
            if (values.bannerImage) {
                const bannerUrl = await ChatManager.uploadFile(values.bannerImage);
                console.log(bannerUrl)
                if (!bannerUrl.error) {
                    console.log('Banner Image :', bannerUrl.path);
                    homeBannerUrl = bannerUrl.path;
                }
            }

            // check icon and upload new one
            if (values.iconImage) {
                const iconUrl = await ChatManager.uploadFile(values.iconImage);
                console.log(iconUrl)
                if (!iconUrl.error) {
                    console.log('Icon Image :', iconUrl.path);
                    homeIconUrl = iconUrl.path;
                }
            }

            socket.emit("saveServerInfo", {
                token: UserManager.getToken(), id: UserManager.getID(),
                serverinfo: {
                    banner: homeBannerUrl,
                    name: values.homeTitle,
                    description: values.homeSubtitle,
                    icon: homeIconUrl
                }
            }, async (response) => {
                if (response?.error) {
                    showSystemMessage({
                        title: response?.title || response?.error || "",
                        text: response.msg || response.error || "",
                        icon: response.type,
                        img: null,
                        type: "error",
                        duration: response.displayTime || 3000
                    });
                }

                renderHome()
            });
        },
        ["Save", null],
        false,
        400
    );
}

function editHeroAbout() {
    let currentServerAbout = getContentElement().querySelector(".home-container .about .about-content").innerHTML;
    if(!currentServerAbout) throw new Error("No home element found")

    customPrompts.showPrompt(
        "Edit Home",
        `
          <div style="margin: 20px 0;">
            <label class="prompt-label">About</label>
            <textarea rows=10 type="text" class="prompt-input" name="homeAbout" >${currentServerAbout}</textarea
          </div>         
        `,

        async (values) => {

            // convert plain text back to html.
            // would be hard to edit if already rendered as html am i right
            let homeAbout = values.homeAbout;

            socket.emit("saveServerInfo", {
                token: UserManager.getToken(), id: UserManager.getID(),
                serverinfo: {
                    home: {
                        about: homeAbout
                    }
                }
            }, (response) => {
                if (response?.error) {
                    showSystemMessage({
                        title: response.title || response.error || "",
                        text: response.msg || response.error || "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: response.displayTime || 3000
                    });

                    return;
                }

                renderHome();

            });
        },
        ["Save", null],
        false,
        400
    );
}
