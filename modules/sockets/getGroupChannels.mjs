import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("getGroupChannels", async function (member, response) {
        if (await validateMemberIdmember?.id, socket, member?.token) === true
        ) {
            if (await hasPermission(member.id, "manageChannels") ||
                await hasPermission(member.id, "manageGroups")) {

                response(serverconfig.groups);
            }
            else {
                response({ type: "error", msg: "You dont have the permissions to manage group channels" })
            }
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
