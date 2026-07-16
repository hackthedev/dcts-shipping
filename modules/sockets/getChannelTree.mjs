import { serverconfig, xssFilters } from "../../index.mjs";
import { getChannelTree, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getChannelTree', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if(!member?.group) return response({ error: "Missing group id"})

            if (!await hasPermission(member.id, ["viewGroup", "manageChannels"], member?.group)) {
                return response({ type: "error", error: "Your access to this group was denied" });
            }

            response({ type: "success", data: await getChannelTree(member) });
        }
    });
}
