import { io, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission, resolveChannelById } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on("getChannelInfo", function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageChannels")) {
                var channelObj = resolveChannelById(member.channel.replace("channel-", ""));
                response({ type: "success", msg: "Successfully resolved channel", data: channelObj });
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage channels" })
            }
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
