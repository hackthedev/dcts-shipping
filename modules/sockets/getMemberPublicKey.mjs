import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {copyObject, emitBasedOnMemberId, sendMessageToUser, validateMemberId} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('getMemberPublicKey', function (member, response) {
        if(validateMemberId(member?.id, socket, member?.token) === true){

            if(!member?.target){
                response({ error: "No target member specified"})
                return;
            }

            if(serverconfig.servermembers[member?.target] === null){
                response({ error: "Target member not found"})
                return;
            }

            response( { error: null, publicKey: serverconfig.servermembers[member.target].publicKey } )
        }
    });
}
