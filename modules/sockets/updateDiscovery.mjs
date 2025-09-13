import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    copyObject,
    escapeHtml,
    limitString,
    sanitizeInput,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateDiscovery', function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true){

            if (hasPermission(member.id, "manageServer")) {
                
                serverconfig.serverinfo.discovery.enabled = member.enabled
                serverconfig.serverinfo.discovery.hosts = member.hosts;
                saveConfig(serverconfig);

                response({ type: "success", msg: "Discovery was successfully updated" });
            }
            else {
                response({ type: "error", msg: "You cant change the server discovery: Missing permissions" });
            }
        }
    });
}
