import { serverconfig, typingMembers, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, sendMessageToUser, validateMemberId } from "../functions/main.mjs";
import { emitToBotsWithViewChannel } from "./botEvents.mjs";

export default (io) => (socket) => {
    socket.on('stoppedTyping', async function (member) {
        if (validateMemberId(member.id, socket) == true
            && serverconfig.servermembers[member.id].token == member.token) {

            var username = serverconfig.servermembers[member.id].name;

            if (typingMembers.includes(username) == true) {
                const index = typingMembers.indexOf(escapeHtml(username));
                if (index !== -1) {
                    typingMembers.splice(index, 1); // Remove the element at the found index
                }

            }

            io.in(member.room).emit("memberTyping", typingMembers);
            const [group, category, channel] = (member.room || "").split("-");
            if (group && category && channel) await emitToBotsWithViewChannel(io, group, category, channel, "memberTyping", typingMembers);
        }
    });
}
