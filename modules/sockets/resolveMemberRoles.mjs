import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    anonymizeMember,
    copyObject,
    getRoleCastingObject,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";

export function resolveMemberRoles(memberId){
    let roles = [];
    for(let roleId of Object.keys(serverconfig.serverroles)){
        let role = serverconfig.serverroles[roleId];
        if(role.members.includes(memberId) && !roles.includes(memberId)) roles.push(roleId);
    }

    return roles;
}

export default (io) => (socket) => {
    // socket.on code here
    socket.on("resolveMemberRoles", function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if(!member?.target) return response({error: "Member not found"})
            let resolved = resolveMemberRoles(member?.target);

            if(serverconfig.servermembers[member?.target]?.isBanned){
                if(hasPermission(member.id, ["viewAnonymousMessages"])){
                    resolved = [0];
                }
            }

            response(resolved);
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
