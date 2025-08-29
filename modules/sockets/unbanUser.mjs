import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('unbanUser', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.duration = xssFilters.inHTMLData(member.duration)

            if (hasPermission(member.id, "manageBans")) {
                try {
                    serverconfig.servermembers[member.target].isBanned = 0;
                    delete serverconfig.banlist[member.target];
                    saveConfig(serverconfig);
                    
                    response({ type: "success", msg: `The user ${serverconfig.servermembers[member.target].name} has been unbanned` });
                }
                catch (e) {
                    response({ type: "error", msg: `User couldnt be unbanned` });
                    consolas("Unable to resolve member".red);
                    console.log(e);
                }
            }
            else {
                response({ type: "error", msg: "You arent allowed to unban members" });
            }
        }
    });
}
