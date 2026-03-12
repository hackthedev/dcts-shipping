import { saveConfig, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import {stripHTML} from "../functions/sanitizing/functions.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('addUserToRole', async function (member, response) {
        if (validateMemberId(member?.id, socket, member?.token) === true) {

            if(!member?.target) return response ({error: "Missing target user id"})
            if(!member?.role) return response ({error: "Missing target role id"})

            member.id = stripHTML(member.id)
            member.token = stripHTML(member.token)
            member.target = stripHTML(member.target)

            if (await hasPermission(member.id, "manageMembers")) {
                try {

                    var executer = getMemberHighestRole(member.id);
                    var targetRole = serverconfig.serverroles[member.role];

                    if (executer.info.sortId <= targetRole.info.sortId) {
                        // only administrators can bypass this
                        if (!await hasPermission(member.id, "administrator")) {
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
