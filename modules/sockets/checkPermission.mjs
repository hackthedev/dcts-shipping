import { io, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, getCastingMemberObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('checkPermission', function (member, response) {
        if (validateMemberId(member.id, socket) == true) {

            var userObj = getCastingMemberObject(serverconfig.servermembers[member.id]);

            if (Array.isArray(member.permission)) {

                for (var i = 0; i < member.permission.length; i++) {

                    if (hasPermission(member.id, member.permission[i])) {
                        response({ permission: "granted", user: userObj });
                        return;
                    }
                }

                response({ permission: "denied", user: userObj });
            }
            else { // Single permission check

                if (hasPermission(member.id, member.permission)) {
                    response({ permission: "granted", user: userObj });
                } else {
                    response({ permission: "denied", user: userObj });
                }
            }
        }
    });
}
