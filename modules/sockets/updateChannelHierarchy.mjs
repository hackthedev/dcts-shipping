import { saveConfig, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('updateChannelHierarchy', function (member, response) {
        checkRateLimit(socket);

        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            if (hasPermission(member.id, "manageChannels") ||
                hasPermission(member.id, "manageGroups")) {
                try {
                    serverconfig.groups = member.sorted;

                    saveConfig(serverconfig);

                    response({ type: "success", msg: "Changes were successfully applied" });

                    // Update Channel Hierarchy for everyone
                    io.to(usersocket[member.id]).emit("receiveChannelTree", getChannelTree(member));
                    io.emit("receiveChannelTree", getChannelTree(member));

                    // Update Group Hierarchy for everyone
                    io.emit("updateGroupList");
                }
                catch (e) {
                    Logger.error("Unable to sort roles");
                    Logger.error(e)
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
