import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import {decodeFromBase64, getChatMessageById} from "../functions/mysql/helper.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('resolveMessage', async function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === true){
            let messageRaw = await getChatMessageById(member?.messageId);
            let messageObj = messageRaw[0];
            messageObj.message = JSON.parse(decodeFromBase64(messageObj.message));

            if (!hasPermission(member.id, "viewChannel", messageObj?.channel)) {
                response({ error: "You dont have permission to resolve the message", message: null})
                return;
            }

            response({ error: null, message: messageObj})
        }
    });
}
