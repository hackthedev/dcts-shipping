import { saveConfig, serverconfig, usersocket, xssFilters } from "../../index.mjs";
import { getMemberHighestRole } from "../functions/chat/helper.mjs";
import {getMemberFromKey, getNewDate, hasPermission} from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import {
    copyObject,
    escapeHtml,
    findSocketByMemberId,
    generateId,
    sendMessageToUser,
    validateMemberId
} from "../functions/main.mjs";
import {addBan, banUser} from "../functions/ban-system/helpers.mjs";
import DateTools from "@hackthedev/datetools";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('banPublicKey', async function (member, response) {
        if (await validateMemberId(member?.id, socket, member?.token) === true) {

            if (member.publicKey === member.targetKey) {
                return response({ type: "error", msg: "You cant ban yourself!", error: "You cant ban yourself." });
            }
            else {
                if (await hasPermission(member.id, "banMember") === false) {
                    return response({ type: "error", msg: "You dont have permissions to ban members", error: "Missing permission banMember" });
                }
                else {

                    let targetMember = await getMemberFromKey(member.targetKey);
                    if(targetMember){
                        var banner = getMemberHighestRole(member.id);
                        var banning = getMemberHighestRole(targetMember.id);

                        if (banner.info.sortId <= banning.info.sortId) {
                            return response({
                                type: "error",
                                msg: "User cant be banned because their role is higher or equal then yours",
                                error: "Cant ban user whos role is higher or qual yours"
                            });
                        }
                    }

                    let targetSocket = findSocketByMemberId(io, member.target);
                    await addBan({
                        identifier: generateId(12),
                        publicKey: member?.targetKey,
                        reason: member?.reason,
                        until: DateTools.getDateFromOffset(member?.duration).getTime(),
                        bannedBy: member.id
                    });

                    // Notify Admins
                    response({
                        type: "success",
                        msg: "User has been banned",
                        error: null
                    });

                    // disconnect user
                    if(targetSocket && targetMember){
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

                        sendMessageToUser(targetMember.id, payload);

                        // Disconnect user
                        targetSocket.disconnect(true);
                    }

                    // Update Memberlist
                    io.emit("updateMemberList");
                }
            }
        }
    });
}
