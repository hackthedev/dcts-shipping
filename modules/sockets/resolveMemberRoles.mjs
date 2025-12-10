import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {copyObject, getRoleCastingObject, sendMessageToUser, validateMemberId} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("resolveMemberRoles", function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if(!member?.target) return response({error: "Member not found"})

            let memberRoles = [];
            for(let roleId of Object.keys(serverconfig.serverroles)){
                let role = serverconfig.serverroles[roleId];
                if(role.members.includes(member.target) && !memberRoles.includes(member?.target)) memberRoles.push(roleId);
            }

            response(memberRoles);
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
