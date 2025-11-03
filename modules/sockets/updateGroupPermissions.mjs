import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import { saveChatMessage } from "../functions/io.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateGroupPermissions', function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {

            if (!hasPermission(member.id, "manageGroups")) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                            "title": "Missing permissions!",
                            "message": "You arent allowed to change the group permissions",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                            "popup_type": "confirm"
                        }`));
                return;
            }

            try {

                var groupPerms = xssFilters.inHTMLData(JSON.stringify(member.perms));
                var groupId =  xssFilters.inHTMLData(member.groupId);
                var role =  xssFilters.inHTMLData(member.roleId);

                serverconfig.groups[groupId].permissions[role] = JSON.parse(groupPerms);
                saveConfig(serverconfig);

                io.emit("updateGroupList");
                io.emit("receiveChannelTree");
                response({ type: "success", msg: "Group Permissions Updated" });

            }
            catch (e) {
                Logger.error("Couldnt update group permissions");
                Logger.error(e);

                response({ type: "error", msg: "Unable to update group permissions" });
            }
        }
    });

}
