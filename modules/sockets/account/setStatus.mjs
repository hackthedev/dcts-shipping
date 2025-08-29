import { io, serverconfig, xssFilters } from "../../../index.mjs";
import { hasPermission } from "../../functions/chat/main.mjs";
import Logger from "../../functions/logger.mjs";
import { copyObject, escapeHtml, limitString, sendMessageToUser, validateMemberId } from "../../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('setStatus', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            serverconfig.servermembers[member.id].status = escapeHtml(limitString(member.status, 100));
            saveConfig(serverconfig);
            
            io.emit("updateMemberList");
        }
    });
}
