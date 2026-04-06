import {io, serverconfig, signer, usersocket, xssFilters} from "../../../index.mjs";
import Logger from "@hackthedev/terminal-logger"
import { queryDatabase } from "../../functions/mysql/mysql.mjs";
import {createMemberDmRoom, saveRoomDmMessage} from "./dms/rooms.mjs";


export async function sendSystemMessage(targetUserId, text) {
    if (!targetUserId || !text) throw new Error("targetUserId and text required");

    let { roomId } = await createMemberDmRoom("system", [targetUserId]);

    let payload = {
        data: {
            message: {},
            roomId,
            author: { id: "system" },
            reply: { id: null },
            timestamp: new Date().getTime()
        }
    }

    payload.data.message[targetUserId] = text;

    await saveRoomDmMessage(payload);

    payload.meta.author = { id: "system", name: "System", icon: "/img/default_pfp.png" };
    payload.meta.reply = { id: null };

    io.in(roomId).emit("newDmMessage", { payload });
    return payload;
}

async function emitToThread(threadId, event, payload) {
    const rows = await queryDatabase(
        `SELECT memberId FROM dms_participants WHERE threadId = ?`,
        [threadId]
    );
    for (const r of rows) {
        try {
            const memberId = String(r.memberId);
            const sockId = usersocket[memberId];

            io.to(memberId).emit(event, payload);
        } catch (err) {
            Logger.error("emitToThread: emit failed for member", r.memberId, err);
            // continue to next participant
        }
    }
}

export default (io) => (socket) => {

};