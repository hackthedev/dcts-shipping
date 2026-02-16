import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('exportAccount', function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token)
        ) {
            try{
                // some funky code here
                response({account: serverconfig?.servermembers[member?.id]})
            }
            catch (exception){
                Logger.error(exception);
            }
        }

    });
}
