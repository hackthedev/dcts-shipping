import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, getCastingMemberObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('checkChannelPermission', function (member, response) {
        if (validateMemberId(member.id, socket) == true) {

            member.id = xssFilters.inHTMLData(member.id);
            member.token = xssFilters.inHTMLData(member.token);
            member.permission = xssFilters.inHTMLData(member.permission);
            member.channel = xssFilters.inHTMLData(member.channel);

            var userObj = getCastingMemberObject(serverconfig.servermembers[member.id]);

            if (Array.isArray(member.permission)) {

                for (var i = 0; i < member.permission.length; i++) {
                    if (hasPermission(member.id, member.permission[i], member.channel)) {
                        response({ type: "success", permission: "granted", user: userObj });
                        return;
                    }
                }

                response({ type: "success", permission: "denied", user: userObj });
            }
            else { // Single permission check

                if (hasPermission(member.id, member.permission, member.channel)) {
                    response({ type: "success", permission: "granted", user: userObj });
                } else {
                    response({ type: "success", permission: "denied", user: userObj });
                }
            }
        }
    });
}
