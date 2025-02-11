import { io, saveConfig, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('addUserToRole', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token
        ) {

            member.id = xssFilters.inHTMLData(member.id)
            member.token = xssFilters.inHTMLData(member.token)
            member.target = xssFilters.inHTMLData(member.target)

            if (hasPermission(member.id, "manageMembers")) {
                try {

                    var executer = getMemberHighestRole(member.id);
                    var targetRole = serverconfig.serverroles[member.role];

                    if (executer.info.sortId <= targetRole.info.sortId) {

                        // only administrators can bypass this
                        if (!hasPermission(member.id, "administrator")) {
                            sendMessageToUser(socket.id, JSON.parse(
                                `{
                                        "title": "Error!",
                                        "message": "You cant assign this role because the role is higher or equal yours",
                                        "buttons": {
                                            "0": {
                                                "text": "Ok",
                                                "events": ""
                                            }
                                        },
                                        "type": "success",
                                        "popup_type": "confirm"
                                    }`));
                            return;
                        }
                    }

                    serverconfig.serverroles[member.role].members.push(member.target);
                    saveConfig(serverconfig);
                    
                    io.emit("updateMemberList");
                    io.to(usersocket[member.target]).emit("updateMemberList");
                    response({ type: "success", msg: "Role assigned" });

                }
                catch (e) {
                    Logger.error("Unable to add member to group");
                    Logger.error(e);
                }
            }
            else {
                response({ type: "error", msg: "denied" });
            }
        }
    });
}
