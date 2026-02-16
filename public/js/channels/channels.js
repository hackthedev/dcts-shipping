document.addEventListener("DOMContentLoaded", function () {

    // Create Category
    ContextMenu.registerContextMenu(
        "channellist_categories",
        [
            "#channeltree",
        ],
        [
            {
                icon: "&#10022;",
                text: "Create Category",
                callback: async (data) => {
                    AdminActions.createCategory();
                },
                condition: async (data) => {
                    return await (await checkPermission("manageChannels")).permission === "granted"
                },
                type: "success"
            },

        ])

    // Editing categories
    ContextMenu.registerContextMenu(
        "channellist_categories_edit",
        [
            "#channeltree .categoryTrigger",
        ],
        [
            {
                icon: "&#10022;",
                text: "Create Channel",
                callback: async (data) => {
                    let categoryId = getCategoryIdFromElement(data.element);
                    if(!categoryId){
                        alert("not found")
                        console.error("Cant create channel in category because couldnt find category id from element");
                        return;
                    }
                    AdminActions.createChannel(categoryId);
                },
                condition: async (data) => {
                    return await (await checkPermission("manageChannels")).permission === "granted"
                },
                type: "success"
            },
            /*{
                icon: "&#10022;",
                text: "Edit Category",
                callback: async (data) => {
                    AdminActions.createCategory();
                },
                condition: async (data) => {
                    return await (await checkPermission("manageChannels")).permission === "granted"
                },
                type: "ok"
            },*/
            {
                icon: "&#128465;",
                text: "Delete Category",
                callback: async (data) => {
                    let categoryId = getCategoryIdFromElement(data.element);
                    if(!categoryId){
                        console.error("Cant delete category because couldnt find category id from element");
                        return;
                    }

                    AdminActions.deleteCategory(categoryId);
                },
                condition: async (data) => {
                    return await (await checkPermission("manageChannels")).permission === "granted"
                },
                type: "error"
            },

        ])

    // Editing Channels
    ContextMenu.registerContextMenu(
        "channellist_categories_channels",
        [
            "#channeltree .channelTrigger",
        ],
        [
            {
                icon: "&#9998;",
                text: "Edit Channel",
                callback: async (data) => {
                    let channelId = getChannelIdFromElement(data.element);
                    if(!channelId){
                        console.error("Cant edit channel because couldnt find channel id from element");
                        return;
                    }
                    AdminActions.editChannel(channelId);
                },
                condition: async (data) => {
                    return await (await checkPermission("manageChannels")).permission === "granted"
                },
                type: "ok"
            },
            {
                icon: "&#10022;",
                text: "Copy Invite Link",
                callback: async (data) => {
                    let element = data?.element;
                    console.log(element)
                    let channelId = element?.getAttribute("data-channel-id");
                    let categoryId = element?.getAttribute("data-category-id");
                    if(!channelId || !categoryId){
                        console.warn("Couldnt get copy link because channel or category wasnt found", categoryId, channelId)
                        return;
                    }

                    navigator.clipboard.writeText(`${window.location.origin}?group=${UserManager.getGroup()}&category=${categoryId}&channel=${channelId}`);
                },
                condition: async (data) => {
                    return await (await checkPermission("manageChannels")).permission === "granted"
                },
                type: "success"
            },
            {
                icon: "&#10022;",
                text: "Set as default channel",
                callback: async (data) => {
                    let channelId = getChannelIdFromElement(data.element);
                    if(!channelId){
                        console.error("Cant set default channel because couldnt find channel id from element");
                        return;
                    }
                    AdminActions.setDefaultChannel(channelId);
                },
                condition: async (data) => {
                    return await (await checkPermission("manageChannels")).permission === "granted"
                },
                type: "success"
            },
            {
                icon: "&#128465;",
                text: "Delete Channel",
                callback: async (data) => {
                    let channelId = getChannelIdFromElement(data.element);
                    if(!channelId){
                        console.error("Cant delete channel because couldnt find channel id from element");
                        return;
                    }
                    AdminActions.deleteChannel(channelId);
                },
                condition: async (data) => {
                    return await (await checkPermission("manageChannels")).permission === "granted"
                },
                type: "error"
            },

        ])
});

function getCategoryIdFromElement(element){
    return element.getAttribute("data-category-id");
}

function getChannelIdFromElement(element){
    return element.getAttribute("data-channel-id");
}
