import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission, resolveCategoryByChannelId, resolveGroupByChannelId } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("updateChannelName", function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageChannels")) {
                var group = resolveGroupByChannelId(member.channel);
                var category = resolveCategoryByChannelId(member.channelId);

                serverconfig.groups[group].channels.categories[category].channel[member.channel].name = member.name;
                saveConfig(serverconfig);

                response({ type: "success", msg: "Successfully updated channel name" });

                // Let everyone know about the update
                io.emit("receiveChannelTree");
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
