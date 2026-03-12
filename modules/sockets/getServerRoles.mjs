import { serverconfig, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {copyObject, getRoleCastingObject, sendMessageToUser, validateMemberId} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on("getServerRoles", async function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true
        ) {
            if (await hasPermission(member.id, "manageRoles")) {
                response(serverconfig.serverroles);
            }
            else { // users wont get full role object access
                let userRoles = copyObject(serverconfig.serverroles);
                for(let roleId of Object.keys(userRoles)){
                    userRoles[roleId] = getRoleCastingObject(userRoles[roleId])
                }

                response(userRoles);
            }
        }
        else {
            Logger.warn("ID or Token was invalid while requesting server information");
            Logger.warn(`ID: ${member.id}`);
            Logger.warn(`Token: ${member.token}`);
        }
    });
}
