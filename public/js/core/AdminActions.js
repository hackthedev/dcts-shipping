class AdminActions {
    static changeGroupIcon(id) {
        let currentIcon = document.querySelector(`img.server-icon.group-icon-${id}`).src;
        customPrompts.showPrompt(
            "Change Group Icon",
            `
                <div style="margin: 20px 0;">
                    <div class="prompt-form-group">
                        <label class="prompt-label" for="profileImage">Profile Image</label>
                        <div class="profile-image-container" id="profileImageContainer" onclick="document.getElementById('profileImage').click()" 
                        ${currentIcon ? `style="background-image: url('${currentIcon}` : ""}');">
                            <img id="profileImagePreview" src="${currentIcon ? `${currentIcon}` : ""}" alt="Profile Image" class="profile-image-preview">
                        </div>
                        <input class="prompt-input" type="file" name="profileImage" id="profileImage" accept="image/*" style="display: none;" onchange="customPrompts.previewImage(event)">
                    </div>
                </div>

                <li class="prompt-note">Click to choose a image and upload it automatically</li>
                <li class="prompt-note">Changes will apply upon pressing "Save"</li>
                `,

            async (values) => {
                let homeBannerUrl = "";

                // check banner and upload new one
                if (values.profileImage) {
                    const bannerUrl = await upload(values.profileImage);

                    if (!bannerUrl.error) {
                        console.log('Banner Image :', bannerUrl.urls);
                        homeBannerUrl = bannerUrl.urls;

                        socket.emit("updateGroupIcon", { id: UserManager.getID(), value: homeBannerUrl, token: UserManager.getToken(), group: id });
                    }
                }
            },
            ["Save", null],
            false,
            400
        );
    }

    static changeGroupBanner() {
        let currentBanner = document.querySelector(`#serverbanner-image`).src;

        customPrompts.showPrompt(
            "Change Group Banner",
            `
          <div style="margin: 20px 0;">
             <div class="prompt-form-group">
                  <label class="prompt-label" for="bannerImage">Banner Image</label>

                  <div class="profile-image-container" id="bannerImageContainer" onclick="document.getElementById('bannerImage').click()" style="width: 300px; height: 160px; !important; border-radius: 8px !important;${currentBanner ? `background-image: url('${currentBanner}` : ""}');">
                      <img id="bannerImagePreview" src="${currentBanner ? `${currentBanner}` : ""}" alt="Banner Image" class="profile-image-preview">
                  </div>
                  <input class="prompt-input" type="file" name="bannerImage" id="bannerImage" accept="image/*" style="display: none;" onchange="customPrompts.previewImage(event)">
              </div>
          </div>

          <li class="prompt-note">Click to choose a image and upload it automatically</li>
          <li class="prompt-note">Changes will apply upon pressing "Save"</li>
        `,

            async (values) => {
                let homeBannerUrl = "";

                // check banner and upload new one
                if (values.bannerImage) {
                    const bannerUrl = await upload(values.bannerImage);

                    if (!bannerUrl.error) {
                        console.log('Banner Image :', bannerUrl.urls);
                        homeBannerUrl = bannerUrl.urls;

                        socket.emit("updateGroupBanner", { id: UserManager.getID(), value: homeBannerUrl, token: UserManager.getToken(), group: UserManager.getGroup() });
                    }
                }
            },
            ["Save", null]
        );
    }

    static createGroup() {
        var catname = prompt("Group Name:");

        if (catname == null || catname.length <= 0) {
            return;
        }
        else {
            socket.emit("createGroup", { id: UserManager.getID(), value: catname, token: UserManager.getToken() });
        }
    }

    static editServer() {
        window.location.href = "settings/server/";
    }

    static sortChannels() {
        window.location.href = "/settings/server/?page=channeltree-sorting";
    }

    static editGroup(id) {
        window.location.href = "/settings/group?id=" + id;
    }

    static editChannel(channelId) {
        window.location.href = `/settings/channel?id=${channelId}`;
    }

    static createCategory() {

        customPrompts.showPrompt(
            "Create Category",
            `
        <div class="prompt-form-group">
            <label class="prompt-label" for="channelName">Category Name</label>
            <input class="prompt-input" type="text" id="tt_categoryCreateDialog_categoryName" name="categoryName" placeholder="Enter a category name">
        </div>
        `,
            (values) => {

                socket.emit("createCategory", {
                    id: UserManager.getID(),
                    value: values.categoryName,
                    token: UserManager.getToken(),
                    group: UserManager.getGroup().replace("group-", ""),
                }, function (response) {
                    showSystemMessage({
                        title: response.msg,
                        text: "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: 1000
                    });
                });
            },
            ["Create", "success"],
            false,
            250
        );
    }

    static deleteChannel(id) {

        customPrompts.showConfirm(
            "Do you want to delete the channel?",
            [["Yes", "success"], ["No", "error"]],
            (selectedOption) => {

                if (selectedOption == "yes") {

                    socket.emit("deleteChannel", { id: UserManager.getID(), token: UserManager.getToken(), channelId: id, group: UserManager.getGroup().replace("group-", "") }, function (response) {
                        showSystemMessage({
                            title: response.msg,
                            text: "",
                            icon: response.type,
                            img: null,
                            type: response.type,
                            duration: 1000
                        });
                    });
                }
            }
        )
    }

    static deleteGroup(groupid) {
        customPrompts.showConfirm(
            "Do you want to delete the group?",
            [["Yes", "success"], ["No", "error"]],
            (selectedOption) => {

                if (selectedOption == "yes") {

                    // TODO: Improve using response
                    socket.emit("deleteGroup", { id: UserManager.getID(), token: UserManager.getToken(), group: groupid });
                }
            }
        )

    }

    static deleteCategory(id) {
        customPrompts.showConfirm(
            "Do you want to delete the category?",
            [["Yes", "success"], ["No", "error"]],
            (selectedOption) => {

                if (selectedOption == "yes") {

                    socket.emit("deleteCategory", { id: UserManager.getID(), token: UserManager.getToken(), group: UserManager.getGroup(), category: id }, function (response) {
                        showSystemMessage({
                            title: response.msg,
                            text: "",
                            icon: response.type,
                            img: null,
                            type: response.type,
                            duration: 1000
                        });
                    });
                }
            }
        )
    }

    static setDefaultChannel(channelId) {
        customPrompts.showConfirm(
            "Set as default channel?",
            [["Yes", "success"], ["No", "error"]],
            (selectedOption) => {

                if (selectedOption == "yes") {

                    socket.emit("setDefaultChannel", { id: UserManager.getID(), token: UserManager.getToken(), value: channelId.replace("channel-", "") }, function (response) {
                        showSystemMessage({
                            title: response.msg,
                            text: "",
                            icon: response.type,
                            img: null,
                            type: response.type,
                            duration: 1000
                        });
                    });
                }
            }
        )
    }


    static createChannel(category) {
        customPrompts.showPrompt(
            "Create a channel",
            `
        <div class="prompt-form-group">
            <label class="prompt-label" for="channelName">Channel Name</label>
            <input class="prompt-input" type="text" id="tt_channelCreateDialog_channelName" name="channelName" placeholder="Enter channel name">
        </div>
        <div class="prompt-form-group">
            <label class="prompt-label">Channel Type</label>
            <div style="display: flex; gap: 10px;" id="tt_channelCreateDialog_channelType">
                <div class="prompt-click-select" onclick="customPrompts.handleSelect(this, 'text')">
                    <p>Text</p>
                </div>
                <div class="prompt-click-select" onclick="customPrompts.handleSelect(this, 'voice')">
                    <p>Voice</p>
                </div>
            </div>
        </div>
        `,
            (values) => {
                socket.emit("createChannel", {
                    id: UserManager.getID(),
                    value: values.channelName,
                    type: values.selected,
                    token: UserManager.getToken(),
                    group: UserManager.getGroup().replace("group-", ""),
                    category: category.replace("category-", "")
                }, function (response) {
                    showSystemMessage({
                        title: response.msg,
                        text: "",
                        icon: response.type,
                        img: null,
                        type: response.type,
                        duration: 1000
                    });
                });
            },
            ["Create", "success"],
            false,
            250,
            () => {
                tooltipSystem.clearTooltipLocalStorage("tt_channelCreateDialog_")
                createChannelTooltip()
            }
        );


        createChannelTooltip()
    }
}