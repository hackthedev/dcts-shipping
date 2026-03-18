import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission, resolveCategoryByChannelId, resolveGroupByChannelId } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('saveChannelPermissions', async function (member, response) {
        /* DEPRECATED */
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)

            if (await hasPermission(member.id, "manageChannels")) {
                try {
                    var memberChannel = member.channel.replace("channel-", "");
                    var group = resolveGroupByChannelId(memberChannel);
                    var category = resolveCategoryByChannelId(memberChannel);

                    serverconfig.groups[group].channels.categories[category].channel[memberChannel].permissions[member.role] = member.permission;
                    saveConfig(serverconfig);

                    io.emit("updateChatlog");
                    io.emit("receiveChannelTree");
                    response({ type: "success", msg: "Channel permissions have been updated" });
                }
                catch (e) {
                    Logger.error("Unable to update channel permissions from role");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
