import { io, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('getGroupBanner', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (!hasPermission(member.id, "viewGroup", member.group)) {
                return;
            }

            io.to(usersocket[member.id]).emit("receiveGroupBanner", serverconfig.groups[member.group].info.banner);
        }
    });
}
