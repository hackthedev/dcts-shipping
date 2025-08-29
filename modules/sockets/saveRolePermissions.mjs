import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('saveRolePermissions', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.permissions = JSON.parse(xssFilters.inHTMLData(JSON.stringify(member.permissions)))

            if (hasPermission(member.id, "manageRoles")) {
                try {
                    serverconfig.serverroles[member.role].permissions = member.permissions;
                    saveConfig(serverconfig);

                    io.emit("updateMemberList");
                    response({ type: "success", msg: "Role permissions have been updated" });
                }
                catch (e) {
                    Logger.error("Unable to update permissions from role");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
