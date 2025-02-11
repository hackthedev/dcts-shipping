import { io, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('getCurrentChannel', function (member) {
        if (validateMemberId(member.id, socket) == true) {

            try {
                if (hasPermission(member.id, "viewChannel", member.channel) == true) {
                    io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group].channels.categories[member.category].channel[member.channel]);
                }
            }
            catch {
                io.to(usersocket[member.id]).emit("receiveCurrentChannel", serverconfig.groups[member.group]);
            }
        }
    });
}
