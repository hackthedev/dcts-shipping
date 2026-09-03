
import {
    hasPermission,
    resolveChannelById,
} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { validateMemberId } from "../functions/main.mjs";
import {saveConfig, serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("getChannelInfo", async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if (await hasPermission(member.id, "manageChannels")) {
                var channelObj = resolveChannelById(member.channel);
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
        if (await validateMemberId(member?.id, socket, member?.token)) {
            if (await hasPermission(member.id, "manageChannels")) {
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

