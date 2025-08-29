import { serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { hasPermission, muteUser } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('muteUser', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (member.id == member.target) {
                response({ error: "Cant mute yourself", msg: "You cant mute yourself!", type: "error" })
                return;
            }
            else {
                member.time = xssFilters.inHTMLData(member.time);
                member.reason = xssFilters.inHTMLData(member.reason);

                if (hasPermission(member.id, "muteUsers") == false) {
                    response({ error: "Missing permission muteUsers", msg: "You cant mute others!", type: "error" })
                    return;
                }
                else {
                    
                    var mod = getMemberHighestRole(member.id);
                    var userToMute = getMemberHighestRole(member.target);

                    if (mod.info.sortId <= userToMute.info.sortId) {
                        response({ error: "Cant mute user with higher or equal role", msg: "Cant mute user with higher or equal role", type: "error" })
                        return;
                    }

                    var muteResult = muteUser(member);
                    if (muteResult?.error) {
                        response({ error: "Error muting user", msg: "Unable to mute user", type: "error" })
                        console.log(muteResult.error)
                        return;
                    }

                    // Notify Admins
                    response({ error: null, msg: "User has been muted", type: "success" })
                    io.emit("updateMemberList");

                    var reasonText = ""
                    if (member.reason.length > 0)
                        reasonText = `##Reason:#${member.reason}`;


                    if (new Date(muteResult.duration).getFullYear() == "9999") {
                        // You have been muted
                        sendMessageToUser(usersocket[member.target], JSON.parse(
                            `{
                                "title": "You have been muted",
                                "message": "${reasonText}",
                                "buttons": {
                                    "0": {
                                        "text": "Ok",
                                        "events": ""
                                    }
                                },
                                "type": "success",
                                "popup_type": "confirm"
                            }`));
                    }
                    else {
                        // You have been muted
                        sendMessageToUser(usersocket[member.target], JSON.parse(
                            `{
                                "title": "You have been muted until ${new Date(muteResult.duration).toLocaleString()}",
                                "message": "${reasonText}",
                                "buttons": {
                                    "0": {
                                        "text": "Ok",
                                        "events": ""
                                    }
                                },
                                "type": "success",
                                "popup_type": "confirm"
                            }`));
                    }
                }
            }
        }
    });
}
