import { io, saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('updateRoleHierarchy', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageRoles")) {
                try {
                    var sortedRoles = member.sorted.reverse();

                    for (let i = 0; i < sortedRoles.length; i++) {
                        var roleId = sortedRoles[i];
                        serverconfig.serverroles[roleId].info.sortId = i;
                    }

                    saveConfig(serverconfig);
                    response({ type: "success", msg: "Role was updated successfully" });
                }
                catch (e) {
                    Logger.error("Unable to sort roles");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
