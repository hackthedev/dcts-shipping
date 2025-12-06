import { serverconfig, usersocket, xssFilters } from "../../index.mjs";
import {hasPermission, resolveChannelById} from "../functions/chat/main.mjs";
import { getSavedChatMessage } from "../functions/io.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getChatlog', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            let channel = resolveChannelById(member?.channelId);
            if (hasPermission(member.id, ["viewChannel", "viewChannelHistory"], member.channelId)) {
                response({data:  await getSavedChatMessage(member.groupId, member.categoryId, member.channelId, member.index), type: channel?.type});
            }
            else{
                response?.({type: "error", error: "denied"})
            }
        }
    });
}
