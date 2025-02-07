class AdminActions {
    static changeGroupIcon(id) {
        var catname = prompt("Group Icon URL:");

        if (catname == null || catname.length <= 0) {
            return;
        }
        else {
            socket.emit("updateGroupIcon", { id: UserManager.getID(), value: catname, token: UserManager.getToken(), group: id });
        }
    }

    static changeGroupBanner() {
        var catname = prompt("Group Banner URL:");

        if (catname == null || catname.length <= 0) {
            return;
        }
        else {
            socket.emit("updateGroupBanner", { id: UserManager.getID(), value: catname, token: UserManager.getToken(), group: UserManager.getGroup() });
        }
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
        window.location.href = "/settings/channel?id=" + channelId;
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