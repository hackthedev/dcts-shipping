import {saveConfig, serverconfig, xssFilters} from "../../index.mjs";
import {hasPermission, resolveChannelById} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {copyObject, escapeHtml, sendMessageToUser, validateMemberId} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("getGroupInfo", function (member, response) {
        if (validateMemberId(member.id, socket) == true &&
            serverconfig.servermembers[member.id].token == member.token
        ) {
            if (hasPermission(member.id, "manageGroups")) {

                var groupObj = serverconfig.groups[member.group];
                response({ type: "success", msg: "Successfully resolved group", data: groupObj });
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage groups" })
            }
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });

    socket.on("updateGroup", async function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token)) {
            if (hasPermission(member.id, "manageChannels")) {
                if(!member?.data) return response({ type: "error", msg: "No data provided" });
                if(!member?.groupId) return response({ type: "error", msg: "No groupId provided" })

                var groupObj = serverconfig?.groups[member.groupId];
                if(!groupObj) return response({ type: "error", msg: "Group not found" });

                if(member?.data?.info?.name) serverconfig.groups[member.groupId].info.name = String(member.data.info.name) || null
                if(member?.data?.info?.icon) serverconfig.groups[member.groupId].info.icon = String(member.data.info.icon) || null
                if(member?.data?.info?.banner) serverconfig.groups[member.groupId].info.banner = String(member.data.info.banner) || null
                if(member?.data?.info?.description) serverconfig.groups[member.groupId].info.description = String(member.data.info.description) || null
                if(member?.data?.info?.sortId) serverconfig.groups[member.groupId].info.sortId = member.data.info.sortId

                if(member?.data?.permissions) serverconfig.groups[member.groupId].permissions = member.data.permissions
                if(member?.data?.channels) serverconfig.groups[member.groupId].permissions = member.data.channels
                await saveConfig(serverconfig);

                io.emit("updateGroupList");
                io.emit("receiveChannelTree");

                response({ error: null });
            }
            else {
                response({ type: "error", error: "You dont have the permissions to manage channels" })
            }
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
