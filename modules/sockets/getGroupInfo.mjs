import { io, serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
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
}
