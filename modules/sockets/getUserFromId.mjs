import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, getCastingMemberObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('getUserFromId', async function (member, response) {
        if (await validateMemberId(member.id, socket) === true
        ) {
            response({ type: "success", user: await getCastingMemberObject(serverconfig.servermembers[member.target]) });
        }
    });
}
