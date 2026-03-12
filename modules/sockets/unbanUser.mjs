import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import {removeBan} from "../functions/ban-system/helpers.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('unbanUser', async function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.duration = xssFilters.inHTMLData(member.duration)

            if (await hasPermission(member.id, "manageBans")) {
                try {
                    await removeBan(member?.target);
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
