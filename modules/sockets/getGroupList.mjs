import { io, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getGroupList, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('getGroupList', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {
            io.to(usersocket[member.id]).emit("receiveGroupList", getGroupList(member)); 
        }
    });
}
