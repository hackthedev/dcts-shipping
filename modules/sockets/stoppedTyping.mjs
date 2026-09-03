import { typingMembers } from "../../index.mjs";
import { escapeHtml, validateMemberId } from "../functions/main.mjs";
import {serverconfig} from "../functions/init/config.mjs";

export default (io) => (socket) => {
    // socket.on code here

    socket.on('stoppedTyping', async function (member) {
        if (await validateMemberId(member.id, socket) === true
            && serverconfig.servermembers[member.id].token === member.token) {

            var username = serverconfig.servermembers[member.id].name;

            if (typingMembers.includes(username) === true) {
                const index = typingMembers.indexOf(escapeHtml(username));
                if (index !== -1) {
                    typingMembers.splice(index, 1); // Remove the element at the found index
                }

            }

            io.in(member.room).emit("memberTyping", typingMembers);
        }
    });
}
