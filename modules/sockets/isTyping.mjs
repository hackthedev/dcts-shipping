import { serverconfig, typingMembers, typingMembersTimeout, xssFilters } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import Logger from "../functions/logger.mjs";
import { copyObject, escapeHtml, sendMessageToUser, validateMemberId } from "../functions/main.mjs";

export default (io) => (socket) => {
    // socket.on code here
    socket.on('isTyping', function (member) {
        // todo : check for perms to view channel
        if (validateMemberId(member.id, socket, member?.token, true) === true) {

            //consolas("Typing room: " + member.room);
            //consolas("Typing member id: " + member.id);

            if(!hasPermission(member.id, "viewChannel", member.room.split("-")[2])) return;
            if(!hasPermission(member.id, "sendMessages", member.room.split("-")[2])) return;

            // if user is muted dont do anything
            if (serverconfig.mutelist.hasOwnProperty(member.id)) {
                return;
            }

            var username = serverconfig.servermembers[member.id].name;
            if (typingMembers.includes(username) == false) {
                typingMembers.push(escapeHtml(username));
            }

            clearTimeout(typingMembersTimeout[username]);
            typingMembersTimeout[username] = setTimeout(() => {

                if (typingMembers.includes(username) == true) {
                    const index = typingMembers.indexOf(escapeHtml(username));
                    if (index !== -1) {
                        typingMembers.splice(index, 1); // Remove the element at the found index
                    }

                }

                io.in(member.room).emit("memberTyping", typingMembers);

            }, 4 * 1000);


            io.in(member.room).emit("memberTyping", typingMembers);
        }
    });
}
