import { hasPermission } from "../functions/chat/main.mjs";
import { getMessageLogsById } from "../functions/io.mjs";
import {  validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getMessageLogs', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {
            let messageLogs = await getMessageLogsById(member.msgId);

            if (await hasPermission(member.id, "manageMessages")) {
                response({ type: "success", logs: messageLogs, error: null });
            }
            else {
                response({ type: "error", data: null, error: "Missing permissions: manageMessages" });
            }
        }
    });
}
