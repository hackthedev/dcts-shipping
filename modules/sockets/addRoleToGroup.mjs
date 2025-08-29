import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('addRoleToGroup', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageGroups")) {
                try {
                    serverconfig.groups[member.group].permissions[member.role] = JSON.parse(
                        `
                            {
                                "viewGroup": 1
                            }
                            `
                    )
                    saveConfig(serverconfig);
                    response({ type: "success", msg: "Role was successfully added to the group" });
                }
                catch (e) {
                    Logger.error("Unable to add role to group");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
