import { saveConfig, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import { banUser, getNewDate, hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {copyObject, escapeHtml, findSocketByMemberId, sendMessageToUser, validateMemberId} from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('banUser', function (member, response) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            if (member.id == member.target) {
                response({ type: "error", msg: "You cant ban yourself!", error: "You cant ban yourself." });
                return;
            }
            else {
                if (hasPermission(member.id, "banMember") == false) {

                    response({ type: "error", msg: "You dont have permissions to ban members", error: "Missing permission banMember" });
                    return;
                }
                else {

                    var banner = getMemberHighestRole(member.id);
                    var banning = getMemberHighestRole(member.target);

                    if (banner.info.sortId <= banning.info.sortId) {
                        response({
                            type: "error",
                            msg: "User cant be banned because their role is higher or qual then yours",
                            error: "Cant ban user whos role is higher or qual yours"
                        });
                        return;
                    }

                    let targetSocket = findSocketByMemberId(io, member.target);
                    banUser(targetSocket, member);

                    // Notify Admins
                    response({
                        type: "success",
                        msg: "User has been banned",
                        error: null
                    });

                    io.sockets.sockets.forEach((target) => {

                        
                        // Check if the target's socket ID matches the user's socket ID
                        if (target.id === usersocket[member.target]) {
                            // Escape and process the reason text
                            const reason = member.reason ? escapeHtml(member.reason.trim()) : "";
                            const reasonText = reason ? `Reason: ${reason}` : "";

                            const bannedUntilDate = getNewDate(member.duration);
                            const banDuration = bannedUntilDate.getFullYear() === 9999 ? `permanently banned` : `banned until ${bannedUntilDate.toISOString()}`;

                            const payload = {
                                title: `You have been ${banDuration}`,
                                message: reasonText,
                                buttons: {
                                    0: {
                                        text: "Ok",
                                        events: ""
                                    }
                                },
                                type: "error",
                                popup_type: "confirm"
                            };

                            sendMessageToUser(target.id, payload);

                            // Disconnect user
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
