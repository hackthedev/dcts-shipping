import { escapeHtml, limitString, validateMemberId } from "../../functions/main.mjs";
import {serverconfig} from "../../functions/init/config.mjs";
import {saveConfig} from "../../../index.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('setStatus', async function (member) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {

            serverconfig.servermembers[member.id].status = escapeHtml(limitString(member.status, 100));
            saveConfig(serverconfig);
            
            io.emit("updateMemberList");
        }
    });
}
