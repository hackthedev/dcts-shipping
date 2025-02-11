import { io, saveConfig, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here
    socket.on('kickUser', function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (member.id == member.target) {
                sendMessageToUser(socket.id, JSON.parse(
                    `{
                            "title": "You cant kick yourself!",
                            "message": "",
                            "buttons": {
                                "0": {
                                    "text": "Ok",
                                    "events": ""
                                }
                            },
                            "type": "error",
                            "popup_type": "confirm"
                        }`));
                return;
            }
            else {
                if (hasPermission(member.id, "kickUsers") == false) {

                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                            "title": "Missing permission!",
                            "message": "You cant kick that person.",
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
                    var kicker = getMemberHighestRole(member.id);
                    var kicking = getMemberHighestRole(member.target);

                    if (kicker.info.sortId <= kicking.info.sortId) {
                        sendMessageToUser(socket.id, JSON.parse(
                            `{
                                        "title": "Error!",
                                        "message": "You cant kick that person because its role is higher then yours",
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
                    member.target = escapeHtml(member.target);
                    
                    delete serverconfig.servermembers[member.target];
                    saveConfig(serverconfig);

                    // Notify Admins
                    sendMessageToUser(socket.id, JSON.parse(
                        `{
                            "title": "Kicked User!",
                            "message": "The user has been kicked.",
                            "buttons": {
                                "0": {
                                    "text": "Nice",
                                    "events": ""
                                }
                            },
                            "type": "success",
                            "popup_type": "confirm"
                        }`));

                    io.sockets.sockets.forEach((target) => {

                        if (target.id === usersocket[member.target]) {

                            var reasonText = " ";
                            member.reason = escapeHtml(member.reason);
                            if (member.reason != null && member.reason.length > 0) {
                                reasonText = `Reason: ${member.reason}`
                            }

                            sendMessageToUser(target.id, JSON.parse(
                                `{
                                        "title": "You have been kicked",
                                        "message": "${reasonText}",
                                        "buttons": {
                                            "0": {
                                                "text": "Ok",
                                                "events": "closeModal()"
                                            }
                                        },
                                        "type": "success",
                                        "popup_type": "confirm"
                                    }`));

                            target.disconnect(true);
                        }
                    });

                    // Update Memberlist
                    io.emit("updateMemberList");
                }
            }
        }
    });
}
