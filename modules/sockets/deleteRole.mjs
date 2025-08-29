import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('deleteRole', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageRoles")) {
                try {

                    if (serverconfig.serverroles[member.roleId].info.deletable == 1) {
                        delete serverconfig.serverroles[member.roleId];
                        saveConfig(serverconfig);

                        response({ type: "success", msg: "The role has been successfully deleted" });
                    }
                    else {
                        response({ type: "error", msg: "This role cant be deleted" });
                    }
                }
                catch (e) {
                    Logger.error("Unable to delete role");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
        else {
            Logger.error("Token or ID incorrect");
        }
    });
}
