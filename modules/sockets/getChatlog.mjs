import { serverconfig, usersocket, xssFilters } from "../../index.mjs";
import {hasPermission, resolveChannelById} from "../functions/chat/main.mjs";
import {getMessageLogsById, getSavedChatMessage} from "../functions/io.mjs";
import Logger from "../functions/logger.mjs";
import {
    anonymizeMessage,
    autoAnonymizeMessage,
    copyObject,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";

import {Clock} from "../functions/clock.mjs";
import {decodeFromBase64} from "../functions/mysql/helper.mjs";
import {getMessageObjectById} from "./resolveMessage.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getChatlog', async function (member, response) {
        Clock.start("chatlog_total")
        if (validateMemberId(member?.id, socket,  member?.token) === true) {

            if(!member?.id) return response({type: "error", error: "No member id provided"});
            if(!member?.token) return response({type: "error", error: "No member token provided"});

            let channel = resolveChannelById(member?.channelId);
            if (hasPermission(member.id, ["viewChannel", "viewChannelHistory"], member.channelId)) {

                // filter messages
                let messages = await getSavedChatMessage(member.groupId, member.categoryId, member.channelId, member.index);
                messages = await Promise.all(
                    messages.map(async m => {
                        let msg = autoAnonymizeMessage(member.id, structuredClone(m));
                        if(msg?.reply?.messageId) msg.reply = autoAnonymizeMessage(member.id, structuredClone(msg.reply));

                        if (msg?.author?.icon?.startsWith("data:image")) msg.author.icon = "";
                        if (msg?.author?.banner?.startsWith("data:image")) msg.author.banner = "";
                        return msg;
                    })
                );

                response({data: messages, type: channel?.type});
            }
            else{
                response?.({type: "error", error: "denied"})
            }
        }
        Clock.stop("chatlog_total")
    });
}
