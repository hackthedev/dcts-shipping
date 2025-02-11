import { io, saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on("saveRateSettings", function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageRateSettings")) {
                try {
                    serverconfig.serverinfo.rateLimit = member.newRateLimit;
                    serverconfig.serverinfo.dropInterval = member.newDropInterval;
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Settings saved successfully." })
                }
                catch (error) {
                    response({ type: "error", msg: "Server couldnt save rate settings: " + error })
                }
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage the rate settings" })
            }
        }
    });
}
