import { serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import { getMessageLogsById, getSavedChatMessage } from "../functions/io.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import { getChatMessageById } from "../functions/mysql/helper.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getMessageLogs', async function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            let messageLogs = await getMessageLogsById(member.msgId);


            if (hasPermission(member.id, "manageMessages")) {
                response({ type: "success", logs: messageLogs, error: null });
            }
            else {
                response({ type: "error", data: null, error: "Missing permissions: manageMessages" });
            }
        }
    });
}
