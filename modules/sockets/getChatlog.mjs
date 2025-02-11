import { io, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import { getSavedChatMessage } from "../functions/io.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here

    socket.on('getChatlog', async function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (hasPermission(member.id, ["viewChannel", "viewChannelHistory"], member.channelId)) {
                io.to(usersocket[member.id]).emit("receiveChatlog", await getSavedChatMessage(member.groupId, member.categoryId, member.channelId, member.index));
            }
        }
    });
}
