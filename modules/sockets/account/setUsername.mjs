import { saveConfig } from "../../../index.mjs";
import { escapeHtml, limitString, validateMemberId } from "../../functions/main.mjs";
import {serverconfig} from "../../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('setUsername', async function (member) {
        if (await validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            serverconfig.servermembers[member.id].name = escapeHtml(limitString(member.username, 30));
            saveConfig(serverconfig);
            io.emit("updateMemberList");
        }
    });

}
