import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    copyObject,
    getCastingMemberObject,
    getRoleCastingObject,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('resolveRole', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            try {
                var resolved = copyObject(serverconfig.serverroles[member.target]);
                response({ type: "success", msg: "Role was resolved", data: getRoleCastingObject(resolved) });
            }
            catch (e) {
                Logger.error("Unable to resolve member");
                console.log(e);
            }
        }
    });
}
