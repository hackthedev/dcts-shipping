import { saveConfig, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateRoleAppearance', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageRoles")) {
                try {
                    serverconfig.serverroles[member.roleId].info.name = member.data.info.name;
                    serverconfig.serverroles[member.roleId].info.color = member.data.info.color;
                    serverconfig.serverroles[member.roleId].info.displaySeperate = member.data.info.displaySeperate;

                    saveConfig(serverconfig);
                    response({ type: "success", msg: "Role was updated successfully" });

                    // Update to everyone and yourself
                    io.emit("updateMemberList");
                    io.to(usersocket[member.id]).emit("updateMemberList");
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
