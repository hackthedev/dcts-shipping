import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('MyEvent', async function (member, response) {
        // some code
        if(await validateMemberIdmember?.id, socket, member?.token) === false){
            response({ error: null })
            return;
        }
    });
}
