import { saveConfig } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "@hackthedev/terminal-logger";
import { escapeHtml, limitString, validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('updateServerDesc', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {

            if (await hasPermission(member.id, "manageServerInfo")) {
                Logger.warn(`Changing server description from ${serverconfig.serverinfo.description} to ${escapeHtml(limitString(member.value, 500))}`, "Debug");
                
                serverconfig.serverinfo.description = member.value;
                saveConfig(serverconfig);

                response({ type: "success", msg: "Server description was successfully changed" });
            }
            else {
                response({ type: "error", msg: "You cant change the server description: Missing permissions" });
            }
        }
    });
}
