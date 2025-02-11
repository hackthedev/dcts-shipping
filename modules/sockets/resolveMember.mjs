import { io, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, getCastingMemberObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('resolveMember', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if (hasPermission(member.id, "resolveMembers")) {
                try {
                    var resolved = copyObject(serverconfig.servermembers[member.target]);

                    response({ type: "success", msg: "User Data was resolved", data: getCastingMemberObject(resolved) });
                }
                catch (e) {
                    Logger.error("Unable to resolve member");
                    console.log(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
