import { serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { disconnectUser, hasPermission, muteUser } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('disconnectUser', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (member.id == member.target) {
                response({ error: "Cant disconnect yourself", msg: "You cant disconnect yourself!", type: "error" })
                return;
            }
            else {
                member.reason = xssFilters.inHTMLData(member.reason);

                if (hasPermission(member.id, "disconnectUsers") == false) {
                    response({ error: "Missing permission disconnectUsers", msg: "You cant disconnect others!", type: "error" })
                    return;
                }
                else {
                    
                    var mod = getMemberHighestRole(member.id);
                    var userToDisconnect = getMemberHighestRole(member.target);

                    if (mod.info.sortId <= userToDisconnect.info.sortId) {
                        response({ error: "Cant disconnect user with higher or equal role", msg: "Cant disconnect user with higher or equal role", type: "error" })
                        return;
                    }

                    var disconnectResult = disconnectUser(usersocket[member.target], member.reason);
                    if (disconnectResult?.error) {
                        response({ error: "Error disconnecting user", msg: "Unable to disconnect user", type: "error" })
                        console.log(disconnectResult.error)
                        return;
                    }

                    // Notify Admins
                    response({ error: null, msg: "User has been disconnected", type: "success" })
                }
            }
        }
    });
}
