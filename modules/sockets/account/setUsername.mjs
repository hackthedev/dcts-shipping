import { io, saveConfig, serverconfig, xssFilters } from "../../../index.mjs";
import { copyObject, escapeHtml, limitString, sendMessageToUser, validateMemberId } from "../../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('setUsername', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            serverconfig.servermembers[member.id].name = escapeHtml(limitString(member.username, 30));
            saveConfig(serverconfig);
            io.emit("updateMemberList");
        }
    });

}
