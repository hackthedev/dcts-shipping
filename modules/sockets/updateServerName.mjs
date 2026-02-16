import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, limitString, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateServerName', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (hasPermission(member.id, "manageServerInfo")) {
                Logger.warn(`Changing servername from ${serverconfig.serverinfo.name} to ${escapeHtml(limitString(member.value, 300))}`);
                
                serverconfig.serverinfo.name = member.value;
                saveConfig(serverconfig);

                response({ type: "success", msg: "Server was successfully renamed" });
            }
            else {
                response({ type: "error", msg: "You cant change the server name: Missing permissions" });
            }
        }
    });
}
