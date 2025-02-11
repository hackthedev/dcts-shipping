import { io, serverconfig, typingMembers, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (socket) => {
    // socket.on code here

    socket.on('stoppedTyping', function (member) {
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
        }
    });
}
