document.addEventListener("DOMContentLoaded", function () {

    // Create Category
    ContextMenu.registerContextMenu(
        "channellist_groups_create",
        [
            "#serverlist",
        ],
        [
            {
                icon: "&#10022;",
                text: "Create Group",
                callback: async (data) => {
                    AdminActions.createGroup();
                },
                condition: async (data) => {
                    return await (await checkPermission("manageGroups")).permission === "granted"
                },
                type: "success"
            }
        ])


    // Create Category
    ContextMenu.registerContextMenu(
        "channellist_groups",
        [
            "#serverlist .server-icon",
        ],
        [
            {
                icon: "&#10022;",
                text: "Manage server",
                callback: async () => {
                    AdminActions.editServer()
                },
                condition: async() => {
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
            },
            {
                icon: "&#9998;",
                text: "Change Icon",
                callback: async (data) => {
                    let groupId = getGroupIdFromElement(data.element);
                    AdminActions.changeGroupIcon(groupId);
                },
                condition: async (data) => {
                    let groupId = getGroupIdFromElement(data.element);
                    if(!groupId){
                        console.error("Cant change  group icon because cant get group id from element")
                        return;
                    }
                    return await UserManager.checkPermission("manageGroups") === true
                },
                type: "ok"
            },
            {
                icon: "&#9998;",
                text: "Edit Group",
                callback: async (data) => {
                    let groupId = getGroupIdFromElement(data.element);
                    AdminActions.editGroup(groupId);
                },
                condition: async (data) => {
                    let groupId = getGroupIdFromElement(data.element);
                    if(!groupId){
                        console.error("Cant edit group because cant get group id from element")
                        return;
                    }
                    return await (await checkPermission("manageGroups")).permission === "granted"
                },
                type: "ok"
            },
            {
                icon: "&#128465;",
                text: "Delete Group",
                callback: async (data) => {
                    let groupId = getGroupIdFromElement(data.element);
                    AdminActions.deleteGroup(groupId);
                },
                condition: async (data) => {
                    let groupId = getGroupIdFromElement(data.element);
                    if(!groupId){
                        console.error("Cant change  group icon because cant get group id from element")
                        return;
                    }
                    return await (await checkPermission("manageGroups")).permission === "granted"
                },
                type: "error"
            },
            {
                text: "Redeem Key",
                callback: async (data) => {
                    redeemKey();
                },
                condition: async (data) => {
                    return await (await checkPermission("redeemKey")).permission === "granted"
                }
            },
        ])
});

function getGroupIdFromElement(element){
    return element?.getAttribute("data-group-id");
}