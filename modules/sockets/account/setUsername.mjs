import { io, saveConfig, serverconfig, xssFilters } from "../../../index.mjs";
import { copyObject, escapeHtml, limitString, sendMessageToUser, validateMemberId } from "../../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('setUsername', async function (member) {
        if (await validateMemberIdmember.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            serverconfig.servermembers[member.id].name = escapeHtml(limitString(member.username, 30));
            saveConfig(serverconfig);
            io.emit("updateMemberList");
        }
    });

}
