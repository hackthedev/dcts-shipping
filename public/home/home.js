async function renderHome() {
    registerHomeContextMenu();

    // get server info and clear the html in case its being re-rendered
    let server = await getServerInfo();
    getContentElement().innerHTML = "";

    getContentElement().insertAdjacentHTML('beforeend',
        `
            <div class="site-banner">            
                <div class="editBannerIcon" onclick="editHero()">${ICONS.edit}</div>
                <div class="content">
                    <p class="title" data-text="{{server.home.title}}">${server?.serverinfo?.home?.title ?? ""}</p>
                    <p class="subtitle" data-text="{{server.home.subtitle}}">${server?.serverinfo?.home?.subtitle ?? ""}</p>  
                </div>
                <img src="${server?.serverinfo?.home?.banner_url ?? ""}">
            </div>
            
            <div class="about">
                ${server?.serverinfo?.home?.about}
            </div>
        `
    )

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

            // check banner and upload new one
            if (values.bannerImage) {
                const bannerUrl = await upload(values.bannerImage);

                if (!bannerUrl.error) {
                    console.log('Banner Image :', bannerUrl.urls);
                    homeBannerUrl = bannerUrl.urls;
                }
            }

            socket.emit("saveServerInfo", {
                token: UserManager.getToken(), id: UserManager.getID(),
                serverinfo: {
                    home: {
                        banner_url: homeBannerUrl,
                        title: values.homeTitle,
                        subtitle: values.homeSubtitle
                    }
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
    customPrompts.showPrompt(
        "Edit Home",
        `
          <div style="margin: 20px 0;">
            <label class="prompt-label">About</label>
            <textarea rows=10 type="text" class="prompt-input" name="homeAbout" >${CONFIG.aboutHtml}</textarea
          </div>         
        `,

        async (values) => {

            // convert plain text back to html.
            // would be hard to edit if already rendered as html am i right
            let homeAbout = values.homeAbout;

            socket.emit("updateHeroAbout", {
                token: UserManager.getToken(), id: UserManager.getID(),
                about: homeAbout
            }, (response) => {

                if (response?.type !== "success") {
                    showSystemMessage({
                        title: response.title || "",
                        text: response.msg || response.error || "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: response.displayTime || 3000
                    });

                    return;
                }

                // about
                if (homeAbout) {
                    CONFIG.aboutHtml = homeAbout;
                }

                showServerHome();

            });
        },
        ["Save", null],
        false,
        400
    );
}
