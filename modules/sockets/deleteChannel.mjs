import { saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { getChannelTree, hasPermission, resolveCategoryByChannelId, resolveGroupByChannelId } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('deleteChannel', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {

            if (!await hasPermission(member.id, "manageChannels")) {
                response({ msg: "You arent allowed to deleteChannels", type: "error", error: "Missing Permissions: manageChannels" })
                return;
            }

            try {
                var channelId = member.channelId.replace("channel-", "");
                var group = resolveGroupByChannelId(channelId);
                var category = resolveCategoryByChannelId(channelId);
                
                if (channelId == serverconfig.serverinfo.defaultChannel) {
                    response({ msg: "You cant delete the default channel", type: "error", error: "Cant delete default channel" })
                    return;
                }

                delete serverconfig.groups[group].channels.categories[category].channel[channelId];
                saveConfig(serverconfig);

                response({ msg: "Channel deleted", type: "success", error: null })
                io.emit("receiveChannelTree", getChannelTree(member));
            }
            catch (e) {
                Logger.error("Couldnt delete channel");
                Logger.error(e);
            }
        }
    });
}
