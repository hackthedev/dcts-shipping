import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('MyEvent', function (member, response) {
        // some code
        if(validateMemberId(member?.id, socket, member?.token) === true){
            response({ error: null })
        }
    });
}
