import { io, serverconfig, xssFilters } from "../../../index.mjs";
import { hasPermission } from "../../functions/chat/main.mjs";
import Logger from "../../functions/logger.mjs";
import { copyObject, escapeHtml, limitString, sendMessageToUser, validateMemberId } from "../../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('setStatus', async function (member) {
        if (await validateMemberIdmember?.id, socket, member?.token) === true) {

            serverconfig.servermembers[member.id].status = escapeHtml(limitString(member.status, 100));
            saveConfig(serverconfig);
            
            io.emit("updateMemberList");
        }
    });
}
