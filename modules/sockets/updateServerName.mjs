
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "@hackthedev/terminal-logger";
import { escapeHtml, limitString, validateMemberId } from "../functions/main.mjs";
import {saveConfig, serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateServerName', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {

            if (await hasPermission(member.id, "manageServerInfo")) {
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
