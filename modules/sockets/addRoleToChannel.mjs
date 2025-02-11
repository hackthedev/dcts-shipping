import { io, saveConfig, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission, resolveCategoryByChannelId, resolveGroupByChannelId } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('addRoleToChannel', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageChannels")) {
                try {

                    var memberChannel = member.channel.replace("channel-", "");

                    var group = resolveGroupByChannelId(memberChannel);
                    var category = resolveCategoryByChannelId(memberChannel);

                    serverconfig.groups[group].channels.categories[category].channel[memberChannel].permissions[member.role] = JSON.parse
                        (
                            `
                            {
                                "readMessages": 1,
                                "sendMessages": 1
                            }
                            `
                        );
                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Role was successfully removed from the channel" });
                }
                catch (e) {
                    Logger.error("Unable to add role to channel");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
