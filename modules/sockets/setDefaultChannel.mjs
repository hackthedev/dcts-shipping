import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission, resolveChannelById } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('setDefaultChannel', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (hasPermission(member.id, "manageServer")) {

                // Try to resolve channel first to see if it even exists
                let channel = resolveChannelById(member.value);
            
                // Couldnt find channel
                if (channel == null) {
                    Logger.error(colors.red(`Channel with ID '${member.value}' wasnt found`))
                    response({ type: "error", msg: `Channel with ID '${member.value}' wasnt found` });
                    return;
                }

                serverconfig.serverinfo.defaultChannel = escapeHtml(member.value);
                saveConfig(serverconfig);

                response({ type: "success", msg: "Default Channel was successfully set" });
            }
            else {
                response({ type: "error", msg: "You cant change the server name: Missing permissions" });
            }
        }
    });
}
