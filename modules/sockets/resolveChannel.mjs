import { serverconfig, xssFilters } from "../../index.mjs";
import {hasPermission, resolveCategoryByChannelId, resolveGroupByChannelId} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    copyObject,
    getCastingMemberObject, getChannelCastingObject,
    getRoleCastingObject,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('resolveChannel', function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true) {
            try {
                if(!member?.channelId){
                    return response({ type: "error", msg: "Channel ID is missing" });
                }

                let groupId = resolveGroupByChannelId(member.channelId);
                let categoryId = resolveCategoryByChannelId(member.channelId);

                let channelObject = getChannelCastingObject(serverconfig?.groups[groupId]?.channels?.categories[categoryId].channel[member?.channelId]);
                if(!channelObject){
                    return response({ type: "error", msg: "Channel not found" });
                }
                response({ type: "success", msg: "Channel was resolved", channel: channelObject, groupId, categoryId });
            }
            catch (e) {
                Logger.error("Unable to resolve member");
                console.log(e);
            }
        }
    });
}
