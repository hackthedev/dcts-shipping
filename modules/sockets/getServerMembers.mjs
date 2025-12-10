import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    copyObject,
    getCastingMemberObject,
    getRoleCastingObject,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";
import {loadMembersFromDB} from "../functions/mysql/helper.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("getServerMembers", function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if (hasPermission(member.id, "manageMembers")) {
                response(serverconfig.servermembers);
            }
            else {
                let members = copyObject(serverconfig.servermembers);
                for(let memberId of Object.keys(members)){
                    members[memberId] = getCastingMemberObject(members[memberId])
                }

                response(members);
            }
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
