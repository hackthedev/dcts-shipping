import {saveConfig, serverconfig, xssFilters} from "../../index.mjs";
import {
    hasPermission,
    resolveCategoryByChannelId,
    resolveChannelById,
    resolveGroupByChannelId
} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
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

    socket.on("updateChannel", async function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token)) {
            if (hasPermission(member.id, "manageChannels")) {
                if(!member?.data) return response({ type: "error", msg: "No data provided" });
                if(!member?.channelId) return response({ type: "error", msg: "No channelId provided" })


                var channelObj = resolveChannelById(member.channelId);
                if(!channelObj) return response({ type: "error", msg: "Channel not found" });

                if(member?.data?.name) channelObj.name = String(member.data.name);
                if(member?.data?.description) channelObj.description = String(member.data.description);
                if(member?.data?.permissions) channelObj.permissions = member.data.permissions;
                if(member?.data?.sortId) channelObj.sortId = Number(member.data.sortId);
                await saveConfig(serverconfig);

                io.emit("receiveChannelTree");

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

