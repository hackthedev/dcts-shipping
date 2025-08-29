import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, getCastingMemberObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getUserFromId', function (member, response) {
        if (validateMemberId(member.id, socket) == true
        ) {
            response({ type: "success", user: getCastingMemberObject(serverconfig.servermembers[member.target]) });
        }
    });
}
