import { serverconfig } from "../../index.mjs";
import { hasPermission } from "../functions/chat/main.mjs";
import {escapeHtml, validateMemberId} from "../functions/main.mjs";

const typingMembers = {};
const typingTimeouts = {};

export default (io) => (socket) => {

    socket.on('isTyping', async function (member) {
        if(!validateMemberId(member?.id, socket, member?.token)) return;

        if (!hasPermission(member.id, "viewChannel", member.room.split("-")[2])) return;
        if (!hasPermission(member.id, "sendMessages", member.room.split("-")[2])) return;

        const room = member.room;
        const id = member.id;

        if (!typingMembers[room]) typingMembers[room] = new Set();
        if (!typingTimeouts[room]) typingTimeouts[room] = {};

        typingMembers[room].add(id);

        clearTimeout(typingTimeouts[room][id]);
        typingTimeouts[room][id] = setTimeout(() => {
            typingMembers[room].delete(id);
            io.in(room).emit("memberTyping", convertTypingMembers(room));
        }, 4000);

        io.in(room).emit("memberTyping", convertTypingMembers(room));
    });
};

function convertTypingMembers(room) {
    if (!typingMembers[room]) return [];

    return [...typingMembers[room]].map(id =>
        escapeHtml(serverconfig.servermembers[id].name)
    );
}
