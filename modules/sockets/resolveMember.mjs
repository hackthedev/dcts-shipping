import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    anonymizeMember,
    anonymizeMessage, autoAnonymizeMember, autoAnonymizeMessage,
    copyObject,
    getCastingMemberObject,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";
import {getMemberHighestRole} from "../functions/chat/helper.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('resolveMember', function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if(!member?.id) return response({error: "No member ID provided"});
            if(!member?.token) return response({error: "No token provided"});
            if(!member?.target) return response({error: "No target member id provided"});

            try {
                var resolved = getCastingMemberObject(serverconfig.servermembers[member?.target]);

                if(!resolved){
                    return response({error: "Target member not found"});
                }

                resolved = autoAnonymizeMember(member.id, resolved);

                response({ type: "success", msg: "User Data was resolved", data: resolved });
            }
            catch (e) {
                Logger.error("Unable to resolve member");
                console.log(e);
            }
        }
    });
}
